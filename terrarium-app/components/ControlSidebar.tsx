"use client";

import { TerrariumState } from "./TerrariumApp";

type ShopItem = { name: string; emoji: string; type: "plant" | "organism" };
type ShopItems = { plants: ShopItem[]; organisms: ShopItem[] };

type Props = {
  state: TerrariumState;
  onSliderChange: (key: "lighting" | "humidity" | "temperature", value: number) => void;
  onAddItem: (name: string, emoji: string, type: "plant" | "organism") => void;
  shopItems: ShopItems;
};

type SliderConfig = {
  key: "lighting" | "humidity" | "temperature";
  label: string;
  icon: string;
  min: number;
  max: number;
  unit: string;
  accentColor: string;
  trackColors: (value: number) => string;
};

const SLIDERS: SliderConfig[] = [
  {
    key: "lighting",
    label: "Lighting",
    icon: "☀️",
    min: 0,
    max: 100,
    unit: "%",
    accentColor: "#fbbf24",
    trackColors: (v) =>
      `linear-gradient(to right, #f59e0b 0%, #fbbf24 ${v}%, rgba(255,255,255,0.08) ${v}%, rgba(255,255,255,0.08) 100%)`,
  },
  {
    key: "humidity",
    label: "Humidity",
    icon: "💧",
    min: 0,
    max: 100,
    unit: "%",
    accentColor: "#60a5fa",
    trackColors: (v) =>
      `linear-gradient(to right, #3b82f6 0%, #60a5fa ${v}%, rgba(255,255,255,0.08) ${v}%, rgba(255,255,255,0.08) 100%)`,
  },
  {
    key: "temperature",
    label: "Temperature",
    icon: "🌡️",
    min: 5,
    max: 40,
    unit: "°C",
    accentColor: "#34d399",
    trackColors: (v) => {
      const pct = ((v - 5) / 35) * 100;
      const color = v < 15 ? "#60c8ff" : v > 28 ? "#ef4444" : "#34d399";
      return `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, rgba(255,255,255,0.08) ${pct}%, rgba(255,255,255,0.08) 100%)`;
    },
  },
];

function SliderRow({
  config,
  value,
  onChange,
}: {
  config: SliderConfig;
  value: number;
  onChange: (v: number) => void;
}) {
  const pct =
    config.key === "temperature"
      ? ((value - config.min) / (config.max - config.min)) * 100
      : value;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm leading-none">{config.icon}</span>
          <span
            className="text-sm font-semibold"
            style={{ color: "rgba(255,255,255,0.82)" }}
          >
            {config.label}
          </span>
        </div>
        <span
          className="text-xs font-mono font-bold px-2 py-0.5 rounded-md tabular-nums"
          style={{
            background: `${config.accentColor}14`,
            color: config.accentColor,
            border: `1px solid ${config.accentColor}28`,
            minWidth: "3.25rem",
            textAlign: "center",
          }}
        >
          {value}
          {config.unit}
        </span>
      </div>
      <input
        type="range"
        min={config.min}
        max={config.max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        style={{
          background: config.trackColors(pct),
          transition: "background 0.25s ease",
        }}
      />
    </div>
  );
}

