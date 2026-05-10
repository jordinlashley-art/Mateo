"use client";

import { useMemo } from "react";
import { TerrariumState, TerrariumItem, EcosystemDisplayData } from "./TerrariumApp";

type Props = {
  state: TerrariumState;
  ecosystemData: EcosystemDisplayData;
  onRemoveItem: (id: string) => void;
};

function getItemAnimation(item: TerrariumItem): string {
  if (item.type === "plant") return "animate-sway";
  if (item.name === "Isopod") return "animate-crawl";
  return "animate-hop";
}

function getLightingColor(lighting: number): string {
  if (lighting < 20) return "rgba(20, 40, 20, 0.85)";
  if (lighting < 50) return "rgba(30, 80, 40, 0.75)";
  if (lighting < 80) return "rgba(60, 160, 80, 0.55)";
  return "rgba(120, 220, 120, 0.35)";
}

function getHumidityMist(humidity: number): number {
  return Math.max(0, (humidity - 40) / 60);
}

/** Map a 0–100 health value to a status color */
function healthColor(health: number): string {
  if (health > 60) return "#4ade80";
  if (health > 30) return "#facc15";
  return "#ef4444";
}

/** Ecosystem health → arc color */
function ecoHealthColor(score: number): string {
  if (score > 60) return "#4ade80";
  if (score > 30) return "#facc15";
  return "#ef4444";
}

