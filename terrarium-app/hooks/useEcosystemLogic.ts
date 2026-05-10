"use client";

import { useReducer, useEffect, useCallback } from "react";
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
// Species templates
// ─────────────────────────────────────────────────────────────────────────────

type PlantTemplate = Omit<Plant, "id" | "x" | "y" | "animDelay">;
type OrganismTemplate = Omit<Organism, "id" | "x" | "y" | "animDelay">;

const PLANT_TEMPLATES: Record<PlantSpecies, PlantTemplate> = {
  Moss: {
    species: "Moss",
    emoji: "🌿",
    health: 85,
    growthRate: 60,
    biomass: 40,
    // Thrives in low-to-medium light, high humidity; very hardy
    requirements: {
      lighting:    { min: 5,  max: 65, optimal: 25 },
      humidity:    { min: 50, max: 100, optimal: 82 },
      temperature: { min: 10, max: 28, optimal: 20 },
    },
  },
  Fern: {
    species: "Fern",
    emoji: "🌱",
    health: 75,
    growthRate: 45,
    biomass: 28,
    // Needs decent light + humidity; more sensitive than moss
    requirements: {
      lighting:    { min: 30, max: 85, optimal: 55 },
      humidity:    { min: 62, max: 100, optimal: 76 },
      temperature: { min: 15, max: 30, optimal: 22 },
    },
  },
};

