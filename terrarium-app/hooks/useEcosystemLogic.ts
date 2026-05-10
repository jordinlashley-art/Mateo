"use client";

import { useReducer, useEffect, useCallback, useRef, useState } from "react";
import {
  EcosystemState,
  Plant,
  Organism,
  PlantSpecies,
  OrganismSpecies,
  HealthRange,
  LogEntry,
  LogLevel,
} from "@/types/ecosystem";

// ─────────────────────────────────────────────────────────────────────────────
// Species templates — constants from the requirements table
// ─────────────────────────────────────────────────────────────────────────────

type PlantTemplate = Omit<Plant, "id" | "x" | "y" | "animDelay">;
type OrganismTemplate = Omit<Organism, "id" | "x" | "y" | "animDelay">;

const PLANT_TEMPLATES: Record<PlantSpecies, PlantTemplate> = {
  Moss: {
    species: "Moss",
    emoji: "🌿",
    health: 85,
    growthRate: 55,
    biomass: 40,
    // Lighting: 20–50%, Humidity: 70–90% (from requirements table)
    requirements: {
      lighting:    { min: 20, max: 50, optimal: 35 },
      humidity:    { min: 70, max: 90, optimal: 80 },
      temperature: { min: 10, max: 28, optimal: 20 },
    },
  },
  Fern: {
    species: "Fern",
    emoji: "🌱",
    health: 75,
    growthRate: 65,  // high growth
    biomass: 32,
    // Lighting: 40–70%, Humidity: 60–80% (from requirements table)
    requirements: {
      lighting:    { min: 40, max: 70, optimal: 55 },
      humidity:    { min: 60, max: 80, optimal: 70 },
      temperature: { min: 15, max: 30, optimal: 22 },
    },
  },
};

