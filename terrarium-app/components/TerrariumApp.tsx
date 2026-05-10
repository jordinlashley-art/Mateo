"use client";

import { useCallback } from "react";
import TerrariumView from "./TerrariumView";
import ControlSidebar from "./ControlSidebar";
import { useEcosystemLogic, EcosystemEvent } from "@/hooks/useEcosystemLogic";

// ─── Shared display types (consumed by child components) ─────────────────────

export type TerrariumItem = {
  id: string;
  type: "plant" | "organism";
  name: string;
  emoji: string;
  x: number;
  y: number;
  delay: number;
  /** Current health 0–100 from the ecosystem simulation */
  health: number;
};

export type TerrariumState = {
  lighting: number;
  humidity: number;
  temperature: number;
  items: TerrariumItem[];
};

/** Subset of ecosystem simulation data surfaced to UI panels */
export type EcosystemDisplayData = {
  ecosystemHealth: number;
  tick: number;
  oxygenLevel: number;
  debrisLevel: number;
  events: EcosystemEvent[];
};

// ─── Shop catalogue ───────────────────────────────────────────────────────────

const SHOP_ITEMS = {
  plants: [
    { name: "Moss", emoji: "🌿", type: "plant" as const },
    { name: "Fern", emoji: "🌱", type: "plant" as const },
  ],
  organisms: [
    { name: "Isopod", emoji: "🦗", type: "organism" as const },
    { name: "Springtail", emoji: "🪲", type: "organism" as const },
  ],
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function TerrariumApp() {
  const { state: eco, addPlant, addOrganism, removeEntity, updateEnvironment } =
    useEcosystemLogic();

  // Adapt ecosystem plants + organisms → flat TerrariumItem list for the view
  const items: TerrariumItem[] = [
    ...eco.plants.map(
      (p): TerrariumItem => ({
        id: p.id,
        type: "plant",
        name: p.name,
        emoji: p.emoji,
        x: p.x,
        y: p.y,
        delay: p.delay,
        health: p.health,
      })
    ),
    ...eco.organisms.map(
      (o): TerrariumItem => ({
        id: o.id,
        type: "organism",
        name: o.name,
        emoji: o.emoji,
        x: o.x,
        y: o.y,
        delay: o.delay,
        health: o.health,
      })
    ),
  ];

  const terrariumState: TerrariumState = {
    lighting: eco.lighting,
    humidity: eco.humidity,
    temperature: eco.temperature,
    items,
  };

  const ecosystemData: EcosystemDisplayData = {
    ecosystemHealth: eco.ecosystemHealth,
    tick: eco.tick,
    oxygenLevel: eco.oxygenLevel,
    debrisLevel: eco.debrisLevel,
    events: eco.events,
  };

  const handleSliderChange = useCallback(
    (key: "lighting" | "humidity" | "temperature", value: number) => {
      updateEnvironment(key, value);
    },
    [updateEnvironment]
  );

  const handleAddItem = useCallback(
    (name: string, emoji: string, type: "plant" | "organism") => {
      if (type === "plant") {
        addPlant(name, emoji);
      } else {
        addOrganism(name, emoji);
      }
    },
    [addPlant, addOrganism]
  );

  return (
    <div
      className="h-screen w-screen flex overflow-hidden relative"
      style={{
        background:
          "radial-gradient(ellipse at 30% 60%, #0d2818 0%, #0a0f0a 50%, #060a06 100%)",
      }}
    >
      {/* Ambient background blobs */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        aria-hidden
      >
        <div
          className="absolute rounded-full blur-3xl opacity-20"
          style={{
            width: 600,
            height: 600,
            top: "10%",
            left: "5%",
            background: `radial-gradient(circle, hsl(${eco.lighting * 1.2 + 40}, 80%, 40%), transparent)`,
            transition: "background 0.6s ease",
          }}
        />
        <div
          className="absolute rounded-full blur-3xl opacity-15"
          style={{
            width: 400,
            height: 400,
            bottom: "5%",
            right: "25%",
            background: `radial-gradient(circle, hsl(200, ${eco.humidity}%, 35%), transparent)`,
            transition: "background 0.6s ease",
          }}
        />
      </div>

      {/* Terrarium View — main content */}
      <main className="flex-1 flex items-center justify-center p-6 min-w-0">
        <TerrariumView
          state={terrariumState}
          ecosystemData={ecosystemData}
          onRemoveItem={removeEntity}
        />
      </main>

      {/* Control Sidebar */}
      <aside className="w-80 shrink-0 h-full overflow-y-auto thin-scroll p-4">
        <ControlSidebar
          state={terrariumState}
          ecosystemData={ecosystemData}
          onSliderChange={handleSliderChange}
          onAddItem={handleAddItem}
          shopItems={SHOP_ITEMS}
        />
      </aside>
    </div>
  );
}
