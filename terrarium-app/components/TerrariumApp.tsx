"use client";

import { useEcosystemLogic } from "@/hooks/useEcosystemLogic";
import TerrariumView from "./TerrariumView";
import ControlSidebar from "./ControlSidebar";

export default function TerrariumApp() {
  const ecosystem = useEcosystemLogic();
  const { state, timeScale, setTimeScale } = ecosystem;
  const { lighting, humidity } = state.environment;

  return (
    <div
      className="h-screen w-screen flex overflow-hidden relative"
      style={{
        background:
          "radial-gradient(ellipse at 30% 60%, #0d2818 0%, #0a0f0a 50%, #060a06 100%)",
      }}
    >
      {/* Ambient background blobs that react to environment */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div
          className="absolute rounded-full blur-3xl opacity-20"
          style={{
            width: 600, height: 600,
            top: "10%", left: "5%",
            background: `radial-gradient(circle, hsl(${lighting * 1.2 + 40}, 80%, 40%), transparent)`,
            transition: "background 0.6s ease",
          }}
        />
        <div
          className="absolute rounded-full blur-3xl opacity-15"
          style={{
            width: 400, height: 400,
            bottom: "5%", right: "25%",
            background: `radial-gradient(circle, hsl(200, ${humidity}%, 35%), transparent)`,
            transition: "background 0.6s ease",
          }}
        />
      </div>

      {/* Main terrarium view */}
      <main className="flex-1 flex items-center justify-center p-6 min-w-0">
        <TerrariumView
          plants={state.plants}
          organisms={state.organisms}
          environment={state.environment}
          onRemovePlant={ecosystem.removePlant}
          onRemoveOrganism={ecosystem.removeOrganism}
        />
      </main>

      {/* Control sidebar */}
      <aside className="w-80 shrink-0 h-full overflow-y-auto thin-scroll p-4">
        <ControlSidebar
          state={state}
          timeScale={timeScale}
          onSetTimeScale={setTimeScale}
          onSetLighting={ecosystem.setLighting}
          onSetHumidity={ecosystem.setHumidity}
          onSetTemperature={ecosystem.setTemperature}
          onAddPlant={ecosystem.addPlant}
          onAddOrganism={ecosystem.addOrganism}
        />
      </aside>
    </div>
  );
}
