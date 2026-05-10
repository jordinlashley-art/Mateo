"use client";

import { useMemo } from "react";
import { Plant, Organism, EnvironmentState } from "@/types/ecosystem";

type Props = {
  plants: Plant[];
  organisms: Organism[];
  environment: EnvironmentState;
  onRemovePlant: (id: string) => void;
  onRemoveOrganism: (id: string) => void;
};

// Returns a CSS animation class based on species
function plantAnimation(): string { return "animate-sway"; }
function orgAnimation(species: string): string {
  return species === "Isopod" ? "animate-crawl" : "animate-hop";
}

// Health → indicator dot colour
function healthDotColor(health: number): string {
  if (health <= 0)  return "#4b5563"; // dead — gray
  if (health < 33)  return "#ef4444"; // critical — red
  if (health < 66)  return "#fbbf24"; // stressed — yellow
  return "#4ade80";                   // healthy — green
}

// Health → CSS filter applied to the emoji
function healthFilter(health: number): string {
  if (health <= 0) return "grayscale(1) brightness(0.3)";
  const brightness = 0.3 + (health / 100) * 0.85;
  const saturation = 0.2 + (health / 100) * 0.8;
  return `brightness(${brightness.toFixed(2)}) saturate(${saturation.toFixed(2)})`;
}

// Returns a scale transform for dying/dead entities
function healthScale(health: number): number {
  if (health <= 0)  return 0.55;
  if (health < 25)  return 0.75 + (health / 25) * 0.1;
  return 1;
}

type ItemBadgeProps = {
  emoji: string;
  health: number;
  name: string;
  animation: string;
  animDelay: number;
  x: number;
  y: number;
  fontSize: string;
  zIndex: number;
  onRemove: () => void;
};

function TerrariumItem({
  emoji, health, name, animation, animDelay,
  x, y, fontSize, zIndex, onRemove,
}: ItemBadgeProps) {
  const dotColor = healthDotColor(health);
  const filter   = healthFilter(health);
  const scale    = healthScale(health);

  return (
    <button
      title={`${name} — health ${Math.round(health)}% (click to remove)`}
      onClick={onRemove}
      className={`absolute group cursor-pointer select-none ${animation}`}
      style={{
        left:          `${x}%`,
        bottom:        `${100 - y}%`,
        animationDelay:`${animDelay}s`,
        fontSize,
        lineHeight:    1,
        zIndex,
        background:    "none",
        border:        "none",
        padding:       0,
        transform:     `scale(${scale})`,
        transition:    "transform 0.4s ease",
      }}
    >
      {/* Emoji with health-driven filter */}
      <span
        className="block group-hover:opacity-60 transition-opacity"
        style={{ filter, transition: "filter 0.8s ease" }}
      >
        {health <= 0 ? "🪴" : emoji}
      </span>

      {/* Health indicator dot */}
      <span
        className="block mx-auto mt-0.5 rounded-full"
        style={{
          width: 5, height: 5,
          background: dotColor,
          boxShadow: `0 0 4px ${dotColor}`,
          transition: "background 0.6s ease, box-shadow 0.6s ease",
        }}
      />

      {/* Hover remove hint */}
      <span
        className="absolute -top-6 left-1/2 -translate-x-1/2 text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none"
        style={{
          fontSize: "9px",
          background: "rgba(239,68,68,0.85)",
          fontWeight: 600,
        }}
      >
        ✕ remove
      </span>
    </button>
  );
}

