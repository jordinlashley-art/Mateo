"use client";

import { EcosystemState, PlantSpecies, OrganismSpecies, LogEntry, LogLevel } from "@/types/ecosystem";
import { TimeScale } from "@/hooks/useEcosystemLogic";

type Props = {
  state: EcosystemState;
  timeScale: TimeScale;
  onSetTimeScale:   (s: TimeScale) => void;
  onSetLighting:    (v: number) => void;
  onSetHumidity:    (v: number) => void;
  onSetTemperature: (v: number) => void;
  onAddPlant:    (species: PlantSpecies)    => void;
  onAddOrganism: (species: OrganismSpecies) => void;
};

// ── Ecosystem health colour / label ───────────────────────────────────────────
function healthColor(score: number): string {
  if (score >= 70) return "#4ade80";
  if (score >= 40) return "#fbbf24";
  return "#ef4444";
}
function healthLabel(score: number): string {
  if (score >= 80) return "Flourishing";
  if (score >= 60) return "Stable";
  if (score >= 40) return "Stressed";
  if (score >= 20) return "Critical";
  return "Collapsing";
}

// ── Slider ────────────────────────────────────────────────────────────────────
type SliderConfig = {
  key: "lighting" | "humidity" | "temperature";
  label: string;
  icon: string;
  min: number;
  max: number;
  unit: string;
  trackFill: (v: number) => string;
};

const SLIDERS: SliderConfig[] = [
  {
    key: "lighting", label: "Lighting", icon: "☀️", min: 0, max: 100, unit: "%",
    trackFill: (v) =>
      `linear-gradient(to right, #f59e0b 0%, #fbbf24 ${v}%, rgba(255,255,255,0.1) ${v}%, rgba(255,255,255,0.1) 100%)`,
  },
  {
    key: "humidity", label: "Humidity", icon: "💧", min: 0, max: 100, unit: "%",
    trackFill: (v) =>
      `linear-gradient(to right, #3b82f6 0%, #60a5fa ${v}%, rgba(255,255,255,0.1) ${v}%, rgba(255,255,255,0.1) 100%)`,
  },
  {
    key: "temperature", label: "Temperature", icon: "🌡️", min: 5, max: 40, unit: "°C",
    trackFill: (v) => {
      const pct = ((v - 5) / 35) * 100;
      const color = v < 15 ? "#60c8ff" : v > 28 ? "#ef4444" : "#34d399";
      return `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, rgba(255,255,255,0.1) ${pct}%, rgba(255,255,255,0.1) 100%)`;
    },
  },
];

function SliderRow({
  config, value, onChange,
}: { config: SliderConfig; value: number; onChange: (v: number) => void }) {
  const pct =
    config.key === "temperature"
      ? ((value - config.min) / (config.max - config.min)) * 100
      : value;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">{config.icon}</span>
          <span className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.85)" }}>
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
          {value}{config.unit}
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
          background: config.trackFill(pct),
          transition: "background 0.3s ease",
        }}
      />
    </div>
  );
}

// ── Mini vitals bar ────────────────────────────────────────────────────────────
function VitalBar({
  label, icon, value, color, invertWarning = false,
}: {
  label: string;
  icon: string;
  value: number;
  color: string;
  invertWarning?: boolean;
}) {
  const warn = invertWarning ? value > 65 : value < 35;
  const displayColor = warn ? "#ef4444" : color;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs flex items-center gap-1" style={{ color: "rgba(255,255,255,0.5)" }}>
          <span>{icon}</span> {label}
        </span>
        <span
          className="text-xs font-mono font-bold"
          style={{ color: displayColor, minWidth: "2.5rem", textAlign: "right" }}
        >
          {Math.round(value)}%
        </span>
      </div>
      <div
        className="h-1.5 w-full rounded-full overflow-hidden"
        style={{ background: "rgba(255,255,255,0.08)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${value}%`,
            background: displayColor,
            boxShadow: `0 0 6px ${displayColor}60`,
          }}
        />
      </div>
    </div>
  );
}

// ── Shop button ────────────────────────────────────────────────────────────────
type ShopEntry = { name: string; emoji: string; description: string };

function ShopButton({ entry, onAdd }: { entry: ShopEntry; onAdd: () => void }) {
  return (
    <button
      onClick={onAdd}
      className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-left transition-all duration-200"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        color: "rgba(255,255,255,0.8)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.09)";
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.2)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
      }}
    >
      <span className="text-2xl leading-none">{entry.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{entry.name}</p>
        <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.38)" }}>
          {entry.description}
        </p>
      </div>
      <span
        className="text-xs px-2 py-1 rounded-lg font-semibold shrink-0"
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

// ── Time Scale toggle ─────────────────────────────────────────────────────────
const TIME_SCALES: TimeScale[] = [1, 5, 10];

