"use client";

import { useState, useCallback } from "react";
import TerrariumView from "./TerrariumView";
import ControlSidebar from "./ControlSidebar";

export type TerrariumItem = {
  id: string;
  type: "plant" | "organism";
  name: string;
  emoji: string;
  x: number;
  y: number;
  delay: number;
};

export type TerrariumState = {
  lighting: number;
  humidity: number;
  temperature: number;
  items: TerrariumItem[];
};

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

let itemCounter = 0;

export default function TerrariumApp() {
  const [state, setState] = useState<TerrariumState>({
    lighting: 60,
    humidity: 75,
    temperature: 22,
    items: [],
  });

  const handleSliderChange = useCallback(
    (key: "lighting" | "humidity" | "temperature", value: number) => {
      setState((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleAddItem = useCallback(
    (name: string, emoji: string, type: "plant" | "organism") => {
      itemCounter += 1;
      const newItem: TerrariumItem = {
        id: `${type}-${itemCounter}`,
        type,
        name,
        emoji,
        x: 10 + Math.random() * 80,
        y: type === "plant" ? 50 + Math.random() * 35 : 60 + Math.random() * 30,
        delay: Math.random() * 3,
      };
      setState((prev) => ({ ...prev, items: [...prev.items, newItem] }));
    },
    []
  );

  const handleRemoveItem = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
  }, []);

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
            background: `radial-gradient(circle, hsl(${state.lighting * 1.2 + 40}, 80%, 40%), transparent)`,
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
            background: `radial-gradient(circle, hsl(200, ${state.humidity}%, 35%), transparent)`,
            transition: "background 0.6s ease",
          }}
        />
      </div>

      {/* Terrarium View — main content */}
      <main className="flex-1 flex items-center justify-center p-6 min-w-0">
        <TerrariumView state={state} onRemoveItem={handleRemoveItem} />
      </main>

      {/* Control Sidebar */}
      <aside className="w-80 shrink-0 h-full overflow-y-auto thin-scroll p-4">
        <ControlSidebar
          state={state}
          onSliderChange={handleSliderChange}
          onAddItem={handleAddItem}
          shopItems={SHOP_ITEMS}
        />
      </aside>
    </div>
  );
}