export default function TerrariumView({
  plants, organisms, environment, onRemovePlant, onRemoveOrganism,
}: Props) {
  const { lighting, humidity, temperature, moldRisk } = environment;

  // Background gradient driven by lighting intensity
  const bgGradient = useMemo(() => {
    const l = lighting / 100;
    return `linear-gradient(180deg,
      hsl(130, ${30 + l * 40}%, ${8 + l * 12}%) 0%,
      hsl(120, ${25 + l * 35}%, ${12 + l * 15}%) 50%,
      hsl(100, ${40 + l * 20}%, ${10 + l * 8}%) 100%)`;
  }, [lighting]);

  // Outer glow driven by lighting
  const lightGlow = useMemo(() => {
    const i = lighting / 100;
    return `0 0 ${40 + i * 80}px ${i * 18}px rgba(100,220,100,${0.04 + i * 0.14})`;
  }, [lighting]);

  // Mist opacity driven by humidity (starts appearing > 40%)
  const mistOpacity = useMemo(() => Math.max(0, (humidity - 40) / 60), [humidity]);

  // Mold tint when mold risk is high
  const moldTint = useMemo(() => Math.max(0, (moldRisk - 40) / 60), [moldRisk]);

  return (
    <div className="relative w-full max-w-3xl" style={{ aspectRatio: "4/3" }}>
      <div
        className="relative w-full h-full rounded-3xl overflow-hidden"
        style={{
          background: bgGradient,
          boxShadow: `${lightGlow}, inset 0 0 60px rgba(0,0,0,0.5), 0 20px 60px rgba(0,0,0,0.6)`,
          border: "1.5px solid rgba(255,255,255,0.12)",
          transition: "background 0.8s ease, box-shadow 0.8s ease",
        }}
      >
        {/* Glass reflection */}
        <div
          className="absolute inset-0 pointer-events-none rounded-3xl"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 40%, rgba(255,255,255,0.03) 100%)",
          }}
        />

        {/* Top panel shine */}
        <div
          className="absolute top-0 left-0 right-0 h-16 pointer-events-none rounded-t-3xl"
          style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.09) 0%, transparent 100%)" }}
        />

        {/* Directional light beam from above */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
          style={{
            width: `${20 + lighting * 0.8}%`,
            height: "70%",
            background: `radial-gradient(ellipse at 50% 0%, rgba(60,160,80,${0.05 + (lighting / 100) * 0.2}) 0%, transparent 80%)`,
            transition: "all 0.8s ease",
          }}
        />

        {/* Mold tint overlay */}
        {moldTint > 0 && (
          <div
            className="absolute inset-0 pointer-events-none rounded-3xl"
            style={{
              background: `radial-gradient(ellipse at 50% 90%, rgba(100,200,80,${moldTint * 0.18}) 0%, transparent 70%)`,
              transition: "opacity 1s ease",
            }}
          />
        )}

        {/* Humidity mist layers */}
        {mistOpacity > 0 && (
          <>
            <div
              className="absolute inset-0 pointer-events-none animate-mist rounded-3xl"
              style={{
                background: `radial-gradient(ellipse at 30% 80%, rgba(180,220,255,${mistOpacity * 0.3}) 0%, transparent 60%)`,
              }}
            />
            <div
              className="absolute inset-0 pointer-events-none animate-mist rounded-3xl"
              style={{
                background: `radial-gradient(ellipse at 70% 90%, rgba(180,220,255,${mistOpacity * 0.22}) 0%, transparent 50%)`,
                animationDelay: "2.5s",
              }}
            />
          </>
        )}

        {/* Ground layer */}
        <div
          className="absolute bottom-0 left-0 right-0 rounded-b-3xl"
          style={{
            height: "25%",
            background:
              "linear-gradient(180deg, transparent 0%, rgba(60,40,20,0.6) 40%, rgba(40,25,10,0.85) 100%)",
          }}
        />
        {/* Substrate */}
        <div
          className="absolute bottom-0 left-0 right-0 rounded-b-3xl"
          style={{
            height: "14%",
            background: "linear-gradient(180deg, rgba(55,35,15,0.7) 0%, rgba(35,20,8,0.95) 100%)",
            borderTop: "1px solid rgba(90,60,30,0.4)",
          }}
        />

        {/* Decorative background foliage */}
        {[
          { emoji: "🌿", bottom: "22%", left: "3%",  opacity: 0.2,  blur: 2, fontSize: "4rem" },
          { emoji: "🌱", bottom: "24%", right: "4%", opacity: 0.15, blur: 2, fontSize: "3rem" },
          { emoji: "🍃", bottom: "28%", left: "12%", opacity: 0.12, blur: 3, fontSize: "2.5rem" },
        ].map((d) => (
          <div
            key={d.emoji + d.left}
            className="absolute pointer-events-none select-none"
            style={{
              bottom: d.bottom,
              left:   ("left"  in d) ? d.left  : undefined,
              right:  ("right" in d) ? d.right : undefined,
              opacity: d.opacity,
              filter: `blur(${d.blur}px)`,
              fontSize: d.fontSize,
            }}
          >
            {d.emoji}
          </div>
        ))}

        {/* Plants */}
        {plants.map((plant) => (
          <TerrariumItem
            key={plant.id}
            emoji={plant.emoji}
            health={plant.health}
            name={plant.species}
            animation={plantAnimation()}
            animDelay={plant.animDelay}
            x={plant.x}
            y={plant.y}
            fontSize={plant.species === "Fern" ? "2.5rem" : "2rem"}
            zIndex={10}
            onRemove={() => onRemovePlant(plant.id)}
          />
        ))}

        {/* Organisms */}
        {organisms.map((org) => (
          <TerrariumItem
            key={org.id}
            emoji={org.emoji}
            health={org.health}
            name={org.species}
            animation={orgAnimation(org.species)}
            animDelay={org.animDelay}
            x={org.x}
            y={org.y}
            fontSize="1.5rem"
            zIndex={15}
            onRemove={() => onRemoveOrganism(org.id)}
          />
        ))}

        {/* HUD — Temperature */}
        <div className="absolute top-3 right-4 flex items-center gap-1.5 pointer-events-none">
          <span className="text-sm">{temperature < 15 ? "🧊" : temperature > 28 ? "🔥" : "🌡️"}</span>
          <span
            className="text-xs font-mono font-semibold px-2 py-1 rounded-lg"
            style={{
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(255,255,255,0.08)",
              color:
                temperature < 15 ? "#60c8ff" :
                temperature > 28 ? "#ff7040" : "#a8e6a0",
            }}
          >
            {temperature}°C
          </span>
        </div>

        {/* HUD — Humidity */}
        <div className="absolute top-3 left-4 flex items-center gap-1.5 pointer-events-none">
          <span className="text-sm">💧</span>
          <span
            className="text-xs font-mono font-semibold px-2 py-1 rounded-lg"
            style={{
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#7ec8e3",
            }}
          >
            {humidity}%
          </span>
        </div>

        {/* Mold risk warning badge */}
        {moldRisk > 40 && (
          <div
            className="absolute bottom-16 right-4 pointer-events-none flex items-center gap-1"
            style={{ animation: moldRisk > 70 ? "pulse 1s infinite" : undefined }}
          >
            <span
              className="text-xs font-semibold px-2 py-1 rounded-lg"
              style={{
                background: moldRisk > 70 ? "rgba(168,85,247,0.25)" : "rgba(168,85,247,0.12)",
                color: moldRisk > 70 ? "#e879f9" : "#c084fc",
                border: `1px solid ${moldRisk > 70 ? "rgba(232,121,249,0.4)" : "rgba(192,132,252,0.2)"}`,
              }}
            >
              🍄 Mold {Math.round(moldRisk)}%
            </span>
          </div>
        )}

        {/* Empty state hint */}
        {plants.length === 0 && organisms.length === 0 && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
            style={{ paddingBottom: "20%" }}
          >
            <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.3)" }}>
              Your terrarium is empty
            </p>
            <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.18)" }}>
              Add plants &amp; organisms from the shop →
            </p>
          </div>
        )}

        {/* Inner edge highlights (glass effect) */}
        <div
          className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{
            boxShadow:
              "inset 1px 1px 0 rgba(255,255,255,0.12), inset -1px -1px 0 rgba(0,0,0,0.2)",
          }}
        />
      </div>

      {/* Label */}
      <p
        className="text-center mt-3 text-sm font-semibold uppercase"
        style={{ color: "rgba(255,255,255,0.3)", letterSpacing: "0.2em" }}
      >
        Terrarium View
      </p>
    </div>
  );
}