function TimeScaleToggle({
  current, onChange,
}: { current: TimeScale; onChange: (s: TimeScale) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-bold uppercase" style={{ color: "rgba(255,255,255,0.38)", letterSpacing: "0.12em" }}>
        Speed
      </span>
      <div
        className="flex rounded-xl overflow-hidden flex-1"
        style={{ border: "1px solid rgba(255,255,255,0.1)" }}
      >
        {TIME_SCALES.map((scale) => {
          const active = scale === current;
          return (
            <button
              key={scale}
              onClick={() => onChange(scale)}
              className="flex-1 py-1.5 text-xs font-bold transition-all duration-200"
              style={{
                background: active
                  ? "rgba(74,222,128,0.2)"
                  : "rgba(255,255,255,0.03)",
                color: active ? "#4ade80" : "rgba(255,255,255,0.4)",
                borderRight: scale !== 10 ? "1px solid rgba(255,255,255,0.08)" : "none",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {scale}×
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Log row ────────────────────────────────────────────────────────────────────
const LOG_ICONS: Record<LogLevel, string> = {
  info: "💬",
  warning: "⚠️",
  danger: "🚨",
};
const LOG_COLORS: Record<LogLevel, string> = {
  info: "rgba(74,222,128,0.9)",
  warning: "rgba(251,191,36,0.9)",
  danger: "rgba(239,68,68,0.9)",
};
const LOG_BG: Record<LogLevel, string> = {
  info: "rgba(74,222,128,0.05)",
  warning: "rgba(251,191,36,0.05)",
  danger: "rgba(239,68,68,0.06)",
};

function LogRow({ entry }: { entry: LogEntry }) {
  return (
    <div
      className="flex items-start gap-2 px-2 py-1.5 rounded-lg"
      style={{ background: LOG_BG[entry.level] }}
    >
      <span className="shrink-0 mt-px text-xs">{LOG_ICONS[entry.level]}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs leading-snug" style={{ color: LOG_COLORS[entry.level] }}>
          {entry.message}
        </p>
        <p className="text-xs mt-0.5 font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>
          tick {entry.tick}
        </p>
      </div>
    </div>
  );
}

// ── Section header ─────────────────────────────────────────────────────────────
function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-xs font-bold uppercase"
      style={{ color: "rgba(255,255,255,0.38)", letterSpacing: "0.15em" }}
    >
      {children}
    </h2>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl p-4 space-y-3 ${className ?? ""}`}
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {children}
    </div>
  );
}

function StatusBadge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1 py-1">
      <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{label}</span>
      <span
        className="text-xs font-bold px-2 py-0.5 rounded-lg"
        style={{ color, background: `${color}18`, border: `1px solid ${color}30` }}
      >
        {value}
      </span>
    </div>
  );
}

// ── Main sidebar ───────────────────────────────────────────────────────────────
export default function ControlSidebar({
  state, timeScale, onSetTimeScale,
  onSetLighting, onSetHumidity, onSetTemperature,
  onAddPlant, onAddOrganism,
}: Props) {
  const { environment, ecosystemHealth, log, plants, organisms } = state;
  const ehColor = healthColor(ecosystemHealth);
  const ehLabel = healthLabel(ecosystemHealth);

  const lightLabel = environment.lighting  < 20 ? "Dark"  : environment.lighting  < 50 ? "Dim"   : environment.lighting  < 80 ? "Bright" : "Full";
  const mistLabel  = environment.humidity  < 40 ? "Dry"   : environment.humidity  < 65 ? "Low"   : environment.humidity  < 85 ? "Moist"  : "Misty";
  const tempLabel  = environment.temperature < 15 ? "Cold" : environment.temperature > 28 ? "Hot"  : "Ideal";

  const lightBadgeColor = environment.lighting < 20 ? "#475569" : environment.lighting < 50 ? "#a78bfa" : "#fbbf24";
  const mistBadgeColor  = environment.humidity < 40 ? "#92400e" : environment.humidity < 65 ? "#60a5fa" : "#38bdf8";
  const tempBadgeColor  = environment.temperature < 15 ? "#60c8ff" : environment.temperature > 28 ? "#ef4444" : "#34d399";

  const PLANTS: Array<{ name: PlantSpecies; emoji: string; description: string }> = [
    { name: "Moss",  emoji: "🌿", description: "Low–medium light · high humidity · slow O₂" },
    { name: "Fern",  emoji: "🌱", description: "Medium light · needs moisture · fast growth" },
  ];
  const ORGANISMS: Array<{ name: OrganismSpecies; emoji: string; description: string }> = [
    { name: "Isopod",     emoji: "🦗", description: "Eats decaying plants · boosts soil quality" },
    { name: "Springtail", emoji: "🪲", description: "Prevents mold · thrives in high humidity" },
  ];

  return (
    <div className="h-full flex flex-col gap-4 py-2">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="shrink-0">
        <h1 className="text-lg font-bold tracking-tight" style={{ color: "rgba(255,255,255,0.92)" }}>
          🌿 Terrarium OS
        </h1>
        <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
          Control &amp; configure your ecosystem
        </p>
      </div>

      {/* ── Ecosystem health bar ───────────────────────────────────────────── */}
      <div
        className="shrink-0 rounded-2xl p-4 space-y-2"
        style={{
          background: `linear-gradient(135deg, ${ehColor}10, rgba(255,255,255,0.02))`,
          border: `1px solid ${ehColor}25`,
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase" style={{ color: "rgba(255,255,255,0.5)", letterSpacing: "0.12em" }}>
            Ecosystem Health
          </span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-lg" style={{ color: ehColor, background: `${ehColor}18`, border: `1px solid ${ehColor}30` }}>
            {ehLabel}
          </span>
        </div>
        <div className="h-2.5 w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${ecosystemHealth}%`,
              background: `linear-gradient(to right, ${ehColor}aa, ${ehColor})`,
              boxShadow: `0 0 8px ${ehColor}60`,
            }}
          />
        </div>
        <p className="text-right text-xs font-mono font-bold" style={{ color: ehColor }}>
          {Math.round(ecosystemHealth)}/100
        </p>
      </div>

      {/* ── Simulation speed ───────────────────────────────────────────────── */}
      <div
        className="shrink-0 rounded-2xl px-4 py-3"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">⏱️</span>
              <SectionHeader>Simulation Speed</SectionHeader>
            </div>
            <span className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>
              tick #{state.tickCount}
            </span>
          </div>
          <TimeScaleToggle current={timeScale} onChange={onSetTimeScale} />
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.22)" }}>
            {timeScale === 1 && "1 tick every 2 s — standard pace"}
            {timeScale === 5 && "5× faster — tick every 0.4 s"}
            {timeScale === 10 && "10× faster — rapid simulation"}
          </p>
        </div>
      </div>

      {/* ── Environment sliders ────────────────────────────────────────────── */}
      <Card className="shrink-0">
        <SectionHeader>Environment</SectionHeader>
        {SLIDERS.map((cfg) => (
          <SliderRow
            key={cfg.key}
            config={cfg}
            value={environment[cfg.key]}
            onChange={
              cfg.key === "lighting"
                ? onSetLighting
                : cfg.key === "humidity"
                ? onSetHumidity
                : onSetTemperature
            }
          />
        ))}
      </Card>

      {/* ── Status badges + vitals ─────────────────────────────────────────── */}
      <div
        className="shrink-0 rounded-2xl p-3 space-y-3"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="grid grid-cols-3 gap-1">
          <StatusBadge label="Light"  value={lightLabel}  color={lightBadgeColor} />
          <StatusBadge label="Mist"   value={mistLabel}   color={mistBadgeColor} />
          <StatusBadge label="Temp"   value={tempLabel}   color={tempBadgeColor} />
        </div>
        <div className="space-y-2.5 pt-1">
          <VitalBar label="Oxygen"    icon="🌬️" value={environment.oxygen}   color="#60a5fa" />
          <VitalBar label="Waste"     icon="💩" value={environment.waste}    color="#fbbf24" invertWarning />
          <VitalBar label="Mold Risk" icon="🍄" value={environment.moldRisk} color="#c084fc" invertWarning />
        </div>
      </div>

      {/* ── Shop — Plants ──────────────────────────────────────────────────── */}
      <Card>
        <SectionHeader>🛒 Shop — Plants</SectionHeader>
        {PLANTS.map((p) => (
          <ShopButton
            key={p.name}
            entry={{ name: p.name, emoji: p.emoji, description: p.description }}
            onAdd={() => onAddPlant(p.name)}
          />
        ))}
      </Card>

      {/* ── Shop — Organisms ───────────────────────────────────────────────── */}
      <Card>
        <SectionHeader>🛒 Shop — Organisms</SectionHeader>
        {ORGANISMS.map((o) => (
          <ShopButton
            key={o.name}
            entry={{ name: o.name, emoji: o.emoji, description: o.description }}
            onAdd={() => onAddOrganism(o.name)}
          />
        ))}
      </Card>

      {/* ── Event Logs ─────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-4 space-y-2"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="flex items-center justify-between mb-1">
          <SectionHeader>📋 Logs</SectionHeader>
          <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.06)" }}>
            {log.length}
          </span>
        </div>

        {log.length === 0 ? (
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
            No events yet.
          </p>
        ) : (
          <div
            className="space-y-1 overflow-y-auto thin-scroll"
            style={{ maxHeight: "14rem" }}
          >
            {log.map((entry: LogEntry) => (
              <LogRow key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div
        className="shrink-0 mt-auto rounded-2xl p-3 flex items-center justify-between"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
          <span className="font-semibold" style={{ color: "rgba(255,255,255,0.65)" }}>
            {plants.length}
          </span>{" "}plants ·{" "}
          <span className="font-semibold" style={{ color: "rgba(255,255,255,0.65)" }}>
            {organisms.length}
          </span>{" "}organisms
        </span>
        <span className="text-xs" style={{ color: "rgba(255,255,255,0.22)" }}>
          Click items to remove
        </span>
      </div>

    </div>
  );
}