const ORGANISM_TEMPLATES: Record<OrganismSpecies, OrganismTemplate> = {
  Isopod: {
    species: "Isopod",
    emoji: "🦗",
    health: 80,
    consumptionRate: 12,  // eats plant biomass AND waste
    wasteOutput: 6,
    requirements: {
      temperature:    { min: 14, max: 30, optimal: 21 },
      minBiomass:     10,
      optimalBiomass: 25,
    },
  },
  Springtail: {
    species: "Springtail",
    emoji: "🪲",
    health: 75,
    consumptionRate: 7,   // eats plant biomass AND mold
    wasteOutput: 3,
    requirements: {
      temperature:    { min: 10, max: 27, optimal: 19 },
      minBiomass:     5,
      optimalBiomass: 15,
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Pure helper utilities
// ─────────────────────────────────────────────────────────────────────────────

/** Clamp a value to [min, max] */
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * Triangular range score.
 *
 * Returns a value in roughly [-2, +1]:
 *   +1 at optimal, 0 at min/max boundaries,
 *   down to -2 well below min, -1 well above max.
 *
 * Used to calculate how well an environmental variable suits a species.
 */
export function rangeScore(value: number, range: HealthRange): number {
  const { min, max, optimal } = range;

  if (value < min) {
    // Linear decline from 0 at min to -2 at 0 (or extrapolated below)
    return clamp(-2 * (min - value) / Math.max(min, 1), -2, 0);
  }
  if (value > max) {
    // Linear decline from 0 at max to -1 at 100
    return clamp(-(value - max) / Math.max(100 - max, 1), -2, 0);
  }
  if (value <= optimal) {
    return (value - min) / Math.max(optimal - min, 1); // 0 → 1
  }
  return (max - value) / Math.max(max - optimal, 1);   // 1 → 0
}

// ─────────────────────────────────────────────────────────────────────────────
// Log helpers
// ─────────────────────────────────────────────────────────────────────────────

let _logId = 0;
function makeEntry(tick: number, message: string, level: LogLevel): LogEntry {
  return { id: `log-${++_logId}`, tick, message, level };
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
// Core tick function  (pure — no side effects)
// ─────────────────────────────────────────────────────────────────────────────

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

    // Weighted condition score: roughly -2 to +1
    const conditionScore = ls * 0.30 + hs * 0.45 + ts * 0.25;

    // Mold damages plants above a risk threshold
    const moldDamage = moldRisk > 65 ? (moldRisk - 65) / 35 * 1.5 : 0;

    // Health delta: clamped to [-5, +2] per tick
    const healthDelta = clamp(conditionScore * 5 - moldDamage, -5, 2);
    const newHealth = clamp(plant.health + healthDelta, 0, 100);

    // Growth rate lags health recovery/decline
    const newGrowthRate = clamp(
      plant.growthRate + (healthDelta > 0 ? 1 : -2),
      0, 100
    );

    // Biomass regenerates toward (health × 0.8); halted when nearly dead
    const biomassCap = newHealth * 0.8;
    const biomassRegen = newHealth > 10 ? (newGrowthRate / 100) * 4 : 0;
    const newBiomass = clamp(plant.biomass + biomassRegen, 0, biomassCap);

    // Transition events (fire only when crossing thresholds)
    if (newHealth < 25 && plant.health >= 25) {
      events.push(makeEntry(tick, `${plant.species} is critically stressed!`, "danger"));
    } else if (newHealth < 50 && plant.health >= 50) {
      events.push(makeEntry(tick, `${plant.species} is wilting — check conditions.`, "warning"));
    } else if (newHealth >= 75 && plant.health < 75) {
      events.push(makeEntry(tick, `${plant.species} is thriving! 🌱`, "info"));
    }

    // Periodic dry-air warnings for moisture-loving species
    if (humidity < plant.requirements.humidity.min + 5 && tick % 6 === 0) {
      events.push(makeEntry(tick, `${plant.species} needs more humidity!`, "warning"));
    }

    return { ...plant, health: newHealth, growthRate: newGrowthRate, biomass: newBiomass };
  });

  // ── 2. Biomass pool — organisms consume it proportionally ───────────────────
  const totalBiomass  = updatedPlants.reduce((s, p) => s + p.biomass, 0);
  const totalDemand   = state.organisms.reduce((s, o) => s + o.consumptionRate, 0);
  const foodRatio     = totalDemand > 0 ? clamp(totalBiomass / totalDemand, 0, 2) : 1;

  // Reduce plant biomass proportional to how much was consumed
  const consumed = Math.min(totalBiomass, totalDemand);
  const consumedFraction = totalBiomass > 0 ? consumed / totalBiomass : 0;
  const plantsAfterEating: Plant[] = updatedPlants.map((p) => ({
    ...p,
    biomass: clamp(p.biomass * (1 - consumedFraction * 0.6), 0, 100),
  }));

  // ── 3. Update organisms ─────────────────────────────────────────────────────
  const updatedOrganisms: Organism[] = state.organisms.map((org) => {
    let effectiveFoodRatio = foodRatio;

    if (org.species === "Springtail" && moldRisk > 20) {
      // Springtails eat mold; each springtail removes mold from the environment
      const moldFood = (moldRisk - 20) / 80;
      effectiveFoodRatio = clamp(effectiveFoodRatio + moldFood * 0.6, 0, 2);
      moldRisk = clamp(moldRisk - 8, 0, 100);
    }

    if (org.species === "Isopod" && waste > 10) {
      // Isopods consume waste/debris as a supplemental food source
      const wasteFood = (waste - 10) / 90;
      effectiveFoodRatio = clamp(effectiveFoodRatio + wasteFood * 0.4, 0, 2);
      waste = clamp(waste - 7, 0, 100);
    }

    const tempScore = rangeScore(temperature, org.requirements.temperature);

    // Food health delta: +1.5 if well fed, -3 if starving
    const foodHealthDelta =
      effectiveFoodRatio >= 1.0 ? 1.5 :
      effectiveFoodRatio >= 0.5 ? (effectiveFoodRatio - 0.5) * 3 - 1.5 :
      -3 + effectiveFoodRatio * 3;

    // Temperature health delta: [-3, +1]
    const tempHealthDelta = clamp(tempScore * 2.5, -3, 1);

    const healthDelta = clamp(foodHealthDelta + tempHealthDelta, -5, 2);
    const newHealth   = clamp(org.health + healthDelta, 0, 100);

    // Waste is generated proportionally to organism health
    if (newHealth > 10) {
      waste = clamp(waste + org.wasteOutput * (newHealth / 100), 0, 100);
    }

    // Transition events
    if (newHealth < 25 && org.health >= 25) {
      events.push(makeEntry(tick, `${org.species} colony is in danger!`, "danger"));
    } else if (effectiveFoodRatio < 0.5 && tick % 4 === 0 && newHealth < 80) {
      events.push(makeEntry(tick, `${org.species} is starving — add more plants!`, "warning"));
    } else if (newHealth >= 80 && org.health < 80) {
      events.push(makeEntry(tick, `${org.species} colony is thriving!`, "info"));
    }

    return { ...org, health: newHealth };
  });

  // ── 4. Update environment ───────────────────────────────────────────────────

  // Mold risk climbs when humidity is high; falls naturally otherwise
  if (humidity > 75) {
    moldRisk = clamp(moldRisk + (humidity - 75) / 25 * 3, 0, 100);
  } else {
    moldRisk = clamp(moldRisk - 2, 0, 100);
  }

  // Mold threshold transition events
  if (moldRisk > 70 && environment.moldRisk <= 70) {
    events.push(makeEntry(tick, "Mold spreading fast! Lower humidity or add springtails.", "danger"));
  } else if (moldRisk > 40 && environment.moldRisk <= 40) {
    events.push(makeEntry(tick, "Mold risk rising — monitor humidity.", "warning"));
  } else if (moldRisk < 20 && environment.moldRisk >= 20) {
    events.push(makeEntry(tick, "Mold risk under control. ✅", "info"));
  }

  // Waste decays naturally (microorganisms); excess warns the player
  waste = clamp(waste - 3, 0, 100);
  if (waste > 70 && environment.waste <= 70) {
    events.push(makeEntry(tick, "High waste accumulation! Add isopods to help.", "warning"));
  }

  // Oxygen: healthy plants produce it; depletes gradually without them
  const healthyPlantCount = plantsAfterEating.filter((p) => p.health > 20).length;
  const oxygenGeneration  = plantsAfterEating.reduce(
    (s, p) => s + (p.health > 20 ? p.health * 0.04 : 0),
    0
  );
  oxygen = clamp(oxygen * 0.95 + oxygenGeneration, 0, 100);

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

  // Environment score: rewards oxygen, penalises waste and mold
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
    plants:    plantsAfterEating,
    organisms: updatedOrganisms,
    environment: { lighting, humidity, temperature, oxygen, waste, moldRisk },
    ecosystemHealth: newEcosystemHealth,
    tickCount: tick,
    // Newest events at top; keep last 10
    log: [...events, ...state.log].slice(0, 10),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Reducer actions
// ─────────────────────────────────────────────────────────────────────────────

type Action =
  | { type: "TICK" }
  | { type: "ADD_PLANT";     species: PlantSpecies;    x: number; y: number }
  | { type: "ADD_ORGANISM";  species: OrganismSpecies; x: number; y: number }
  | { type: "REMOVE_PLANT";     id: string }
  | { type: "REMOVE_ORGANISM";  id: string }
  | { type: "SET_LIGHTING";    value: number }
  | { type: "SET_HUMIDITY";    value: number }
  | { type: "SET_TEMPERATURE"; value: number };

let _entityCounter = 0;

function ecosystemReducer(state: EcosystemState, action: Action): EcosystemState {
  switch (action.type) {
    case "TICK":
      return runTick(state);

    case "ADD_PLANT": {
      const template = PLANT_TEMPLATES[action.species];
      const plant: Plant = {
        ...template,
        id: `plant-${++_entityCounter}`,
        x: action.x,
        y: action.y,
        animDelay: Math.random() * 3,
      };
      return {
        ...state,
        plants: [...state.plants, plant],
        log: [
          makeEntry(state.tickCount, `Added ${action.species} to the terrarium.`, "info"),
          ...state.log,
        ].slice(0, 10),
      };
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
      return {
        ...state,
        organisms: [...state.organisms, organism],
        log: [
          makeEntry(state.tickCount, `Added ${action.species} to the terrarium.`, "info"),
          ...state.log,
        ].slice(0, 10),
      };
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
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * useEcosystemLogic
 *
 * Manages the full lifecycle of a simulated terrarium:
 *  - Resource conversion: plants consume light + water → produce oxygen + biomass
 *  - Organisms consume biomass → produce waste; isopods decompose waste,
 *    springtails eat mold
 *  - High humidity causes mold; mold damages plants
 *  - A global Ecosystem Health score reflects the balance of all factors
 *
 * @param tickIntervalMs  How often the simulation advances (default 2 s)
 */
export function useEcosystemLogic(tickIntervalMs = 2000) {
  const [state, dispatch] = useReducer(ecosystemReducer, INITIAL_STATE);

  useEffect(() => {
    const id = setInterval(() => dispatch({ type: "TICK" }), tickIntervalMs);
    return () => clearInterval(id);
  }, [tickIntervalMs]);

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
    addPlant,
    addOrganism,
    removePlant,
    removeOrganism,
    setLighting,
    setHumidity,
    setTemperature,
  };
}
