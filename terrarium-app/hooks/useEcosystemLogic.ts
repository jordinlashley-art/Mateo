import { useReducer, useEffect, useCallback } from "react";

// ─── Environment range helper ─────────────────────────────────────────────────

export type EnvRange = { min: number; max: number };

// ─── Plant types ──────────────────────────────────────────────────────────────

export type PlantRequirements = {
  lighting: EnvRange;
  humidity: EnvRange;
  temperature: EnvRange;
};

export type Plant = {
  id: string;
  name: string;
  emoji: string;
  x: number;
  y: number;
  delay: number;
  /** 0–100 vitality score */
  health: number;
  /** Base growth multiplier applied when conditions are ideal */
  growthRate: number;
  /** Oxygen units produced during the last tick */
  oxygenOutput: number;
  requirements: PlantRequirements;
};

// ─── Organism types ───────────────────────────────────────────────────────────

export type OrganismRequirements = {
  /** Minimum number of healthy plants (health > 30) needed to stay nourished */
  minPlants: number;
  temperature: EnvRange;
};

export type Organism = {
  id: string;
  name: string;
  emoji: string;
  x: number;
  y: number;
  delay: number;
  /** 0–100 vitality score */
  health: number;
  /** Waste/debris units produced during the last tick */
  wasteOutput: number;
  requirements: OrganismRequirements;
};

// ─── Ecosystem event log ──────────────────────────────────────────────────────

export type EventSeverity = "info" | "warning" | "critical";

export type EcosystemEvent = {
  id: string;
  message: string;
  severity: EventSeverity;
  tick: number;
};

// ─── Top-level state ──────────────────────────────────────────────────────────

export type EcosystemState = {
  plants: Plant[];
  organisms: Organism[];
  lighting: number;
  humidity: number;
  temperature: number;
  /** Accumulated oxygen – rises when plants thrive, falls when organisms consume */
  oxygenLevel: number;
  /** Accumulated debris – rises from organism waste, falls with healthy plants */
  debrisLevel: number;
  /** Overall 0–100 ecosystem vitality score */
  ecosystemHealth: number;
  tick: number;
  events: EcosystemEvent[];
};

// ─── Species defaults ─────────────────────────────────────────────────────────

const PLANT_SPECIES: Record<
  string,
  { requirements: PlantRequirements; growthRate: number }
> = {
  Moss: {
    requirements: {
      lighting: { min: 10, max: 80 },
      humidity: { min: 50, max: 100 },
      temperature: { min: 5, max: 28 },
    },
    growthRate: 1.0,
  },
  Fern: {
    requirements: {
      lighting: { min: 40, max: 90 },
      humidity: { min: 70, max: 100 },
      temperature: { min: 15, max: 28 },
    },
    growthRate: 1.5,
  },
};

const ORGANISM_SPECIES: Record<string, { requirements: OrganismRequirements }> =
  {
    Isopod: {
      requirements: { minPlants: 1, temperature: { min: 10, max: 30 } },
    },
    Springtail: {
      requirements: { minPlants: 2, temperature: { min: 15, max: 28 } },
    },
  };

const FALLBACK_PLANT_REQS: PlantRequirements = {
  lighting: { min: 20, max: 90 },
  humidity: { min: 40, max: 90 },
  temperature: { min: 10, max: 30 },
};

const FALLBACK_ORG_REQS: OrganismRequirements = {
  minPlants: 1,
  temperature: { min: 10, max: 32 },
};

// ─── Constants ────────────────────────────────────────────────────────────────

const TICK_INTERVAL_MS = 2000;
const MAX_EVENTS = 10;

// ─── Initial state ────────────────────────────────────────────────────────────

const INITIAL_STATE: EcosystemState = {
  plants: [],
  organisms: [],
  lighting: 60,
  humidity: 75,
  temperature: 22,
  oxygenLevel: 50,
  debrisLevel: 0,
  ecosystemHealth: 100,
  tick: 0,
  events: [],
};

// ─── Reducer actions ──────────────────────────────────────────────────────────

type Action =
  | { type: "ADD_PLANT"; plant: Plant }
  | { type: "ADD_ORGANISM"; organism: Organism }
  | { type: "REMOVE_ENTITY"; id: string }
  | {
      type: "UPDATE_ENV";
      key: "lighting" | "humidity" | "temperature";
      value: number;
    }
  | { type: "TICK" };

// ─── Pure tick helpers ────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function inRange(v: number, r: EnvRange) {
  return v >= r.min && v <= r.max;
}

