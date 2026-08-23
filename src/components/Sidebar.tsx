import React, { useState } from "react";
import { useDRS } from "../store";
import { cn } from "../lib/utils";
import { 
  Crosshair, Navigation, Video, Activity, Map as MapIcon, 
  Radio, Target, AlertTriangle, Settings, Plus, LayoutDashboard, LogOut, Cpu, Route,
  Trash2, X, ShieldAlert, Sparkles, Check, ChevronRight, Zap, Mic
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ConnectionStatus, Drone } from "../types";

const NAV_ITEMS = [
  { id: "Dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { id: "Live Monitoring", icon: Video, label: "Live Monitoring" },
  { id: "Voice Detection", icon: Mic, label: "AI Voice Detection" },
  { id: "Missions", icon: Target, label: "Autonomous Missions" },
  { id: "Alerts", icon: AlertTriangle, label: "Alerts" },
  { id: "Hardware", icon: Cpu, label: "Hardware Link" },
];

const PRESET_ROLES = [
  {
    role: "Tactical Scout",
    suffix: "Alpha Recon",
    icon: Crosshair,
    flightMode: "Autonomous" as const,
    speed: 38,
    altitude: 110,
    desc: "Rapid area reconnaissance & survivor scan",
  },
  {
    role: "Thermal Survivor Detector",
    suffix: "FLIR Search",
    icon: Activity,
    flightMode: "Autonomous" as const,
    speed: 25,
    altitude: 85,
    desc: "Infrared heat-signature & VAD acoustic sensor",
  },
  {
    role: "Heavy Lift & Payload",
    suffix: "Lifeline Dropper",
    icon: Zap,
    flightMode: "Manual" as const,
    speed: 22,
    altitude: 70,
    desc: "First-aid payload & emergency radio delivery",
  },
  {
    role: "LiDAR 3D Cartographer",
    suffix: "Structure Mapper",
    icon: Route,
    flightMode: "Hover" as const,
    speed: 18,
    altitude: 95,
    desc: "3D structural collapse & wreckage mesh scan",
  },
];

export function Sidebar({ 
  onExit, 
  onOpenAdminPanel 
}: { 
  onExit?: () => void; 
  onOpenAdminPanel?: () => void; 
}) {
  const { 
    drones, 
    selectedDroneId, 
    setSelectedDroneId, 
    activeView, 
    setActiveView,
    addDrone,
    removeDrone,
    userLocation
  } = useDRS();

  // State for Add Drone Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [droneToDelete, setDroneToDelete] = useState<string | null>(null);

  // Form states
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);
  const [customName, setCustomName] = useState("");
  const [customStatus, setCustomStatus] = useState<ConnectionStatus>("Online");
  const [customBattery, setCustomBattery] = useState(100);

  const handleOpenAddModal = () => {
    const nextNum = drones.length + 1;
    const preset = PRESET_ROLES[selectedPresetIndex];
    setCustomName(`Drone ${String(nextNum).padStart(2, "0")} - ${preset.suffix}`);
    setCustomStatus("Online");
    setCustomBattery(100);
    setIsAddModalOpen(true);
  };

  const handleSelectPreset = (index: number) => {
    setSelectedPresetIndex(index);
    const nextNum = drones.length + 1;
    const preset = PRESET_ROLES[index];
    setCustomName(`Drone ${String(nextNum).padStart(2, "0")} - ${preset.suffix}`);
  };

  const handleCreateDrone = (e: React.FormEvent) => {
    e.preventDefault();
    const preset = PRESET_ROLES[selectedPresetIndex];
    const nextNum = drones.length + 1;
    const finalName = customName.trim() || `Drone ${String(nextNum).padStart(2, "0")}`;

    addDrone({
      name: finalName,
      status: customStatus,
      battery: customBattery,
      flightMode: preset.flightMode,
      cameraStatus: "Active",
      lidarStatus: "Active",
      gpsStatus: "Connected",
      telemetry: {
        altitude: preset.altitude,
        speed: customStatus === "Online" ? preset.speed : 0,
        heading: Math.floor(Math.random() * 360),
        verticalSpeed: 0,
        horizontalSpeed: customStatus === "Online" ? preset.speed / 3.6 : 0,
        satelliteCount: 15,
        distanceFromOperator: 0.5,
      }
    });

    setIsAddModalOpen(false);
  };

  const handleQuickAdd = () => {
    const nextNum = drones.length + 1;
    addDrone({
      name: `Drone ${String(nextNum).padStart(2, "0")} (Rapid Deploy)`,
      status: "Online",
      battery: 100,
      flightMode: "Autonomous",
    });
  };

  const confirmRemoveDrone = (droneId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeDrone(droneId);
    setDroneToDelete(null);
  };

  return (
    <>
      <aside className="w-64 border-r border-zinc-800/60 bg-zinc-950/50 backdrop-blur-xl flex flex-col z-20 shrink-0">
        {/* Header Branding */}
        <div className="p-4 border-b border-zinc-800/60 flex items-center justify-between">
          <div className="flex items-center gap-2 text-cyan-400">
            <Crosshair className="w-6 h-6" />
            <span className="font-bold tracking-widest text-lg">DRS</span>
          </div>
          {onOpenAdminPanel && (
            <button
              onClick={onOpenAdminPanel}
              className="px-2 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 text-[10px] font-mono font-bold transition-all"
              title="Open Admin VibeCoding Panel"
            >
              ADMIN IDE
            </button>
          )}
        </div>

        {/* Primary View Navigation */}
        <div className="p-4 border-b border-zinc-800/60">
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group text-sm font-medium tracking-wide",
                    isActive 
                      ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" 
                      : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 border border-transparent"
                  )}
                >
                  <Icon className={cn("w-4 h-4", isActive ? "text-cyan-400" : "text-zinc-500 group-hover:text-zinc-400")} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Fleet List Header & Action Bar */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 custom-scrollbar">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <h3 className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase font-mono">
                Fleet Units ({drones.length})
              </h3>
            </div>
            
            <div className="flex items-center gap-1">
              <button
                id="sidebar-quick-add-drone-btn"
                onClick={handleQuickAdd}
                className="px-1.5 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/70 text-zinc-300 hover:text-cyan-300 text-[10px] font-mono transition-all"
                title="Quick Deploy Drone (+1)"
              >
                + QUICK
              </button>
              <button
                id="sidebar-add-drone-btn"
                onClick={handleOpenAddModal}
                className="p-1 rounded bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 hover:text-cyan-200 transition-all"
                title="Deploy New Drone (Custom Config)"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Drones List */}
          {drones.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-6 text-center border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20 my-2">
              <Crosshair className="w-8 h-8 text-zinc-600 mb-2" />
              <span className="text-xs font-mono text-zinc-400 font-bold">NO ACTIVE DRONES</span>
              <p className="text-[10px] text-zinc-500 mt-1 mb-3">All units decommissioned or offline</p>
              <button
                onClick={handleOpenAddModal}
                className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-mono text-xs font-bold transition-all flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>DEPLOY DRONE</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {drones.map((drone) => {
                const isSelected = selectedDroneId === drone.id;
                const isConfirmingDelete = droneToDelete === drone.id;

                return (
                  <div
                    key={drone.id}
                    className={cn(
                      "relative flex flex-col gap-2 p-2.5 rounded-lg border transition-all text-left group overflow-hidden",
                      isSelected
                        ? "bg-zinc-900/90 border-cyan-500/60 shadow-[0_0_12px_rgba(6,182,212,0.15)]"
                        : "bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-900/70 hover:border-zinc-700"
                    )}
                  >
                    {/* Main Select Button */}
                    <button
                      onClick={() => setSelectedDroneId(drone.id)}
                      className="w-full text-left focus:outline-none"
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2 min-w-0 pr-1">
                          <span className={cn("font-medium tracking-wide text-xs font-mono truncate", isSelected ? "text-cyan-400 font-bold" : "text-zinc-200")}>
                            {drone.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            drone.status === 'Online' ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]' :
                            drone.status === 'Charging' ? 'bg-amber-500' :
                            drone.status === 'Standby' ? 'bg-blue-500' : 'bg-rose-500'
                          )} />
                          <span className="text-[9px] uppercase tracking-wider font-mono text-zinc-400">{drone.status}</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-[10px] tracking-wider uppercase text-zinc-500 mt-1.5">
                        <div className="flex items-center gap-1">
                          <Activity className="w-3 h-3 text-zinc-500" />
                          <span className={drone.battery < 20 ? "text-rose-400 font-bold" : "text-zinc-400"}>
                            {drone.battery}%
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Navigation className="w-3 h-3 text-zinc-500" />
                          <span className={drone.gpsStatus === 'Connected' ? "text-emerald-400/90" : "text-amber-400/90"}>
                            {drone.gpsStatus}
                          </span>
                        </div>
                      </div>
                    </button>

                    {/* Action Bar (Delete / Decommission) */}
                    <div className="pt-1.5 border-t border-zinc-800/40 flex items-center justify-between text-[10px] font-mono">
                      <span className="text-zinc-600">ID: {drone.id}</span>
                      
                      {isConfirmingDelete ? (
                        <div className="flex items-center gap-1 animate-fadeIn">
                          <button
                            onClick={(e) => confirmRemoveDrone(drone.id, e)}
                            className="px-1.5 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/50 font-bold transition-all text-[9px]"
                            title="Confirm Decommission"
                          >
                            CONFIRM REMOVE
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDroneToDelete(null);
                            }}
                            className="p-0.5 text-zinc-500 hover:text-zinc-300"
                            title="Cancel"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDroneToDelete(drone.id);
                          }}
                          className="opacity-60 group-hover:opacity-100 hover:opacity-100 p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all flex items-center gap-1"
                          title="Remove Drone from Fleet"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span className="hidden group-hover:inline text-[9px]">REMOVE</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Disconnect Button */}
        <div className="p-3 border-t border-zinc-800/60">
          <button
            onClick={onExit}
            className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 hover:border-rose-500/50 rounded-lg transition-all duration-200 text-xs font-mono font-medium tracking-wide"
          >
            <LogOut className="w-3.5 h-3.5" />
            DISCONNECT SESSION
          </button>
        </div>
      </aside>

      {/* Deploy New Drone Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/50">
                <div className="flex items-center gap-2 text-cyan-400">
                  <Plus className="w-5 h-5" />
                  <span className="font-mono text-sm font-bold tracking-wider">DEPLOY NEW DRONE TO FLEET</span>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleCreateDrone} className="p-5 space-y-4">
                {/* Preset Roles Selection */}
                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-2">
                    Select Tactical Role Preset
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {PRESET_ROLES.map((preset, idx) => {
                      const Icon = preset.icon;
                      const isSelected = selectedPresetIndex === idx;
                      return (
                        <button
                          key={preset.role}
                          type="button"
                          onClick={() => handleSelectPreset(idx)}
                          className={cn(
                            "p-2.5 rounded-lg border text-left flex flex-col gap-1 transition-all",
                            isSelected
                              ? "bg-cyan-950/40 border-cyan-500/60 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                              : "bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900"
                          )}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-1.5">
                              <Icon className={cn("w-3.5 h-3.5", isSelected ? "text-cyan-400" : "text-zinc-500")} />
                              <span className="text-xs font-mono font-bold">{preset.role}</span>
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                          </div>
                          <span className="text-[10px] text-zinc-500 leading-tight line-clamp-2">
                            {preset.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Drone Name Input */}
                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                    Drone Callsign / Name
                  </label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g. Drone 05 - Apex Recon"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 focus:border-cyan-500 rounded-lg text-sm text-zinc-200 font-mono outline-none transition-colors"
                  />
                </div>

                {/* Status & Battery Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                      Initial Status
                    </label>
                    <select
                      value={customStatus}
                      onChange={(e) => setCustomStatus(e.target.value as ConnectionStatus)}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 focus:border-cyan-500 rounded-lg text-xs text-zinc-200 font-mono outline-none transition-colors"
                    >
                      <option value="Online">Online (Ready to fly)</option>
                      <option value="Standby">Standby (Ground base)</option>
                      <option value="Charging">Charging (Docked)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5 flex justify-between">
                      <span>Battery Charge</span>
                      <span className="text-cyan-400 font-bold">{customBattery}%</span>
                    </label>
                    <input
                      type="range"
                      min="20"
                      max="100"
                      step="5"
                      value={customBattery}
                      onChange={(e) => setCustomBattery(Number(e.target.value))}
                      className="w-full accent-cyan-400"
                    />
                  </div>
                </div>

                {/* Location spawn note */}
                <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80 text-[11px] font-mono text-zinc-400 flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>
                    Unit will automatically spawn coordinates near{" "}
                    {userLocation ? "your current GPS location" : "Command Station (Home coordinates)"}.
                  </span>
                </div>

                {/* Submit button */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800/80">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 font-mono text-xs font-medium transition-colors"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500/20 to-cyan-500/10 hover:from-cyan-500/30 hover:to-cyan-500/20 border border-cyan-500/60 text-cyan-300 font-mono text-xs font-bold transition-all shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>DEPLOY UNIT</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