function ShopButton({
  item,
  count,
  onAdd,
}: {
  item: ShopItem;
  count: number;
  onAdd: () => void;
}) {
  return (
    <button
      onClick={onAdd}
      className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-left transition-all duration-200 group"
      style={{
        background: "rgba(255,255,255,0.035)",
        border: "1px solid rgba(255,255,255,0.075)",
        color: "rgba(255,255,255,0.82)",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.background = "rgba(74,222,128,0.07)";
        el.style.borderColor = "rgba(74,222,128,0.18)";
        el.style.transform = "translateX(2px)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.background = "rgba(255,255,255,0.035)";
        el.style.borderColor = "rgba(255,255,255,0.075)";
        el.style.transform = "translateX(0)";
      }}
    >
      <span className="text-2xl leading-none shrink-0">{item.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{item.name}</p>
        <p className="text-xs capitalize" style={{ color: "rgba(255,255,255,0.38)" }}>
          {item.type}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {count > 0 && (
          <span
            className="text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold"
            style={{
              background: "rgba(74,222,128,0.18)",
              color: "#4ade80",
              border: "1px solid rgba(74,222,128,0.25)",
              fontSize: "10px",
            }}
          >
            {count}
          </span>
        )}
        <span
          className="text-xs px-2 py-1 rounded-lg font-bold transition-all duration-200"
          style={{
            background: "rgba(74,222,128,0.1)",
            color: "#4ade80",
            border: "1px solid rgba(74,222,128,0.18)",
          }}
        >
          + Add
        </span>
      </div>
    </button>
  );
}

export default function ControlSidebar({
  state,
  onSliderChange,
  onAddItem,
  shopItems,
}: Props) {
  const plantCounts = Object.fromEntries(
    shopItems.plants.map((p) => [
      p.name,
      state.items.filter((i) => i.name === p.name).length,
    ])
  );
  const orgCounts = Object.fromEntries(
    shopItems.organisms.map((o) => [
      o.name,
      state.items.filter((i) => i.name === o.name).length,
    ])
  );

  const totalPlants = state.items.filter((i) => i.type === "plant").length;
  const totalOrgs = state.items.filter((i) => i.type === "organism").length;

  return (
    <div className="h-full flex flex-col gap-3.5 py-2">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <h1
            className="text-lg font-bold tracking-tight flex items-center gap-2"
            style={{ color: "rgba(255,255,255,0.92)" }}
          >
            <span
              className="text-sm px-2 py-0.5 rounded-lg font-mono"
              style={{
                background: "rgba(74,222,128,0.12)",
                border: "1px solid rgba(74,222,128,0.2)",
                color: "#4ade80",
              }}
            >
              OS
            </span>
            Terrarium
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.32)" }}>
            Control &amp; configure your ecosystem
          </p>
        </div>
        {/* Online indicator */}
        <div className="flex items-center gap-1.5">
          <div
            className="w-1.5 h-1.5 rounded-full animate-pulse-glow"
            style={{ background: "#4ade80", boxShadow: "0 0 4px #4ade80" }}
          />
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
            Live
          </span>
        </div>
      </div>

      {/* Environment Controls */}
      <div
        className="shrink-0 rounded-2xl p-4 space-y-5"
        style={{
          background: "rgba(8, 20, 8, 0.6)",
          backdropFilter: "blur(24px) saturate(150%)",
          WebkitBackdropFilter: "blur(24px) saturate(150%)",
          border: "1px solid rgba(74,222,128,0.1)",
        }}
      >
        <h2
          className="text-xs font-bold uppercase tracking-widest section-accent"
          style={{ color: "#4ade80", letterSpacing: "0.15em" }}
        >
          Environment
        </h2>
        {SLIDERS.map((config) => (
          <SliderRow
            key={config.key}
            config={config}
            value={state[config.key]}
            onChange={(v) => onSliderChange(config.key, v)}
          />
        ))}
      </div>

      {/* Status indicators */}
      <div
        className="shrink-0 grid grid-cols-3 gap-2 rounded-2xl p-3"
        style={{
          background: "rgba(8, 20, 8, 0.45)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <StatusBadge
          label="Light"
          value={
            state.lighting < 20
              ? "Dark"
              : state.lighting < 50
              ? "Dim"
              : state.lighting < 80
              ? "Bright"
              : "Full"
          }
          color={
            state.lighting < 20
              ? "#475569"
              : state.lighting < 50
              ? "#a78bfa"
              : state.lighting < 80
              ? "#fbbf24"
              : "#fde68a"
          }
        />
        <StatusBadge
          label="Mist"
          value={
            state.humidity < 40
              ? "Dry"
              : state.humidity < 65
              ? "Low"
              : state.humidity < 85
              ? "Moist"
              : "Misty"
          }
          color={
            state.humidity < 40
              ? "#92400e"
              : state.humidity < 65
              ? "#60a5fa"
              : state.humidity < 85
              ? "#38bdf8"
              : "#7dd3fc"
          }
        />
        <StatusBadge
          label="Temp"
          value={
            state.temperature < 15
              ? "Cold"
              : state.temperature > 28
              ? "Hot"
              : "Ideal"
          }
          color={
            state.temperature < 15
              ? "#60c8ff"
              : state.temperature > 28
              ? "#ef4444"
              : "#34d399"
          }
        />
      </div>

      {/* Shop — Plants */}
      <div
        className="rounded-2xl p-4 space-y-3"
        style={{
          background: "rgba(8, 20, 8, 0.6)",
          backdropFilter: "blur(24px) saturate(150%)",
          WebkitBackdropFilter: "blur(24px) saturate(150%)",
          border: "1px solid rgba(74,222,128,0.1)",
        }}
      >
        <div className="flex items-center justify-between">
          <h2
            className="text-xs font-bold uppercase tracking-widest section-accent"
            style={{ color: "#4ade80", letterSpacing: "0.15em" }}
          >
            🌿 Shop — Plants
          </h2>
          {totalPlants > 0 && (
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{
                background: "rgba(74,222,128,0.12)",
                color: "#4ade80",
                border: "1px solid rgba(74,222,128,0.2)",
              }}
            >
              {totalPlants} in tank
            </span>
          )}
        </div>
        <div className="space-y-2">
          {shopItems.plants.map((item) => (
            <ShopButton
              key={item.name}
              item={item}
              count={plantCounts[item.name] ?? 0}
              onAdd={() => onAddItem(item.name, item.emoji, item.type)}
            />
          ))}
        </div>
      </div>

      {/* Shop — Organisms */}
      <div
        className="rounded-2xl p-4 space-y-3"
        style={{
          background: "rgba(8, 20, 8, 0.6)",
          backdropFilter: "blur(24px) saturate(150%)",
          WebkitBackdropFilter: "blur(24px) saturate(150%)",
          border: "1px solid rgba(74,222,128,0.1)",
        }}
      >
        <div className="flex items-center justify-between">
          <h2
            className="text-xs font-bold uppercase tracking-widest section-accent"
            style={{ color: "#4ade80", letterSpacing: "0.15em" }}
          >
            🦗 Shop — Organisms
          </h2>
          {totalOrgs > 0 && (
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{
                background: "rgba(74,222,128,0.12)",
                color: "#4ade80",
                border: "1px solid rgba(74,222,128,0.2)",
              }}
            >
              {totalOrgs} in tank
            </span>
          )}
        </div>
        <div className="space-y-2">
          {shopItems.organisms.map((item) => (
            <ShopButton
              key={item.name}
              item={item}
              count={orgCounts[item.name] ?? 0}
              onAdd={() => onAddItem(item.name, item.emoji, item.type)}
            />
          ))}
        </div>
      </div>

      {/* Footer counts */}
      <div
        className="shrink-0 mt-auto rounded-2xl p-3 flex items-center justify-between"
        style={{
          background: "rgba(8,20,8,0.4)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div className="text-xs" style={{ color: "rgba(255,255,255,0.32)" }}>
          <span className="font-bold" style={{ color: "#4ade80" }}>
            {totalPlants}
          </span>{" "}
          plants{" "}
          <span className="opacity-40">·</span>{" "}
          <span className="font-bold" style={{ color: "#4ade80" }}>
            {totalOrgs}
          </span>{" "}
          organisms
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded-md"
          style={{
            color: "rgba(255,255,255,0.22)",
            background: "rgba(255,255,255,0.04)",
          }}
        >
          tap to remove
        </span>
      </div>
    </div>
  );
}

function StatusBadge({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 py-1">
      <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
        {label}
      </span>
      <span
        className="text-xs font-bold px-2 py-0.5 rounded-lg"
        style={{
          color,
          background: `${color}16`,
          border: `1px solid ${color}2e`,
        }}
      >
        {value}
      </span>
    </div>
  );
}