/** How badly out-of-range a value is, expressed as 0–1. */
function stressFraction(v: number, r: EnvRange, envMax: number) {
  if (v < r.min) return (r.min - v) / Math.max(r.min, 1);
  return (v - r.max) / Math.max(envMax - r.max, 1);
}

// ─── Core tick logic (pure) ───────────────────────────────────────────────────

function runTick(state: EcosystemState): EcosystemState {
  const { lighting, humidity, temperature, tick } = state;
  const newEvents: EcosystemEvent[] = [];
  let evCounter = tick * 100;

  const emit = (message: string, severity: EventSeverity) => {
    newEvents.push({ id: `ev-${evCounter++}`, message, severity, tick: tick + 1 });
  };

  // ── Plants: consume Light + Water → produce Oxygen + Growth ───────────────
  const updatedPlants = state.plants.map((plant): Plant => {
    const req = plant.requirements;
    let delta = 0;

    if (!inRange(lighting, req.lighting)) {
      delta -= 2 + stressFraction(lighting, req.lighting, 100) * 4;
    } else {
      delta += 1;
    }

    // Ferns die faster in low humidity
    if (!inRange(humidity, req.humidity)) {
      const isLow = humidity < req.humidity.min;
      const stress = stressFraction(humidity, req.humidity, 100);
      const penalty = plant.name === "Fern" && isLow ? 3 + stress * 7 : 2 + stress * 4;
      delta -= penalty;
    } else {
      delta += 0.5;
    }

    if (!inRange(temperature, req.temperature)) {
      delta -= 1.5 + stressFraction(temperature, req.temperature, 40) * 3;
    } else {
      delta += 0.5;
    }

    const newHealth = clamp(plant.health + delta, 0, 100);
    const oxygenOutput = (newHealth / 100) * plant.growthRate * 2;

    if (plant.health > 30 && newHealth <= 30) {
      emit(`${plant.name} is struggling — check its conditions.`, "warning");
    }
    if (plant.health > 0 && newHealth <= 0) {
      emit(`${plant.name} has died.`, "critical");
    }
    if (plant.health < 50 && newHealth >= 50 && delta > 0) {
      emit(`${plant.name} is recovering nicely.`, "info");
    }

    return { ...plant, health: newHealth, oxygenOutput };
  });

  // ── High-humidity mold events ──────────────────────────────────────────────
  if (humidity > 85 && Math.random() < 0.3) {
    emit("High humidity is encouraging mold and fungus growth!", "warning");
  }
  if (humidity < 30 && updatedPlants.some((p) => p.name === "Fern")) {
    emit("Critically low humidity — ferns are at severe risk!", "critical");
  }

  // ── Organisms: consume Plants/Debris → produce Waste ─────────────────────
  const healthyPlants = updatedPlants.filter((p) => p.health > 30).length;

  const updatedOrganisms = state.organisms.map((org): Organism => {
    const req = org.requirements;
    let delta = 0;

    if (healthyPlants >= req.minPlants) {
      delta += 2;
    } else {
      delta -= (req.minPlants - healthyPlants) * 3;
    }

    if (!inRange(temperature, req.temperature)) {
      delta -= 2 + stressFraction(temperature, req.temperature, 40) * 4;
    }

    const newHealth = clamp(org.health + delta, 0, 100);
    const wasteOutput = newHealth > 20 ? (newHealth / 100) * 1.5 : 0;

    if (org.health > 30 && newHealth <= 30) {
      emit(`${org.name} is starving — add more plants!`, "warning");
    }
    if (org.health > 0 && newHealth <= 0) {
      emit(`${org.name} has perished.`, "critical");
    }
    if (org.health < 50 && newHealth >= 50 && delta > 0) {
      emit(`${org.name} is thriving.`, "info");
    }

    return { ...org, health: newHealth, wasteOutput };
  });

  // ── Resource accounting ────────────────────────────────────────────────────
  const totalO2 = updatedPlants.reduce((s, p) => s + p.oxygenOutput, 0);
  const totalWaste = updatedOrganisms.reduce((s, o) => s + o.wasteOutput, 0);

  const newOxygen = clamp(state.oxygenLevel + totalO2 - totalWaste * 0.5, 0, 200);
  const newDebris = clamp(state.debrisLevel + totalWaste - totalO2 * 0.3, 0, 100);

  // ── Ecosystem Health score ─────────────────────────────────────────────────
  const all = [...updatedPlants, ...updatedOrganisms];
  const avgHealth =
    all.length > 0 ? all.reduce((s, e) => s + e.health, 0) / all.length : 100;

  const envPenalty =
    (humidity > 85 ? 5 : 0) +
    (humidity < 25 ? 8 : 0) +
    (temperature < 10 ? 5 : 0) +
    (temperature > 32 ? 5 : 0) +
    (lighting < 10 ? 3 : 0);

  const biodiversityBonus =
    updatedPlants.length > 0 && updatedOrganisms.length > 0 ? 8 : 0;

  const ecosystemHealth = clamp(avgHealth - envPenalty + biodiversityBonus, 0, 100);

  if (state.ecosystemHealth > 50 && ecosystemHealth <= 50) {
    emit("Ecosystem health is declining — take action!", "warning");
  }
  if (state.ecosystemHealth > 20 && ecosystemHealth <= 20) {
    emit("Ecosystem is in critical condition!", "critical");
  }
  if (state.ecosystemHealth < 60 && ecosystemHealth >= 60) {
    emit("Ecosystem health is improving.", "info");
  }

  // Prepend new events, keep last MAX_EVENTS
  const mergedEvents = [...newEvents, ...state.events].slice(0, MAX_EVENTS);

  return {
    ...state,
    plants: updatedPlants,
    organisms: updatedOrganisms,
    oxygenLevel: newOxygen,
    debrisLevel: newDebris,
    ecosystemHealth,
    tick: tick + 1,
    events: mergedEvents,
  };
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

function reducer(state: EcosystemState, action: Action): EcosystemState {
  switch (action.type) {
    case "ADD_PLANT":
      return { ...state, plants: [...state.plants, action.plant] };
    case "ADD_ORGANISM":
      return { ...state, organisms: [...state.organisms, action.organism] };
    case "REMOVE_ENTITY":
      return {
        ...state,
        plants: state.plants.filter((p) => p.id !== action.id),
        organisms: state.organisms.filter((o) => o.id !== action.id),
      };
    case "UPDATE_ENV":
      return { ...state, [action.key]: action.value };
    case "TICK":
      return runTick(state);
    default:
      return state;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

let entityCounter = 0;

/**
 * useEcosystemLogic
 *
 * Manages the full terrarium simulation:
 *  - Plants consume Light + Water → produce Oxygen + Growth
 *  - Organisms consume Plants/Debris → produce Waste
 *  - High humidity encourages mold; low humidity harms ferns
 *  - A global Ecosystem Health score tracks overall vitality
 */
export function useEcosystemLogic() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  // Auto-tick simulation every TICK_INTERVAL_MS
  useEffect(() => {
    const id = setInterval(() => dispatch({ type: "TICK" }), TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  /** Add a plant by species name; uses species-specific requirements */
  const addPlant = useCallback((name: string, emoji: string) => {
    const spec = PLANT_SPECIES[name] ?? {
      requirements: FALLBACK_PLANT_REQS,
      growthRate: 1.0,
    };
    entityCounter += 1;
    const plant: Plant = {
      id: `plant-${entityCounter}`,
      name,
      emoji,
      x: 10 + Math.random() * 80,
      y: 50 + Math.random() * 35,
      delay: Math.random() * 3,
      health: 80,
      growthRate: spec.growthRate,
      oxygenOutput: 0,
      requirements: spec.requirements,
    };
    dispatch({ type: "ADD_PLANT", plant });
  }, []);

  /** Add an organism by species name; uses species-specific requirements */
  const addOrganism = useCallback((name: string, emoji: string) => {
    const spec = ORGANISM_SPECIES[name] ?? { requirements: FALLBACK_ORG_REQS };
    entityCounter += 1;
    const organism: Organism = {
      id: `org-${entityCounter}`,
      name,
      emoji,
      x: 10 + Math.random() * 80,
      y: 60 + Math.random() * 30,
      delay: Math.random() * 3,
      health: 80,
      wasteOutput: 0,
      requirements: spec.requirements,
    };
    dispatch({ type: "ADD_ORGANISM", organism });
  }, []);

  /** Remove any entity (plant or organism) by id */
  const removeEntity = useCallback((id: string) => {
    dispatch({ type: "REMOVE_ENTITY", id });
  }, []);

  /** Update a single environmental variable */
  const updateEnvironment = useCallback(
    (key: "lighting" | "humidity" | "temperature", value: number) => {
      dispatch({ type: "UPDATE_ENV", key, value });
    },
    []
  );

  return { state, addPlant, addOrganism, removeEntity, updateEnvironment };
}
