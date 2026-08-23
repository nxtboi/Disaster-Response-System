import React, { useState } from "react";
import { useDRS } from "../store";
import {
  MapPin,
  Plus,
  Trash2,
  Navigation,
  Crosshair,
  Route,
  Play,
  RotateCcw,
  Plane,
  Eye,
  Sliders,
  ChevronDown,
  Layers,
  Sparkles,
  CheckCircle2,
  MoveRight,
  ShieldAlert
} from "lucide-react";
import { TacticalWaypoint, WaypointAction } from "../types";

const WAYPOINT_ACTIONS: WaypointAction[] = [
  "Fly-Through",
  "Hover & Scan",
  "Drop Payload",
  "Reconnaissance",
  "Orbit",
];

const ACTION_COLORS: Record<WaypointAction, { text: string; bg: string; border: string }> = {
  "Fly-Through": { text: "text-cyan-400", bg: "bg-cyan-950/60", border: "border-cyan-500/40" },
  "Hover & Scan": { text: "text-amber-400", bg: "bg-amber-950/60", border: "border-amber-500/40" },
  "Drop Payload": { text: "text-rose-400", bg: "bg-rose-950/60", border: "border-rose-500/40" },
  "Reconnaissance": { text: "text-emerald-400", bg: "bg-emerald-950/60", border: "border-emerald-500/40" },
  "Orbit": { text: "text-purple-400", bg: "bg-purple-950/60", border: "border-purple-500/40" },
};

