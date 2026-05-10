"use client";

import { useMemo } from "react";
import { TerrariumState, TerrariumItem } from "./TerrariumApp";

type Props = {
  state: TerrariumState;
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

export default function TerrariumView({ state, onRemoveItem }: Props) {
  const { lighting, humidity, temperature, items } = state;

  const lightGlow = useMemo(() => {
    const intensity = lighting / 100;
    return `0 0 ${60 + intensity * 100}px ${intensity * 25}px rgba(100, 220, 100, ${0.04 + intensity * 0.18}), 0 0 ${20 + intensity * 40}px rgba(74, 222, 128, ${intensity * 0.1})`;
  }, [lighting]);

  const bgGradient = useMemo(() => {
    const l = lighting / 100;
    const topColor = `hsl(130, ${30 + l * 40}%, ${8 + l * 14}%)`;
    const midColor = `hsl(120, ${25 + l * 35}%, ${12 + l * 16}%)`;
    const bottomColor = `hsl(100, ${40 + l * 20}%, ${10 + l * 9}%)`;
    return `linear-gradient(180deg, ${topColor} 0%, ${midColor} 55%, ${bottomColor} 100%)`;
  }, [lighting]);

  const mistOpacity = useMemo(() => getHumidityMist(humidity), [humidity]);
  const lightColor = useMemo(() => getLightingColor(lighting), [lighting]);

  const plants = items.filter((i) => i.type === "plant");
  const organisms = items.filter((i) => i.type === "organism");

  const lightLabel =
    lighting < 20 ? "Dark" : lighting < 50 ? "Dim" : lighting < 80 ? "Bright" : "Full";

  return (
    <div className="relative w-full max-w-3xl flex flex-col items-center gap-3">
      {/* Header badge */}
      <div className="flex items-center gap-3 self-start px-1">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full animate-pulse-glow"
            style={{ background: "#4ade80", boxShadow: "0 0 6px #4ade80" }}
          />
          <span
            className="text-xs font-bold uppercase tracking-[0.2em]"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            Terrarium View
          </span>
        </div>
        <div
          className="h-px flex-1"
          style={{
            background:
              "linear-gradient(to right, rgba(74,222,128,0.3), transparent)",
            minWidth: 60,
          }}
        />
        {/* Live stats row */}
        <div className="flex items-center gap-2">
          <StatChip
            icon="🌿"
            value={`${plants.length + organisms.length} species`}
          />
          <StatChip
            icon={lighting < 30 ? "🌑" : lighting < 70 ? "🌤" : "☀️"}
            value={lightLabel}
          />
        </div>
      </div>

      {/* Main terrarium container — glass frame */}
      <div
        className="relative w-full"
        style={{ aspectRatio: "4/3" }}
      >
        {/* Outer decorative frame (glow ring) */}
        <div
          className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{
            boxShadow: lightGlow,
            transition: "box-shadow 0.8s ease",
          }}
        />

        {/* Terrarium inner body */}
        <div
          className="relative w-full h-full rounded-3xl overflow-hidden"
          style={{
            background: bgGradient,
            boxShadow: `inset 0 0 80px rgba(0,0,0,0.55), 0 24px 80px rgba(0,0,0,0.7)`,
            border: "1.5px solid rgba(255,255,255,0.1)",
            transition: "background 0.8s ease",
          }}
        >
          {/* Glass reflection — diagonal sheen */}
          <div
            className="absolute inset-0 pointer-events-none rounded-3xl"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.09) 0%, transparent 38%, rgba(255,255,255,0.025) 100%)",
            }}
          />

          {/* Top glass panel shine */}
          <div
            className="absolute top-0 left-0 right-0 h-20 pointer-events-none rounded-t-3xl"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 100%)",
            }}
          />

          {/* Right-edge glass reflection */}
          <div
            className="absolute top-0 right-0 bottom-0 w-8 pointer-events-none rounded-r-3xl"
            style={{
              background:
                "linear-gradient(to left, rgba(255,255,255,0.06) 0%, transparent 100%)",
            }}
          />

          {/* Lighting beam from top */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
            style={{
              width: `${20 + lighting * 0.8}%`,
              height: "72%",
              background: `radial-gradient(ellipse at 50% 0%, ${lightColor} 0%, transparent 80%)`,
              transition: "all 0.8s ease",
            }}
          />

          {/* Secondary ambient fill light */}
          {lighting > 40 && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(ellipse at 50% 30%, rgba(100,200,100,${(lighting - 40) / 200}) 0%, transparent 65%)`,
                transition: "background 0.8s ease",
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
                  background: `radial-gradient(ellipse at 70% 90%, rgba(180,220,255,${mistOpacity * 0.25}) 0%, transparent 50%)`,
                  animationDelay: "2.5s",
                }}
              />
              {/* Fine mist particles */}
              <div
                className="absolute inset-0 pointer-events-none animate-mist"
                style={{
                  background: `radial-gradient(ellipse at 50% 100%, rgba(200,230,255,${mistOpacity * 0.2}) 0%, transparent 40%)`,
                  animationDelay: "1.2s",
                }}
              />
            </>
          )}

          {/* Ground layer — earth gradient */}
          <div
            className="absolute bottom-0 left-0 right-0 rounded-b-3xl"
            style={{
              height: "25%",
              background:
                "linear-gradient(180deg, transparent 0%, rgba(55,38,18,0.65) 40%, rgba(38,24,10,0.9) 100%)",
            }}
          />

          {/* Substrate / soil surface */}
          <div
            className="absolute bottom-0 left-0 right-0 rounded-b-3xl"
            style={{
              height: "14%",
              background:
                "linear-gradient(180deg, rgba(60,38,16,0.72) 0%, rgba(32,18,6,0.97) 100%)",
              borderTop: "1px solid rgba(100,68,32,0.45)",
            }}
          />

          {/* Substrate texture dots */}
          <div
            className="absolute bottom-0 left-0 right-0 pointer-events-none"
            style={{
              height: "10%",
              backgroundImage:
                "radial-gradient(circle, rgba(80,52,22,0.6) 1px, transparent 1px)",
              backgroundSize: "14px 8px",
              opacity: 0.5,
            }}
          />

          {/* Background foliage decoration */}
          <div
            className="absolute pointer-events-none select-none text-6xl"
            style={{ bottom: "22%", left: "3%", opacity: 0.22, filter: "blur(2.5px)" }}
          >
            🌿
          </div>
          <div
            className="absolute pointer-events-none select-none text-5xl"
            style={{ bottom: "24%", right: "4%", opacity: 0.18, filter: "blur(2.5px)" }}
          >
            🌱
          </div>
          <div
            className="absolute pointer-events-none select-none text-4xl"
            style={{ bottom: "28%", left: "12%", opacity: 0.12, filter: "blur(3px)" }}
          >
            🍃
          </div>
          <div
            className="absolute pointer-events-none select-none text-3xl"
            style={{ bottom: "26%", right: "14%", opacity: 0.1, filter: "blur(3px)" }}
          >
            🌱
          </div>

          {/* Plants */}
          {plants.map((item) => (
            <button
              key={item.id}
              title={`Remove ${item.name}`}
              onClick={() => onRemoveItem(item.id)}
              className={`absolute select-none cursor-pointer group ${getItemAnimation(item)} animate-fade-in`}
              style={{
                left: `${item.x}%`,
                bottom: `${100 - item.y}%`,
                animationDelay: `${item.delay}s`,
                fontSize: item.name === "Fern" ? "2.5rem" : "2rem",
                lineHeight: 1,
                filter: `brightness(${0.55 + lighting / 140}) drop-shadow(0 0 4px rgba(0,180,0,${0.1 + lighting / 300}))`,
                transition: "filter 0.8s ease",
                zIndex: 10,
                background: "none",
                border: "none",
                padding: 0,
              }}
            >
              <span className="group-hover:opacity-60 transition-opacity block">
                {item.emoji}
              </span>
              <span
                className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs bg-red-500/80 text-white px-1.5 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none"
                style={{ fontSize: "10px" }}
              >
                ✕ remove
              </span>
            </button>
          ))}

          {/* Organisms */}
          {organisms.map((item) => (
            <button
              key={item.id}
              title={`Remove ${item.name}`}
              onClick={() => onRemoveItem(item.id)}
              className={`absolute select-none cursor-pointer group ${getItemAnimation(item)} animate-fade-in`}
              style={{
                left: `${item.x}%`,
                bottom: `${100 - item.y}%`,
                animationDelay: `${item.delay}s`,
                fontSize: "1.5rem",
                lineHeight: 1,
                zIndex: 15,
                background: "none",
                border: "none",
                padding: 0,
              }}
            >
              <span className="group-hover:opacity-60 transition-opacity block">
                {item.emoji}
              </span>
              <span
                className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs bg-red-500/80 text-white px-1.5 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none"
                style={{ fontSize: "10px" }}
              >
                ✕ remove
              </span>
            </button>
          ))}

          {/* Temperature display — top right */}
          <div className="absolute top-3 right-4 flex items-center gap-1.5 pointer-events-none">
            <span
              className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg"
              style={{
                background: "rgba(0,0,0,0.4)",
                backdropFilter: "blur(8px)",
                color:
                  temperature < 15
                    ? "#60c8ff"
                    : temperature > 28
                    ? "#ff7040"
                    : "#a8e6a0",
                border: `1px solid ${
                  temperature < 15
                    ? "rgba(96,200,255,0.2)"
                    : temperature > 28
                    ? "rgba(255,112,64,0.2)"
                    : "rgba(168,230,160,0.2)"
                }`,
              }}
            >
              {temperature}°C
            </span>
            <span className="text-sm">
              {temperature < 15 ? "🧊" : temperature > 28 ? "🔥" : "🌡️"}
            </span>
          </div>

          {/* Humidity display — top left */}
          <div className="absolute top-3 left-4 flex items-center gap-1.5 pointer-events-none">
            <span className="text-sm">💧</span>
            <span
              className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg"
              style={{
                background: "rgba(0,0,0,0.4)",
                backdropFilter: "blur(8px)",
                color: "#7ec8e3",
                border: "1px solid rgba(126,200,227,0.2)",
              }}
            >
              {humidity}%
            </span>
          </div>

          {/* Empty state hint */}
          {items.length === 0 && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
              style={{ paddingBottom: "20%" }}
            >
              <span className="text-4xl mb-3 opacity-20">🪴</span>
              <p
                className="text-sm font-medium text-center"
                style={{ color: "rgba(255,255,255,0.28)" }}
              >
                Your terrarium is empty
              </p>
              <p
                className="text-xs mt-1 text-center"
                style={{ color: "rgba(255,255,255,0.16)" }}
              >
                Add plants &amp; organisms from the shop →
              </p>
            </div>
          )}

          {/* Glass edge inset highlights */}
          <div
            className="absolute inset-0 rounded-3xl pointer-events-none"
            style={{
              boxShadow:
                "inset 1.5px 1.5px 0 rgba(255,255,255,0.1), inset -1px -1px 0 rgba(0,0,0,0.25), inset 0 0 40px rgba(0,0,0,0.2)",
            }}
          />

          {/* Subtle corner rivets / frame decoration */}
          {(["tl", "tr", "bl", "br"] as const).map((pos) => (
            <div
              key={pos}
              className="absolute w-3 h-3 pointer-events-none"
              style={{
                top: pos.startsWith("t") ? 10 : undefined,
                bottom: pos.startsWith("b") ? 10 : undefined,
                left: pos.endsWith("l") ? 10 : undefined,
                right: pos.endsWith("r") ? 10 : undefined,
                borderTop: pos.startsWith("t") ? "1.5px solid rgba(255,255,255,0.2)" : undefined,
                borderBottom: pos.startsWith("b") ? "1.5px solid rgba(255,255,255,0.2)" : undefined,
                borderLeft: pos.endsWith("l") ? "1.5px solid rgba(255,255,255,0.2)" : undefined,
                borderRight: pos.endsWith("r") ? "1.5px solid rgba(255,255,255,0.2)" : undefined,
                borderRadius: pos === "tl" ? "4px 0 0 0" : pos === "tr" ? "0 4px 0 0" : pos === "bl" ? "0 0 0 4px" : "0 0 4px 0",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function StatChip({ icon, value }: { icon: string; value: string }) {
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <span className="text-xs leading-none">{icon}</span>
      <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>
        {value}
      </span>
    </div>
  );
}
