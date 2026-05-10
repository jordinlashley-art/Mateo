"use client";

import { TerrariumState, EcosystemDisplayData } from "./TerrariumApp";
import { EcosystemEvent } from "@/hooks/useEcosystemLogic";

type ShopItem = { name: string; emoji: string; type: "plant" | "organism" };
type ShopItems = { plants: ShopItem[]; organisms: ShopItem[] };

type Props = {
  state: TerrariumState;
  ecosystemData: EcosystemDisplayData;
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
    trackColors: (v) =>
      `linear-gradient(to right, #f59e0b 0%, #fbbf24 ${v}%, rgba(255,255,255,0.1) ${v}%, rgba(255,255,255,0.1) 100%)`,
  },
  {
    key: "humidity",
    label: "Humidity",
    icon: "💧",
    min: 0,
    max: 100,
    unit: "%",
    trackColors: (v) =>
      `linear-gradient(to right, #3b82f6 0%, #60a5fa ${v}%, rgba(255,255,255,0.1) ${v}%, rgba(255,255,255,0.1) 100%)`,
  },
  {
    key: "temperature",
    label: "Temperature",
    icon: "🌡️",
    min: 5,
    max: 40,
    unit: "°C",
    trackColors: (v) => {
      const pct = ((v - 5) / 35) * 100;
      const color =
        v < 15 ? "#60c8ff" : v > 28 ? "#ef4444" : "#34d399";
      return `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, rgba(255,255,255,0.1) ${pct}%, rgba(255,255,255,0.1) 100%)`;
    },
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ecoHealthColor(score: number): string {
  if (score > 60) return "#4ade80";
  if (score > 30) return "#facc15";
  return "#ef4444";
}

function ecoHealthLabel(score: number): string {
  if (score > 80) return "Thriving";
  if (score > 60) return "Healthy";
  if (score > 40) return "Stable";
  if (score > 20) return "Stressed";
  return "Critical";
}

function severityColor(severity: EcosystemEvent["severity"]): string {
  if (severity === "critical") return "#ef4444";
  if (severity === "warning") return "#facc15";
  return "#4ade80";
}

function severityIcon(severity: EcosystemEvent["severity"]): string {
  if (severity === "critical") return "🔴";
  if (severity === "warning") return "🟡";
  return "🟢";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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
          <span className="text-base leading-none">{config.icon}</span>
          <span
            className="text-sm font-semibold"
            style={{ color: "rgba(255,255,255,0.85)" }}
          >
            {config.label}
          </span>
        </div>
        <span
          className="text-xs font-mono font-bold px-2 py-0.5 rounded-md"
          style={{
            background: "rgba(255,255,255,0.07)",
            color: "rgba(255,255,255,0.7)",
            minWidth: "3rem",
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
          transition: "background 0.3s ease",
        }}
      />
    </div>
  );
}

