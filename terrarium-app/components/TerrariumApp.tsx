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
        x: 8 + Math.random() * 82,
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
          "radial-gradient(ellipse at 25% 55%, #081408 0%, #060c06 45%, #040804 100%)",
      }}
    >
      {/* Deep background grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(74,222,128,1) 1px, transparent 1px), linear-gradient(90deg, rgba(74,222,128,1) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
        aria-hidden
      />

      {/* Ambient background blobs */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        aria-hidden
      >
        {/* Lighting blob — reacts to lighting slider */}
        <div
          className="absolute rounded-full"
          style={{
            width: 700,
            height: 700,
            top: "-10%",
            left: "-5%",
            background: `radial-gradient(circle, hsl(${state.lighting * 1.1 + 40}, 70%, 22%), transparent 70%)`,
            opacity: 0.18 + state.lighting / 600,
            filter: "blur(60px)",
            transition: "background 0.7s ease, opacity 0.7s ease",
          }}
        />
        {/* Humidity blob — reacts to humidity slider */}
        <div
          className="absolute rounded-full"
          style={{
            width: 500,
            height: 500,
            bottom: "-8%",
            right: "20%",
            background: `radial-gradient(circle, hsl(200, ${state.humidity}%, 28%), transparent 70%)`,
            opacity: 0.12 + state.humidity / 700,
            filter: "blur(50px)",
            transition: "background 0.7s ease, opacity 0.7s ease",
          }}
        />
        {/* Temperature blob */}
        <div
          className="absolute rounded-full"
          style={{
            width: 300,
            height: 300,
            top: "30%",
            right: "5%",
            background:
              state.temperature < 15
                ? "radial-gradient(circle, hsl(200, 80%, 35%), transparent 70%)"
                : state.temperature > 28
                ? "radial-gradient(circle, hsl(15, 80%, 35%), transparent 70%)"
                : "radial-gradient(circle, hsl(140, 60%, 25%), transparent 70%)",
            opacity: 0.1,
            filter: "blur(40px)",
            transition: "background 0.7s ease",
          }}
        />
      </div>

      {/* Terrarium View — main content */}
      <main className="flex-1 flex items-center justify-center p-6 min-w-0 relative z-10">
        <TerrariumView state={state} onRemoveItem={handleRemoveItem} />
      </main>

      {/* Vertical divider */}
      <div
        className="w-px self-stretch my-6 shrink-0"
        style={{
          background:
            "linear-gradient(to bottom, transparent, rgba(74,222,128,0.12) 20%, rgba(74,222,128,0.18) 50%, rgba(74,222,128,0.12) 80%, transparent)",
        }}
        aria-hidden
      />

      {/* Control Sidebar */}
      <aside className="w-80 shrink-0 h-full overflow-y-auto thin-scroll px-4 py-0 relative z-10">
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