const ORGANISM_TEMPLATES: Record<OrganismSpecies, OrganismTemplate> = {
  Isopod: {
    species: "Isopod",
    emoji: "🦗",
    health: 80,
    consumptionRate: 12,
    wasteOutput: 6,
    // Any lighting; humidity 60–100%
    requirements: {
      temperature:    { min: 14, max: 30, optimal: 21 },
      minBiomass:     8,
      optimalBiomass: 22,
    },
  },
  Springtail: {
    species: "Springtail",
    emoji: "🪲",
    health: 75,
    consumptionRate: 6,
    wasteOutput: 3,
    // Low lighting; humidity 80–100%
    requirements: {
      temperature:    { min: 10, max: 27, optimal: 19 },
      minBiomass:     4,
      optimalBiomass: 14,
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Pure helper utilities
// ─────────────────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * Triangular range score: +1 at optimal, 0 at boundaries, down to -2 outside.
 */
export function rangeScore(value: number, range: HealthRange): number {
  const { min, max, optimal } = range;

  if (value < min) {
    return clamp(-2 * (min - value) / Math.max(min, 1), -2, 0);
  }
  if (value > max) {
    return clamp(-(value - max) / Math.max(100 - max, 1), -2, 0);
  }
  if (value <= optimal) {
    return (value - min) / Math.max(optimal - min, 1);
  }
  return (max - value) / Math.max(max - optimal, 1);
}

// ─────────────────────────────────────────────────────────────────────────────
// Log helpers
// ─────────────────────────────────────────────────────────────────────────────

let _logId = 0;
function makeEntry(tick: number, message: string, level: LogLevel): LogEntry {
  return { id: `log-${++_logId}`, tick, message, level };
}

// ─────────────────────────────────────────────────────────────────────────────
// localStorage persistence helpers
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "terrarium-os-state";

function saveState(state: EcosystemState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage may be unavailable (SSR, private browsing quota)
  }
}

function loadState(): EcosystemState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<EcosystemState>;
    // Validate essential fields are present before restoring
    if (
      Array.isArray(parsed.plants) &&
      Array.isArray(parsed.organisms) &&
      parsed.environment &&
      typeof parsed.tickCount === "number"
    ) {
      return {
        ...INITIAL_STATE,
        ...parsed,
        log: Array.isArray(parsed.log) ? parsed.log : INITIAL_STATE.log,
      } as EcosystemState;
    }
  } catch {
    // Corrupt storage — fall through to default
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Initial state
// ─────────────────────────────────────────────────────────────────────────────

const INITIAL_STATE: EcosystemState = {
  plants: [],
  organisms: [],
  environment: {
    lighting: 60,
    humidity: 75,
    temperature: 22,
    oxygen: 50,
    waste: 0,
    moldRisk: 0,
  },
  ecosystemHealth: 75,
  tickCount: 0,
  log: [makeEntry(0, "Terrarium initialized — add plants and organisms to begin.", "info")],
};

// ─────────────────────────────────────────────────────────────────────────────
// Core tick function (pure — no side effects)
// ─────────────────────────────────────────────────────────────────────────────

const LOG_CAPACITY = 50;

export function runTick(state: EcosystemState): EcosystemState {
  const { environment, tickCount } = state;
  const { lighting, humidity, temperature } = environment;
  let { moldRisk, waste, oxygen } = environment;
  const tick = tickCount + 1;
  const events: LogEntry[] = [];

  // ── 1. Update plants ────────────────────────────────────────────────────────
  const updatedPlants: Plant[] = state.plants.map((plant) => {
    const ls = rangeScore(lighting,    plant.requirements.lighting);
    const hs = rangeScore(humidity,    plant.requirements.humidity);
    const ts = rangeScore(temperature, plant.requirements.temperature);

    // Weighted condition score (~-2 to +1)
    const conditionScore = ls * 0.30 + hs * 0.45 + ts * 0.25;

    // Mold damages plants when risk is high
    const moldDamage = moldRisk > 65 ? (moldRisk - 65) / 35 * 1.5 : 0;

    const healthDelta = clamp(conditionScore * 5 - moldDamage, -5, 2);
    const newHealth   = clamp(plant.health + healthDelta, 0, 100);

    const newGrowthRate = clamp(
      plant.growthRate + (healthDelta > 0 ? 1 : -2),
      0, 100
    );

    const biomassCap   = newHealth * 0.8;
    const biomassRegen = newHealth > 10 ? (newGrowthRate / 100) * 4 : 0;
    const newBiomass   = clamp(plant.biomass + biomassRegen, 0, biomassCap);

    // ── Threshold events ──
    if (newHealth <= 0 && plant.health > 0) {
      // Specific withering messages per species
      const witherMsg =
        plant.species === "Moss"
          ? "A Moss patch has withered and dried out."
          : "A Fern frond has withered away.";
      events.push(makeEntry(tick, witherMsg, "danger"));
    } else if (newHealth < 25 && plant.health >= 25) {
      events.push(makeEntry(tick, `${plant.species} is critically stressed!`, "danger"));
    } else if (newHealth < 50 && plant.health >= 50) {
      events.push(makeEntry(tick, `${plant.species} is wilting — check conditions.`, "warning"));
    } else if (newHealth >= 75 && plant.health < 75) {
      events.push(makeEntry(tick, `${plant.species} is thriving! 🌱`, "info"));
    }

    // Spreading / growth events for very healthy plants
    if (newHealth > 85 && Math.random() < 0.04) {
      const spreadMsg =
        plant.species === "Moss"
          ? "Moss is slowly spreading across the substrate."
          : "Fern is unfurling new fronds!";
      events.push(makeEntry(tick, spreadMsg, "info"));
    }

    // Humidity warnings for moisture-loving species
    if (humidity < plant.requirements.humidity.min + 5 && tick % 6 === 0) {
      events.push(makeEntry(tick, `${plant.species} needs more humidity!`, "warning"));
    }

    return { ...plant, health: newHealth, growthRate: newGrowthRate, biomass: newBiomass };
  });

  // ── 2. Biomass pool — organisms consume proportionally ──────────────────────
  const totalBiomass = updatedPlants.reduce((s, p) => s + p.biomass, 0);
  const totalDemand  = state.organisms.reduce((s, o) => s + o.consumptionRate, 0);
  const foodRatio    = totalDemand > 0 ? clamp(totalBiomass / totalDemand, 0, 2) : 1;

  const consumed         = Math.min(totalBiomass, totalDemand);
  const consumedFraction = totalBiomass > 0 ? consumed / totalBiomass : 0;
  const plantsAfterEating: Plant[] = updatedPlants.map((p) => ({
    ...p,
    biomass: clamp(p.biomass * (1 - consumedFraction * 0.6), 0, 100),
  }));

  // ── 3. Update organisms ─────────────────────────────────────────────────────
  const updatedOrganisms: Organism[] = state.organisms.map((org, idx) => {
    let effectiveFoodRatio = foodRatio;

    // Springtails eat mold (prevents mold growth per requirements)
    if (org.species === "Springtail" && moldRisk > 20) {
      const moldFood = (moldRisk - 20) / 80;
      effectiveFoodRatio = clamp(effectiveFoodRatio + moldFood * 0.6, 0, 2);
      moldRisk = clamp(moldRisk - 8, 0, 100);
    }

    // Isopods eat decaying plant matter and waste (boosts soil per requirements)
    if (org.species === "Isopod" && waste > 10) {
      const wasteFood = (waste - 10) / 90;
      effectiveFoodRatio = clamp(effectiveFoodRatio + wasteFood * 0.4, 0, 2);
      waste = clamp(waste - 7, 0, 100);
    }

    const tempScore = rangeScore(temperature, org.requirements.temperature);

    const foodHealthDelta =
      effectiveFoodRatio >= 1.0 ? 1.5 :
      effectiveFoodRatio >= 0.5 ? (effectiveFoodRatio - 0.5) * 3 - 1.5 :
      -3 + effectiveFoodRatio * 3;

    const tempHealthDelta = clamp(tempScore * 2.5, -3, 1);

    const healthDelta = clamp(foodHealthDelta + tempHealthDelta, -5, 2);
    const newHealth   = clamp(org.health + healthDelta, 0, 100);

    if (newHealth > 10) {
      waste = clamp(waste + org.wasteOutput * (newHealth / 100), 0, 100);
    }

    // ── Threshold events ──
    if (newHealth <= 0 && org.health > 0) {
      events.push(makeEntry(tick, `An ${org.species} has perished.`, "danger"));
    } else if (newHealth < 25 && org.health >= 25) {
      events.push(makeEntry(tick, `${org.species} colony is in danger!`, "danger"));
    } else if (effectiveFoodRatio < 0.5 && tick % 4 === 0 && newHealth < 80 && newHealth > 0) {
      events.push(makeEntry(tick, `${org.species} is starving — add more plants!`, "warning"));
    } else if (newHealth >= 80 && org.health < 80) {
      events.push(makeEntry(tick, `${org.species} colony is thriving!`, "info"));
    }

    // Reproduction events — staggered by organism index
    if (newHealth > 80 && (tick + idx * 7) % 28 === 0) {
      const reproMsg =
        org.species === "Isopod"
          ? "An Isopod has reproduced! 🦗"
          : "A Springtail has reproduced! 🪲";
      events.push(makeEntry(tick, reproMsg, "info"));
    }

    return { ...org, health: newHealth };
  });

  // ── 4. Update environment ───────────────────────────────────────────────────

  // Mold risk rises with high humidity; Springtails help control it
  if (humidity > 75) {
    moldRisk = clamp(moldRisk + (humidity - 75) / 25 * 3, 0, 100);
  } else {
    moldRisk = clamp(moldRisk - 2, 0, 100);
  }

  if (moldRisk > 70 && environment.moldRisk <= 70) {
    events.push(makeEntry(tick, "Mold spreading fast! Lower humidity or add Springtails.", "danger"));
  } else if (moldRisk > 40 && environment.moldRisk <= 40) {
    events.push(makeEntry(tick, "Mold risk rising — monitor humidity.", "warning"));
  } else if (moldRisk < 20 && environment.moldRisk >= 20) {
    events.push(makeEntry(tick, "Mold risk under control. ✅", "info"));
  }

  // Waste decays; isopods accelerate decomposition
  waste = clamp(waste - 3, 0, 100);
  if (waste > 70 && environment.waste <= 70) {
    events.push(makeEntry(tick, "High waste accumulation! Add Isopods to help.", "warning"));
  }

  // Oxygen generated by healthy plants (Moss increases O₂ slowly per requirements)
  const oxygenGeneration = plantsAfterEating.reduce((s, p) => {
    if (p.health <= 20) return s;
    const rate = p.species === "Moss" ? 0.03 : 0.05; // Moss slow, Fern faster
    return s + p.health * rate;
  }, 0);
  oxygen = clamp(oxygen * 0.95 + oxygenGeneration, 0, 100);

  const healthyPlantCount = plantsAfterEating.filter((p) => p.health > 20).length;
  if (oxygen < 25 && environment.oxygen >= 25 && healthyPlantCount === 0) {
    events.push(makeEntry(tick, "Oxygen levels dropping — terrarium needs plants!", "danger"));
  }

  // ── 5. Global Ecosystem Health score ───────────────────────────────────────
  const avgPlantHealth =
    plantsAfterEating.length > 0
      ? plantsAfterEating.reduce((s, p) => s + p.health, 0) / plantsAfterEating.length
      : 50;

  const avgOrgHealth =
    updatedOrganisms.length > 0
      ? updatedOrganisms.reduce((s, o) => s + o.health, 0) / updatedOrganisms.length
      : 50;

  const envScore = clamp(50 + oxygen * 0.1 - waste * 0.2 - moldRisk * 0.15, 0, 100);

  const newEcosystemHealth = clamp(
    avgPlantHealth * 0.40 + avgOrgHealth * 0.35 + envScore * 0.25,
    0, 100
  );

  if (newEcosystemHealth < 30 && state.ecosystemHealth >= 30) {
    events.push(makeEntry(tick, "⚠️ Ecosystem in critical condition!", "danger"));
  } else if (newEcosystemHealth >= 70 && state.ecosystemHealth < 70) {
    events.push(makeEntry(tick, "✨ Ecosystem is flourishing!", "info"));
  }

  // ── 6. Assemble next state ──────────────────────────────────────────────────
  return {
    plants:      plantsAfterEating,
    organisms:   updatedOrganisms,
    environment: { lighting, humidity, temperature, oxygen, waste, moldRisk },
    ecosystemHealth: newEcosystemHealth,
    tickCount:   tick,
    log:         [...events, ...state.log].slice(0, LOG_CAPACITY),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Reducer actions
// ─────────────────────────────────────────────────────────────────────────────

type Action =
  | { type: "TICK" }
  | { type: "ADD_PLANT";      species: PlantSpecies;    x: number; y: number }
  | { type: "ADD_ORGANISM";   species: OrganismSpecies; x: number; y: number }
  | { type: "REMOVE_PLANT";     id: string }
  | { type: "REMOVE_ORGANISM";  id: string }
  | { type: "SET_LIGHTING";    value: number }
  | { type: "SET_HUMIDITY";    value: number }
  | { type: "SET_TEMPERATURE"; value: number }
  | { type: "RESTORE_STATE";   state: EcosystemState };

let _entityCounter = 0;

function ecosystemReducer(state: EcosystemState, action: Action): EcosystemState {
  switch (action.type) {
    case "TICK": {
      const next = runTick(state);
      saveState(next);
      return next;
    }

    case "ADD_PLANT": {
      const template = PLANT_TEMPLATES[action.species];
      const plant: Plant = {
        ...template,
        id: `plant-${++_entityCounter}`,
        x: action.x,
        y: action.y,
        animDelay: Math.random() * 3,
      };
      const next: EcosystemState = {
        ...state,
        plants: [...state.plants, plant],
        log: [
          makeEntry(state.tickCount, `Added ${action.species} to the terrarium.`, "info"),
          ...state.log,
        ].slice(0, LOG_CAPACITY),
      };
      saveState(next);
      return next;
    }

    case "ADD_ORGANISM": {
      const template = ORGANISM_TEMPLATES[action.species];
      const organism: Organism = {
        ...template,
        id: `org-${++_entityCounter}`,
        x: action.x,
        y: action.y,
        animDelay: Math.random() * 3,
      };
      const next: EcosystemState = {
        ...state,
        organisms: [...state.organisms, organism],
        log: [
          makeEntry(state.tickCount, `Added ${action.species} to the terrarium.`, "info"),
          ...state.log,
        ].slice(0, LOG_CAPACITY),
      };
      saveState(next);
      return next;
    }

    case "REMOVE_PLANT":
      return { ...state, plants: state.plants.filter((p) => p.id !== action.id) };

    case "REMOVE_ORGANISM":
      return { ...state, organisms: state.organisms.filter((o) => o.id !== action.id) };

    case "SET_LIGHTING":
      return { ...state, environment: { ...state.environment, lighting: action.value } };

    case "SET_HUMIDITY":
      return { ...state, environment: { ...state.environment, humidity: action.value } };

    case "SET_TEMPERATURE":
      return { ...state, environment: { ...state.environment, temperature: action.value } };

    case "RESTORE_STATE":
      return action.state;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Time scale type
// ─────────────────────────────────────────────────────────────────────────────

export type TimeScale = 1 | 5 | 10;

// Base tick interval in ms (at 1×)
const BASE_TICK_MS = 2000;

// ─────────────────────────────────────────────────────────────────────────────
// Public hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * useEcosystemLogic
 *
 * Drives a terrarium simulation using requestAnimationFrame (delta-time).
 * The Time Scale (1×, 5×, 10×) controls how quickly simulation time passes
 * relative to real time, keeping the loop smooth at any frame rate.
 *
 * State is automatically persisted to and restored from localStorage.
 */
export function useEcosystemLogic() {
  // Lazy initialiser — restores persisted state if available (client-side only)
  const [state, dispatch] = useReducer(
    ecosystemReducer,
    undefined,
    (): EcosystemState => {
      if (typeof window === "undefined") return INITIAL_STATE;
      return loadState() ?? INITIAL_STATE;
    }
  );

  const [timeScale, setTimeScaleState] = useState<TimeScale>(1);

  // Refs so the rAF loop captures current values without re-subscribing
  const timeScaleRef    = useRef<TimeScale>(timeScale);
  const lastTimeRef     = useRef<number | null>(null);
  const accumulatedRef  = useRef<number>(0);
  const animFrameRef    = useRef<number | null>(null);
  const dispatchRef     = useRef(dispatch);

  // Keep refs in sync
  useEffect(() => { timeScaleRef.current = timeScale; }, [timeScale]);
  useEffect(() => { dispatchRef.current  = dispatch;  }, [dispatch]);

  // requestAnimationFrame game loop
  useEffect(() => {
    function loop(now: number) {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = now;
      }

      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;

      // Accumulate real-time * timeScale; fire a tick each BASE_TICK_MS
      accumulatedRef.current += delta * timeScaleRef.current;

      if (accumulatedRef.current >= BASE_TICK_MS) {
        accumulatedRef.current -= BASE_TICK_MS;
        dispatchRef.current({ type: "TICK" });
      }

      animFrameRef.current = requestAnimationFrame(loop);
    }

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, []); // mounts once; timeScale changes are picked up via ref

  const setTimeScale = useCallback((scale: TimeScale) => {
    setTimeScaleState(scale);
    timeScaleRef.current   = scale;
    accumulatedRef.current = 0; // reset accumulator to avoid burst ticks after scale change
  }, []);

  const addPlant = useCallback((species: PlantSpecies) => {
    dispatch({
      type: "ADD_PLANT",
      species,
      x: 8  + Math.random() * 82,
      y: 50 + Math.random() * 35,
    });
  }, []);

  const addOrganism = useCallback((species: OrganismSpecies) => {
    dispatch({
      type: "ADD_ORGANISM",
      species,
      x: 8  + Math.random() * 82,
      y: 62 + Math.random() * 28,
    });
  }, []);

  const removePlant    = useCallback((id: string) => dispatch({ type: "REMOVE_PLANT",    id }), []);
  const removeOrganism = useCallback((id: string) => dispatch({ type: "REMOVE_ORGANISM", id }), []);

  const setLighting    = useCallback((value: number) => dispatch({ type: "SET_LIGHTING",    value }), []);
  const setHumidity    = useCallback((value: number) => dispatch({ type: "SET_HUMIDITY",    value }), []);
  const setTemperature = useCallback((value: number) => dispatch({ type: "SET_TEMPERATURE", value }), []);

  return {
    state,
    timeScale,
    setTimeScale,
    addPlant,
    addOrganism,
    removePlant,
    removeOrganism,
    setLighting,
    setHumidity,
    setTemperature,
  };
}