export function TacticalWaypointsPanel() {
  const {
    waypoints,
    selectedWaypointId,
    setSelectedWaypointId,
    isPlacingWaypoint,
    setIsPlacingWaypoint,
    removeWaypoint,
    updateWaypoint,
    clearWaypoints,
    sendDroneToWaypoint,
    executeMissionPath,
    totalWaypointDistanceKm,
    selectedDrone,
    selectedDroneId,
    drones,
    setCenterMapTarget,
  } = useDRS();

  const [expandedWaypointId, setExpandedWaypointId] = useState<string | null>(null);
  const [missionExecuting, setMissionExecuting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDeleteWaypoint = (id: string, name: string) => {
    removeWaypoint(id);
    setDeleteConfirmId(null);
    showToast(`Deleted ${name}`);
  };

  const handleClearAll = () => {
    clearWaypoints();
    setShowClearConfirm(false);
    showToast("All tactical waypoints deleted");
  };

  const handleExecuteMission = () => {
    if (!selectedDroneId || waypoints.length === 0) return;
    setMissionExecuting(true);
    executeMissionPath(selectedDroneId);
    setTimeout(() => {
      setMissionExecuting(false);
    }, 3000);
  };

  const handleCenterWaypoint = (wp: TacticalWaypoint) => {
    setSelectedWaypointId(wp.id);
    setCenterMapTarget({
      lat: wp.coordinates.lat,
      lng: wp.coordinates.lng,
      zoom: 16,
      timestamp: Date.now(),
    });
  };

  return (
    <div className="flex flex-col gap-4 w-full text-zinc-200">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Route className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold font-mono tracking-wider text-zinc-100 uppercase">
              Tactical Waypoints
            </h3>
            <p className="text-[10px] text-zinc-400 font-mono">
              {waypoints.length} {waypoints.length === 1 ? "Marker" : "Markers"} • {totalWaypointDistanceKm} km corridor
            </p>
          </div>
        </div>

        {waypoints.length > 0 && (
          <div>
            {showClearConfirm ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={handleClearAll}
                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/50 hover:bg-rose-500/30"
                >
                  Confirm Delete All
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded text-zinc-400 hover:text-zinc-200"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="text-[10px] font-mono text-zinc-500 hover:text-rose-400 transition-colors p-1"
                title="Delete all waypoints"
              >
                Clear All
              </button>
            )}
          </div>
        )}
      </div>

      {toastMessage && (
        <div className="bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs font-mono px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-lg animate-fade-in">
          <Trash2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Placement Mode Toggle Button */}
      <button
        onClick={() => setIsPlacingWaypoint(!isPlacingWaypoint)}
        className={`w-full py-2.5 px-3 rounded-lg font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 border shadow-lg ${
          isPlacingWaypoint
            ? "bg-amber-500/20 text-amber-300 border-amber-500/60 animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.3)]"
            : "bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border-cyan-500/40 hover:border-cyan-400"
        }`}
      >
        <MapPin className={`w-4 h-4 ${isPlacingWaypoint ? "animate-bounce" : ""}`} />
        <span>{isPlacingWaypoint ? "CLICK MAP TO PLACE MARKER" : "+ PLACE WAYPOINT ON MAP"}</span>
      </button>

      {isPlacingWaypoint && (
        <div className="bg-amber-950/40 border border-amber-500/40 rounded-lg p-2.5 text-[11px] font-mono text-amber-200 flex items-start gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping mt-1 shrink-0" />
          <div>
            <span className="font-bold">PLACEMENT MODE ACTIVE:</span> Click anywhere on the tactical map or satellite radar to drop a GPS waypoint.
          </div>
        </div>
      )}

      {/* Waypoints List */}
      <div className="flex flex-col gap-2.5 max-h-[380px] overflow-y-auto custom-scrollbar pr-0.5">
        {waypoints.length === 0 ? (
          <div className="p-6 border border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center text-center gap-2 text-zinc-500 bg-zinc-950/40">
            <MapPin className="w-8 h-8 opacity-30 text-cyan-400" />
            <div className="text-xs font-mono text-zinc-400 font-medium">No Tactical Waypoints</div>
            <p className="text-[11px] text-zinc-600 max-w-[200px]">
              Click the button above or tap directly on the map to define tactical waypoint routes.
            </p>
          </div>
        ) : (
          waypoints.map((wp) => {
            const isSelected = selectedWaypointId === wp.id;
            const isExpanded = expandedWaypointId === wp.id;
            const actionStyle = ACTION_COLORS[wp.action] || ACTION_COLORS["Fly-Through"];

            return (
              <div
                key={wp.id}
                className={`rounded-xl border transition-all duration-150 overflow-hidden ${
                  isSelected
                    ? "bg-zinc-900/90 border-cyan-500/60 shadow-[0_0_12px_rgba(6,182,212,0.15)]"
                    : "bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700/80 hover:bg-zinc-900/60"
                }`}
              >
                {/* Main Card Header Row */}
                <div
                  onClick={() => setSelectedWaypointId(wp.id)}
                  className="p-2.5 flex items-center justify-between cursor-pointer gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Index Badge */}
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono font-bold text-[11px] shrink-0 border ${
                        isSelected
                          ? "bg-cyan-500 text-black border-cyan-300 font-extrabold shadow-sm"
                          : "bg-zinc-800 text-zinc-300 border-zinc-700"
                      }`}
                    >
                      {String(wp.index).padStart(2, "0")}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono font-bold text-zinc-200 truncate">
                          {wp.name}
                        </span>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${actionStyle.bg} ${actionStyle.text} ${actionStyle.border}`}
                        >
                          {wp.action}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-zinc-500 flex items-center gap-2 mt-0.5">
                        <span>{wp.coordinates.lat.toFixed(4)}°, {wp.coordinates.lng.toFixed(4)}°</span>
                        <span>•</span>
                        <span className="text-cyan-400">{wp.altitude}m</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {/* Center on Map */}
                    <button
                      onClick={() => handleCenterWaypoint(wp)}
                      className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-cyan-400 transition-colors"
                      title="Focus on Map"
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                    </button>

                    {/* Dispatch Selected Drone */}
                    {selectedDrone && (
                      <button
                        onClick={() => sendDroneToWaypoint(selectedDrone.id, wp.id)}
                        className="p-1.5 rounded-md hover:bg-cyan-500/20 text-zinc-400 hover:text-cyan-300 transition-colors"
                        title={`Fly ${selectedDrone.name} here now`}
                      >
                        <Navigation className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Expand/Collapse config */}
                    <button
                      onClick={() => setExpandedWaypointId(isExpanded ? null : wp.id)}
                      className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform ${
                          isExpanded ? "rotate-180 text-cyan-400" : ""
                        }`}
                      />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDeleteWaypoint(wp.id, wp.name)}
                      className="p-1.5 rounded-md hover:bg-rose-500/20 text-zinc-500 hover:text-rose-400 transition-colors"
                      title="Delete Waypoint"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Expanded Details / Inline Configuration */}
                {isExpanded && (
                  <div className="px-3 pb-3 pt-1 border-t border-zinc-800/60 bg-black/40 space-y-2.5 font-mono text-xs">
                    {/* Name Edit */}
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-zinc-500 mb-1">
                        Waypoint Label
                      </label>
                      <input
                        type="text"
                        value={wp.name}
                        onChange={(e) => updateWaypoint(wp.id, { name: e.target.value })}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    {/* Altitude & Speed Grid */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] uppercase tracking-wider text-zinc-500 mb-1">
                          Altitude (Meters)
                        </label>
                        <input
                          type="number"
                          value={wp.altitude}
                          min={10}
                          max={500}
                          step={10}
                          onChange={(e) =>
                            updateWaypoint(wp.id, { altitude: Number(e.target.value) || 50 })
                          }
                          className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 text-xs text-cyan-400 focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase tracking-wider text-zinc-500 mb-1">
                          Target Speed (km/h)
                        </label>
                        <input
                          type="number"
                          value={wp.speed || 35}
                          min={5}
                          max={120}
                          step={5}
                          onChange={(e) =>
                            updateWaypoint(wp.id, { speed: Number(e.target.value) || 30 })
                          }
                          className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 text-xs text-cyan-400 focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>

                    {/* Tactical Action Dropdown */}
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-zinc-500 mb-1">
                        Tactical Directive
                      </label>
                      <select
                        value={wp.action}
                        onChange={(e) =>
                          updateWaypoint(wp.id, { action: e.target.value as WaypointAction })
                        }
                        className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500"
                      >
                        {WAYPOINT_ACTIONS.map((action) => (
                          <option key={action} value={action}>
                            {action}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Fly Drone Directly Button */}
                    {selectedDrone && (
                      <button
                        onClick={() => sendDroneToWaypoint(selectedDrone.id, wp.id)}
                        className="w-full py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded font-bold border border-cyan-500/40 text-[11px] flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Plane className="w-3.5 h-3.5" />
                        <span>FLY {selectedDrone.name} TO WP-{String(wp.index).padStart(2, "0")}</span>
                      </button>
                    )}

                    {/* Explicit Delete Button */}
                    <button
                      onClick={() => handleDeleteWaypoint(wp.id, wp.name)}
                      className="w-full py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 rounded font-bold border border-rose-500/30 text-[11px] flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>DELETE WAYPOINT WP-{String(wp.index).padStart(2, "0")}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Autonomous Route Execution Footer */}
      {waypoints.length > 0 && (
        <div className="pt-2 border-t border-zinc-800/80 flex flex-col gap-2">
          <button
            onClick={handleExecuteMission}
            disabled={missionExecuting || !selectedDroneId}
            className="w-full py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 rounded-xl font-mono text-xs font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] flex items-center justify-center gap-2"
          >
            {missionExecuting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                <span>UPLOADING MISSION CORRIDOR...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 text-emerald-400 fill-emerald-400/20" />
                <span>EXECUTE WAYPOINT FLIGHT PLAN</span>
              </>
            )}
          </button>

          <div className="text-[10px] font-mono text-zinc-500 text-center">
            Assigned to <span className="text-zinc-300 font-bold">{selectedDrone?.name || "Active Drone"}</span> • {waypoints.length} Stages
          </div>
        </div>
      )}
    </div>
  );
}