export default function TerrariumView({ state, ecosystemData, onRemoveItem }: Props) {
  const { lighting, humidity, temperature, items } = state;
  const { ecosystemHealth } = ecosystemData;

  const lightGlow = useMemo(() => {
    const intensity = lighting / 100;
    return `0 0 ${40 + intensity * 80}px ${intensity * 20}px rgba(100, 220, 100, ${0.05 + intensity * 0.15})`;
  }, [lighting]);

  const bgGradient = useMemo(() => {
    const l = lighting / 100;
    const topColor = `hsl(130, ${30 + l * 40}%, ${8 + l * 12}%)`;
    const midColor = `hsl(120, ${25 + l * 35}%, ${12 + l * 15}%)`;
    const bottomColor = `hsl(100, ${40 + l * 20}%, ${10 + l * 8}%)`;
    return `linear-gradient(180deg, ${topColor} 0%, ${midColor} 50%, ${bottomColor} 100%)`;
  }, [lighting]);

  const mistOpacity = useMemo(() => getHumidityMist(humidity), [humidity]);
  const lightColor = useMemo(() => getLightingColor(lighting), [lighting]);

  const plants = items.filter((i) => i.type === "plant");
  const organisms = items.filter((i) => i.type === "organism");

  return (
    <div className="relative w-full max-w-3xl" style={{ aspectRatio: "4/3" }}>
      {/* Outer frame — styled glass terrarium */}
      <div
        className="relative w-full h-full rounded-3xl overflow-hidden"
        style={{
          background: bgGradient,
          boxShadow: `${lightGlow}, inset 0 0 60px rgba(0,0,0,0.5), 0 20px 60px rgba(0,0,0,0.6)`,
          border: "1.5px solid rgba(255,255,255,0.12)",
          transition: "background 0.8s ease, box-shadow 0.8s ease",
        }}
      >
        {/* Glass reflection overlay */}
        <div
          className="absolute inset-0 pointer-events-none rounded-3xl"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 40%, rgba(255,255,255,0.03) 100%)",
          }}
        />

        {/* Top glass panel shine */}
        <div
          className="absolute top-0 left-0 right-0 h-16 pointer-events-none rounded-t-3xl"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.1) 0%, transparent 100%)",
          }}
        />

        {/* Lighting beam from top */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
          style={{
            width: `${20 + lighting * 0.8}%`,
            height: "70%",
            background: `radial-gradient(ellipse at 50% 0%, ${lightColor} 0%, transparent 80%)`,
            transition: "all 0.8s ease",
          }}
        />

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
                background: `radial-gradient(ellipse at 70% 90%, rgba(180,220,255,${mistOpacity * 0.25}) 0%, transparent 50%)`,
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

        {/* Substrate / soil texture */}
        <div
          className="absolute bottom-0 left-0 right-0 rounded-b-3xl"
          style={{
            height: "14%",
            background:
              "linear-gradient(180deg, rgba(55,35,15,0.7) 0%, rgba(35,20,8,0.95) 100%)",
            borderTop: "1px solid rgba(90,60,30,0.4)",
          }}
        />

        {/* Background foliage decoration */}
        <div
          className="absolute pointer-events-none select-none text-6xl"
          style={{ bottom: "22%", left: "3%", opacity: 0.25, filter: "blur(2px)" }}
        >
          🌿
        </div>
        <div
          className="absolute pointer-events-none select-none text-5xl"
          style={{ bottom: "24%", right: "4%", opacity: 0.2, filter: "blur(2px)" }}
        >
          🌱
        </div>
        <div
          className="absolute pointer-events-none select-none text-4xl"
          style={{ bottom: "28%", left: "12%", opacity: 0.15, filter: "blur(3px)" }}
        >
          🍃
        </div>

        {/* Plants */}
        {plants.map((item) => (
          <EntityButton
            key={item.id}
            item={item}
            onRemove={onRemoveItem}
            lighting={lighting}
            fontSize={item.name === "Fern" ? "2.5rem" : "2rem"}
            zIndex={10}
          />
        ))}

        {/* Organisms */}
        {organisms.map((item) => (
          <EntityButton
            key={item.id}
            item={item}
            onRemove={onRemoveItem}
            lighting={lighting}
            fontSize="1.5rem"
            zIndex={15}
          />
        ))}

        {/* Temperature display inside terrarium */}
        <div className="absolute top-3 right-4 flex items-center gap-1.5 pointer-events-none">
          <span
            className="text-xs font-mono font-semibold px-2 py-1 rounded-lg"
            style={{
              background: "rgba(0,0,0,0.35)",
              color:
                temperature < 15
                  ? "#60c8ff"
                  : temperature > 28
                  ? "#ff7040"
                  : "#a8e6a0",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {temperature}°C
          </span>
          <span className="text-sm">
            {temperature < 15 ? "🧊" : temperature > 28 ? "🔥" : "🌡️"}
          </span>
        </div>

        {/* Humidity display */}
        <div className="absolute top-3 left-4 flex items-center gap-1.5 pointer-events-none">
          <span className="text-sm">💧</span>
          <span
            className="text-xs font-mono font-semibold px-2 py-1 rounded-lg"
            style={{
              background: "rgba(0,0,0,0.35)",
              color: "#7ec8e3",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {humidity}%
          </span>
        </div>

        {/* Ecosystem Health badge — bottom center of terrarium */}
        {items.length > 0 && (
          <div
            className="absolute bottom-[16%] left-1/2 -translate-x-1/2 pointer-events-none"
            style={{ zIndex: 20 }}
          >
            <div
              className="flex items-center gap-1.5 px-3 py-1 rounded-full"
              style={{
                background: "rgba(0,0,0,0.5)",
                border: `1px solid ${ecoHealthColor(ecosystemHealth)}40`,
                backdropFilter: "blur(8px)",
              }}
            >
              <span className="text-xs">🌍</span>
              <span
                className="text-xs font-bold font-mono"
                style={{ color: ecoHealthColor(ecosystemHealth) }}
              >
                {Math.round(ecosystemHealth)}
              </span>
              {/* Mini health bar */}
              <div
                style={{
                  width: 40,
                  height: 3,
                  borderRadius: 9999,
                  background: "rgba(255,255,255,0.1)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${ecosystemHealth}%`,
                    height: "100%",
                    background: ecoHealthColor(ecosystemHealth),
                    borderRadius: 9999,
                    transition: "width 0.8s ease, background 0.8s ease",
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Empty state hint */}
        {items.length === 0 && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
            style={{ paddingBottom: "20%" }}
          >
            <p
              className="text-sm font-medium text-center"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              Your terrarium is empty
            </p>
            <p
              className="text-xs mt-1 text-center"
              style={{ color: "rgba(255,255,255,0.18)" }}
            >
              Add plants &amp; organisms from the shop →
            </p>
          </div>
        )}

        {/* Glass edge highlights */}
        <div
          className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{
            boxShadow:
              "inset 1px 1px 0 rgba(255,255,255,0.12), inset -1px -1px 0 rgba(0,0,0,0.2)",
          }}
        />
      </div>

      {/* Title label below */}
      <p
        className="text-center mt-3 text-sm font-semibold tracking-widest uppercase"
        style={{ color: "rgba(255,255,255,0.35)", letterSpacing: "0.2em" }}
      >
        Terrarium View
      </p>
    </div>
  );
}

// ─── Entity button with health indicator ─────────────────────────────────────

function EntityButton({
  item,
  onRemove,
  lighting,
  fontSize,
  zIndex,
}: {
  item: TerrariumItem;
  onRemove: (id: string) => void;
  lighting: number;
  fontSize: string;
  zIndex: number;
}) {
  const isDead = item.health <= 0;
  const isDistressed = item.health <= 30;
  const hColor = healthColor(item.health);

  const brightnessFilter = item.type === "plant"
    ? `brightness(${0.6 + lighting / 150}) grayscale(${isDead ? 1 : isDistressed ? 0.5 : 0})`
    : `grayscale(${isDead ? 1 : isDistressed ? 0.4 : 0})`;

  return (
    <button
      title={`${item.name} — health ${Math.round(item.health)}% · Click to remove`}
      onClick={() => onRemove(item.id)}
      className={`absolute select-none cursor-pointer group ${getItemAnimation(item)}`}
      style={{
        left: `${item.x}%`,
        bottom: `${100 - item.y}%`,
        animationDelay: `${item.delay}s`,
        fontSize,
        lineHeight: 1,
        filter: brightnessFilter,
        opacity: isDead ? 0.3 : 1,
        transition: "filter 0.8s ease, opacity 0.8s ease",
        zIndex,
        background: "none",
        border: "none",
        padding: 0,
      }}
    >
      <span className="group-hover:opacity-60 transition-opacity">
        {item.emoji}
      </span>

      {/* Health indicator bar */}
      <div
        style={{
          position: "absolute",
          bottom: "-6px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "26px",
          height: "3px",
          borderRadius: 9999,
          background: "rgba(0,0,0,0.4)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${item.health}%`,
            height: "100%",
            background: hColor,
            borderRadius: 9999,
            transition: "width 0.8s ease, background 0.8s ease",
          }}
        />
      </div>

      {/* Remove tooltip */}
      <span
        className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs bg-red-500/80 text-white px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none"
        style={{ fontSize: "10px" }}
      >
        ✕ remove
      </span>
    </button>
  );
}