function ShopButton({
  item,
  onAdd,
}: {
  item: ShopItem;
  onAdd: () => void;
}) {
  return (
    <button
      onClick={onAdd}
      className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-left group transition-all duration-200"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        color: "rgba(255,255,255,0.8)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background =
          "rgba(255,255,255,0.09)";
        (e.currentTarget as HTMLElement).style.borderColor =
          "rgba(255,255,255,0.2)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background =
          "rgba(255,255,255,0.04)";
        (e.currentTarget as HTMLElement).style.borderColor =
          "rgba(255,255,255,0.08)";
      }}
    >
      <span className="text-2xl leading-none">{item.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{item.name}</p>
        <p className="text-xs capitalize" style={{ color: "rgba(255,255,255,0.4)" }}>
          {item.type}
        </p>
      </div>
      <span
        className="text-xs px-2 py-1 rounded-lg font-semibold shrink-0 transition-all duration-200"
        style={{
          background: "rgba(74,222,128,0.12)",
          color: "#4ade80",
          border: "1px solid rgba(74,222,128,0.2)",
        }}
      >
        + Add
      </span>
    </button>
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
    <div className="flex flex-col items-center gap-1 py-1">
      <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
        {label}
      </span>
      <span
        className="text-xs font-bold px-2 py-0.5 rounded-lg"
        style={{
          color,
          background: `${color}18`,
          border: `1px solid ${color}30`,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function ResourceBar({
  label,
  icon,
  value,
  max,
  color,
}: {
  label: string;
  icon: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
          <span>{icon}</span>
          <span>{label}</span>
        </span>
        <span className="text-xs font-mono font-semibold" style={{ color }}>
          {Math.round(value)}
        </span>
      </div>
      <div
        style={{
          height: 4,
          borderRadius: 9999,
          background: "rgba(255,255,255,0.08)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: color,
            borderRadius: 9999,
            transition: "width 0.8s ease",
          }}
        />
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function ControlSidebar({
  state,
  ecosystemData,
  onSliderChange,
  onAddItem,
  shopItems,
}: Props) {
  const { ecosystemHealth, oxygenLevel, debrisLevel, events, tick } = ecosystemData;
  const healthColor = ecoHealthColor(ecosystemHealth);

  return (
    <div className="h-full flex flex-col gap-4 py-2">
      {/* Header */}
      <div className="shrink-0">
        <h1
          className="text-lg font-bold tracking-tight"
          style={{ color: "rgba(255,255,255,0.92)" }}
        >
          🌿 Terrarium OS
        </h1>
        <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
          Control &amp; configure your ecosystem
        </p>
      </div>

      {/* ── Ecosystem Health ──────────────────────────────────────────────── */}
      <div
        className="shrink-0 rounded-2xl p-4 space-y-3"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: `1px solid ${healthColor}25`,
        }}
      >
        <div className="flex items-center justify-between">
          <h2
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "0.15em" }}
          >
            🌍 Ecosystem Health
          </h2>
          <span
            className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg"
            style={{
              color: healthColor,
              background: `${healthColor}18`,
              border: `1px solid ${healthColor}30`,
            }}
          >
            {ecoHealthLabel(ecosystemHealth)}
          </span>
        </div>

        {/* Health gauge */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              Vitality
            </span>
            <span
              className="text-sm font-bold font-mono"
              style={{ color: healthColor }}
            >
              {Math.round(ecosystemHealth)}
              <span className="text-xs opacity-60">/100</span>
            </span>
          </div>
          <div
            style={{
              height: 8,
              borderRadius: 9999,
              background: "rgba(255,255,255,0.08)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${ecosystemHealth}%`,
                height: "100%",
                background: `linear-gradient(to right, ${healthColor}cc, ${healthColor})`,
                borderRadius: 9999,
                transition: "width 1s ease, background 1s ease",
                boxShadow: `0 0 8px ${healthColor}60`,
              }}
            />
          </div>
        </div>

        {/* Resource levels */}
        <ResourceBar label="Oxygen" icon="💨" value={oxygenLevel} max={200} color="#7dd3fc" />
        <ResourceBar label="Debris" icon="🍂" value={debrisLevel} max={100} color="#d97706" />

        {/* Tick counter */}
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
          Simulation tick #{tick}
        </p>
      </div>

      {/* ── Environment Controls ──────────────────────────────────────────── */}
      <div
        className="shrink-0 rounded-2xl p-4 space-y-5"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <h2
          className="text-xs font-bold uppercase tracking-widest"
          style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "0.15em" }}
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
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
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

      {/* ── Shop — Plants ─────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-4 space-y-3"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <h2
          className="text-xs font-bold uppercase tracking-widest"
          style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "0.15em" }}
        >
          🛒 Shop — Plants
        </h2>
        <div className="space-y-2">
          {shopItems.plants.map((item) => (
            <ShopButton
              key={item.name}
              item={item}
              onAdd={() => onAddItem(item.name, item.emoji, item.type)}
            />
          ))}
        </div>
      </div>

      {/* ── Shop — Organisms ──────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-4 space-y-3"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <h2
          className="text-xs font-bold uppercase tracking-widest"
          style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "0.15em" }}
        >
          🛒 Shop — Organisms
        </h2>
        <div className="space-y-2">
          {shopItems.organisms.map((item) => (
            <ShopButton
              key={item.name}
              item={item}
              onAdd={() => onAddItem(item.name, item.emoji, item.type)}
            />
          ))}
        </div>
      </div>

      {/* ── Event Log ─────────────────────────────────────────────────────── */}
      {events.length > 0 && (
        <div
          className="rounded-2xl p-4 space-y-2"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <h2
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "0.15em" }}
          >
            📋 Event Log
          </h2>
          <div className="space-y-1.5 max-h-36 overflow-y-auto thin-scroll">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-2 py-1"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
              >
                <span className="text-xs shrink-0 mt-0.5">
                  {severityIcon(event.severity)}
                </span>
                <p
                  className="text-xs leading-relaxed flex-1"
                  style={{ color: severityColor(event.severity) }}
                >
                  {event.message}
                </p>
                <span
                  className="text-xs shrink-0 font-mono"
                  style={{ color: "rgba(255,255,255,0.2)" }}
                >
                  t{event.tick}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer counts */}
      <div
        className="shrink-0 mt-auto rounded-2xl p-3 flex items-center justify-between"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
          <span className="font-semibold" style={{ color: "rgba(255,255,255,0.65)" }}>
            {state.items.filter((i) => i.type === "plant").length}
          </span>{" "}
          plants &nbsp;·&nbsp;{" "}
          <span className="font-semibold" style={{ color: "rgba(255,255,255,0.65)" }}>
            {state.items.filter((i) => i.type === "organism").length}
          </span>{" "}
          organisms
        </div>
        <span className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
          Click items to remove
        </span>
      </div>
    </div>
  );
}
