import { useState } from "react";
import { useDRS } from "../store";
import { Play, Pause, Square, MapPin, Save, Route, Check, Trash2 } from "lucide-react";
import { cn } from "../lib/utils";

export function MissionPlanner() {
  const {
    selectedDrone,
    selectedDroneId,
    waypoints,
    isPlacingWaypoint,
    setIsPlacingWaypoint,
    removeWaypoint,
    executeMissionPath,
    totalWaypointDistanceKm,
    updateDroneTelemetry,
  } = useDRS();

  const [missionStatus, setMissionStatus] = useState<"idle" | "running" | "paused">("idle");
  const [savedToast, setSavedToast] = useState(false);

  const handleStartMission = () => {
    if (!selectedDroneId || waypoints.length === 0) return;
    setMissionStatus("running");
    executeMissionPath(selectedDroneId);
  };

  const handlePauseMission = () => {
    setMissionStatus("paused");
    if (selectedDroneId) {
      updateDroneTelemetry(selectedDroneId, {
        flightMode: "Hover",
      });
    }
  };

  const handleAbortMission = () => {
    setMissionStatus("idle");
    if (selectedDroneId) {
      updateDroneTelemetry(selectedDroneId, {
        missionActive: false,
        flightMode: "Return to Home",
      });
    }
  };

  const handleSaveMission = () => {
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  return (
    <div className="flex flex-col gap-6 w-full h-full text-zinc-200">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-bold tracking-widest text-white uppercase">Autonomous Mission Control</h2>
        <p className="text-xs text-zinc-400">Configure and deploy automated flight paths.</p>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Route className="w-5 h-5 text-cyan-500" />
            <span className="font-bold tracking-wide text-sm">Mission Corridor</span>
          </div>
          <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/30">
            {waypoints.length} WAYPOINTS
          </span>
        </div>
        
        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto custom-scrollbar">
          {waypoints.length === 0 ? (
            <div className="text-xs text-zinc-500 p-2 text-center">
              No waypoints set. Tap &apos;+ Add Waypoint&apos; or click directly on map.
            </div>
          ) : (
            waypoints.map((wp) => (
              <div key={wp.id} className="flex items-center gap-3 text-xs bg-zinc-800/50 p-2 rounded border border-zinc-700/50 group">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-zinc-300 font-mono font-bold truncate">WP-{String(wp.index).padStart(2, "0")}: {wp.name}</span>
                <span className="ml-auto font-mono text-zinc-500 text-[11px] shrink-0">
                  {wp.coordinates.lat.toFixed(4)}, {wp.coordinates.lng.toFixed(4)}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeWaypoint(wp.id);
                  }}
                  className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Delete waypoint"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}

          <div
            onClick={() => setIsPlacingWaypoint(!isPlacingWaypoint)}
            className={`flex items-center gap-3 text-xs p-2 rounded border border-dashed cursor-pointer transition-colors ${
              isPlacingWaypoint
                ? "bg-amber-500/20 text-amber-300 border-amber-500/60 animate-pulse"
                : "bg-zinc-800/30 border-zinc-700/50 text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
            }`}
          >
            <div className="w-4 h-4 rounded-full border-2 border-current flex items-center justify-center font-bold text-[8px]">+</div>
            <span className="font-medium">
              {isPlacingWaypoint ? "Click Anywhere on Map to Add" : "Add Waypoint (Click on Map)"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-2">
           <div className="flex flex-col gap-1">
             <label className="text-[10px] uppercase tracking-widest text-zinc-500">Route Corridor Distance</label>
             <div className="bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-sm font-mono text-cyan-400">
               {totalWaypointDistanceKm} km
             </div>
           </div>
           <div className="flex flex-col gap-1">
             <label className="text-[10px] uppercase tracking-widest text-zinc-500">Active Drone</label>
             <div className="bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-sm font-mono text-zinc-200 truncate">
               {selectedDrone?.name || "None Selected"}
             </div>
           </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 mt-auto pt-4 border-t border-zinc-800">
        <button
          onClick={handleStartMission}
          disabled={waypoints.length === 0 || !selectedDroneId || missionStatus === "running"}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded transition-colors font-bold tracking-widest uppercase text-xs border ${
            missionStatus === "running"
              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/60 animate-pulse"
              : waypoints.length === 0
              ? "bg-zinc-900 text-zinc-600 border-zinc-800 cursor-not-allowed"
              : "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
          }`}
        >
          <Play className="w-4 h-4" />
          <span>{missionStatus === "running" ? "PATROLLING CORRIDOR" : "Start Mission"}</span>
        </button>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handlePauseMission}
            disabled={missionStatus !== "running"}
            className="flex items-center justify-center gap-2 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/50 disabled:opacity-40 rounded transition-colors text-amber-400 font-bold tracking-widest uppercase text-xs"
          >
            <Pause className="w-4 h-4" /> Pause
          </button>
          <button
            onClick={handleAbortMission}
            disabled={missionStatus === "idle"}
            className="flex items-center justify-center gap-2 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/50 disabled:opacity-40 rounded transition-colors text-rose-400 font-bold tracking-widest uppercase text-xs"
          >
            <Square className="w-4 h-4" /> Abort
          </button>
        </div>
        <button
          onClick={handleSaveMission}
          className="w-full mt-2 flex items-center justify-center gap-2 py-2 bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700 rounded transition-colors text-zinc-300 font-bold tracking-widest uppercase text-xs"
        >
          {savedToast ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400">Mission Plan Saved</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Mission</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
