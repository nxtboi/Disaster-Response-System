import { useState } from "react";
import { useDRS } from "../store";
import { TelemetryPanel } from "./TelemetryPanel";
import { BatteryStatus } from "./BatteryStatus";
import { LidarPanel } from "./LidarPanel";
import { AlertPanel } from "./AlertPanel";
import { ReadyToProtect } from "./ReadyToProtect";
import { VoiceFeed } from "./VoiceFeed";
import { MissionPlanner } from "./MissionPlanner";
import { TacticalWaypointsPanel } from "./TacticalWaypointsPanel";
import {
  Activity,
  Route,
  ChevronRight,
  ChevronLeft,
  PanelRightClose,
  PanelRightOpen,
  EyeOff,
  Sliders,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function RightPanel() {
  const { selectedDrone, activeView, isStatusPanelVisible, toggleStatusPanel, setIsStatusPanelVisible } = useDRS();
  const [dashboardTab, setDashboardTab] = useState<"telemetry" | "waypoints">("telemetry");

  // When hidden, render a sleek tab on the edge to re-open
  if (!isStatusPanelVisible) {
    return (
      <div className="absolute right-0 top-1/2 -translate-y-1/2 z-30 pointer-events-auto">
        <button
          onClick={() => setIsStatusPanelVisible(true)}
          className="bg-zinc-950/90 hover:bg-zinc-900 border-l border-t border-b border-cyan-500/50 text-cyan-400 hover:text-cyan-200 px-2 py-3 rounded-l-xl shadow-2xl backdrop-blur-md flex flex-col items-center gap-2 font-mono text-[10px] tracking-wider transition-all hover:pr-3 group"
          title="Open Status & Telemetry Panel (Ctrl/Cmd + B)"
        >
          <PanelRightOpen className="w-4 h-4 group-hover:scale-110 transition-transform" />
          <span className="[writing-mode:vertical-rl] font-bold uppercase tracking-widest text-zinc-300">
            STATUS PANEL
          </span>
        </button>
      </div>
    );
  }

  return (
    <aside className="w-80 shrink-0 border-l border-zinc-800/60 bg-zinc-950/85 backdrop-blur-xl flex flex-col z-20 h-full overflow-y-auto custom-scrollbar relative transition-all duration-200">
      {/* Top Controls Header with Hide Button */}
      <div className="sticky top-0 bg-zinc-950/95 backdrop-blur-md px-4 py-2.5 border-b border-zinc-800/80 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-bold font-mono tracking-wider text-zinc-200 uppercase">
            STATUS & TELEMETRY
          </span>
        </div>

        <button
          onClick={toggleStatusPanel}
          className="flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 text-[11px] font-mono transition-colors"
          title="Hide Status Panel"
        >
          <PanelRightClose className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">HIDE</span>
        </button>
      </div>

      <div className="p-4 flex flex-col gap-4 pb-16 h-full">
        {activeView === "Dashboard" && (
          <>
            {/* Quick Tab Switcher for Telemetry vs Tactical Waypoints */}
            <div className="flex items-center p-1 bg-zinc-900/90 border border-zinc-800 rounded-lg text-xs font-mono">
              <button
                onClick={() => setDashboardTab("telemetry")}
                className={`flex-1 py-1.5 px-2 rounded-md flex items-center justify-center gap-1.5 transition-colors ${
                  dashboardTab === "telemetry"
                    ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>TELEMETRY</span>
              </button>
              <button
                onClick={() => setDashboardTab("waypoints")}
                className={`flex-1 py-1.5 px-2 rounded-md flex items-center justify-center gap-1.5 transition-colors ${
                  dashboardTab === "waypoints"
                    ? "bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Route className="w-3.5 h-3.5 text-amber-400" />
                <span>WAYPOINTS</span>
              </button>
            </div>

            {dashboardTab === "telemetry" ? (
              <>
                <ReadyToProtect />
                {selectedDrone && (
                  <>
                    <BatteryStatus drone={selectedDrone} />
                    <TelemetryPanel drone={selectedDrone} />
                    <LidarPanel />
                    <VoiceFeed />
                  </>
                )}
                <AlertPanel />
              </>
            ) : (
              <TacticalWaypointsPanel />
            )}
          </>
        )}
        
        {activeView === "Waypoints" && (
          <TacticalWaypointsPanel />
        )}

        {activeView === "Missions" && (
          <div className="flex flex-col gap-6">
            <TacticalWaypointsPanel />
            <MissionPlanner />
          </div>
        )}

        {(activeView === "Live Monitoring" || activeView === "Alerts") && (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-4">
             <span className="text-xs tracking-widest uppercase text-center font-mono">
               Select Dashboard for full telemetry & sensors
             </span>
          </div>
        )}
      </div>
    </aside>
  );
}
