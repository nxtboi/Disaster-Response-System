import React, { useState, useRef, useEffect } from "react";
import { Drone } from "../../types";
import { CameraLensId, CAMERA_OPTIONS } from "./LiveVideoPanel";
import {
  Battery,
  BatteryCharging,
  BatteryWarning,
  Radio,
  ChevronDown,
  Check,
  Zap,
  Gauge,
  Navigation,
  Shield,
  Video,
  Camera,
  Layers,
  CircleDot,
  Sliders,
  Disc,
} from "lucide-react";

interface DroneSelectorBarProps {
  drones: Drone[];
  selectedDroneId: string;
  onSelectDrone: (droneId: string) => void;
  selectedCameraId?: CameraLensId;
  onSelectCamera?: (cameraId: CameraLensId) => void;
  isMasterRecording?: boolean;
  onToggleMasterRecording?: () => void;
  onSnapshotAll?: () => void;
}

export function DroneSelectorBar({
  drones,
  selectedDroneId,
  onSelectDrone,
  selectedCameraId = "rgb-gimbal",
  onSelectCamera,
  isMasterRecording = true,
  onToggleMasterRecording,
  onSnapshotAll,
}: DroneSelectorBarProps) {
  const [isDroneDropdownOpen, setIsDroneDropdownOpen] = useState(false);
  const [isCamDropdownOpen, setIsCamDropdownOpen] = useState(false);
  const droneDropdownRef = useRef<HTMLDivElement>(null);
  const camDropdownRef = useRef<HTMLDivElement>(null);

  const selectedDrone =
    drones.find((d) => d.id === selectedDroneId) || drones[0];
  const selectedCamOption =
    CAMERA_OPTIONS.find((c) => c.id === selectedCameraId) || CAMERA_OPTIONS[0];

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        droneDropdownRef.current &&
        !droneDropdownRef.current.contains(event.target as Node)
      ) {
        setIsDroneDropdownOpen(false);
      }
      if (
        camDropdownRef.current &&
        !camDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCamDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getBatteryIcon = (battery: number, status: string) => {
    if (status === "Charging") {
      return <BatteryCharging className="w-3.5 h-3.5 text-amber-400 animate-pulse" />;
    }
    if (battery < 20) {
      return <BatteryWarning className="w-3.5 h-3.5 text-rose-400 animate-bounce" />;
    }
    return <Battery className="w-3.5 h-3.5 text-emerald-400" />;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Online":
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/70 px-1.5 py-0.5 rounded border border-emerald-500/40">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            LIVE
          </span>
        );
      case "Standby":
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono text-cyan-400 bg-cyan-950/70 px-1.5 py-0.5 rounded border border-cyan-500/40">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            STANDBY
          </span>
        );
      case "Charging":
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono text-amber-400 bg-amber-950/70 px-1.5 py-0.5 rounded border border-amber-500/40">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            CHARGING
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-700">
            OFFLINE
          </span>
        );
    }
  };

  return (
    <div className="bg-zinc-950/95 border-b border-zinc-800/90 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 z-30 relative backdrop-blur-md">
      {/* Left: Drone Selector + Camera Feed Switcher */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Label and Drone Dropdown */}
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-300">
              Select Active Drone
            </div>
            <div className="text-[9px] font-mono text-zinc-500">
              UAV SENSOR LINK
            </div>
          </div>
        </div>

        {/* 1. Drone Dropdown Menu */}
        <div className="relative" ref={droneDropdownRef}>
          <button
            id="active-drone-dropdown-btn"
            type="button"
            onClick={() => setIsDroneDropdownOpen(!isDroneDropdownOpen)}
            className="flex items-center justify-between gap-3 min-w-[210px] sm:min-w-[250px] bg-zinc-900 hover:bg-zinc-850 border border-zinc-750 hover:border-cyan-500/60 text-zinc-100 px-3 py-1.5 rounded-lg shadow-md transition-all group focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
              <div className="flex flex-col text-left truncate">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs font-bold text-cyan-300">
                    {selectedDrone?.id || "DRN-01"}
                  </span>
                  <span className="text-xs text-zinc-200 font-medium truncate">
                    {selectedDrone?.name || "Active Drone"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400">
                  <span className="flex items-center gap-1">
                    {selectedDrone &&
                      getBatteryIcon(selectedDrone.battery, selectedDrone.status)}
                    <span
                      className={
                        (selectedDrone?.battery || 0) < 20
                          ? "text-rose-400 font-bold"
                          : "text-emerald-400"
                      }
                    >
                      {selectedDrone?.battery}%
                    </span>
                  </span>
                  <span>•</span>
                  <span>ALT {selectedDrone?.telemetry?.altitude ?? 0}m</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 pl-1">
              {selectedDrone && getStatusBadge(selectedDrone.status)}
              <ChevronDown
                className={`w-4 h-4 text-zinc-400 transition-transform duration-200 group-hover:text-zinc-200 ${
                  isDroneDropdownOpen ? "rotate-180 text-cyan-400" : ""
                }`}
              />
            </div>
          </button>

          {/* Drone Options List */}
          {isDroneDropdownOpen && (
            <div
              id="active-drone-dropdown-menu"
              className="absolute left-0 top-full mt-1.5 w-[300px] sm:w-[340px] bg-zinc-900 border border-zinc-750 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150"
            >
              <div className="px-3 py-2 bg-zinc-950/90 border-b border-zinc-800 text-[10px] font-mono text-zinc-400 flex items-center justify-between">
                <span>CONNECTED FLEET UNITS ({drones.length})</span>
                <span className="text-cyan-400 font-medium">CLICK TO SWITCH</span>
              </div>

              <div className="py-1 max-h-[300px] overflow-y-auto custom-scrollbar divide-y divide-zinc-800/40">
                {drones.map((drone) => {
                  const isSelected = drone.id === selectedDroneId;
                  return (
                    <button
                      key={drone.id}
                      type="button"
                      onClick={() => {
                        onSelectDrone(drone.id);
                        setIsDroneDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${
                        isSelected
                          ? "bg-cyan-500/15 text-zinc-100"
                          : "hover:bg-zinc-800/70 text-zinc-300 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-1.5 h-6 rounded-full shrink-0 ${
                            isSelected ? "bg-cyan-400" : "bg-transparent"
                          }`}
                        />
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-cyan-400">
                              {drone.id}
                            </span>
                            <span className="text-xs font-semibold text-zinc-200 truncate">
                              {drone.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400 mt-0.5">
                            <span className="flex items-center gap-1">
                              {getBatteryIcon(drone.battery, drone.status)}
                              <span>{drone.battery}%</span>
                            </span>
                            <span>•</span>
                            <span>ALT {drone.telemetry.altitude}m</span>
                            <span>•</span>
                            <span>SPD {drone.telemetry.speed.toFixed(1)} km/h</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {getStatusBadge(drone.status)}
                        {isSelected && (
                          <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 2. Camera Lens Quick Switcher Dropdown */}
        {onSelectCamera && (
          <div className="relative" ref={camDropdownRef}>
            <button
              id="top-camera-selector-btn"
              type="button"
              onClick={() => setIsCamDropdownOpen(!isCamDropdownOpen)}
              className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-750 hover:border-cyan-500/60 text-zinc-100 px-3 py-1.5 rounded-lg shadow-md transition-all text-xs font-mono group"
              title="Switch Active Camera Lens / Sensor Feed"
            >
              <Video className="w-3.5 h-3.5 text-cyan-400" />
              <div className="flex flex-col text-left">
                <span className="text-[9px] font-mono text-zinc-500 leading-none uppercase">
                  ACTIVE CAMERA
                </span>
                <span className="text-xs font-bold text-zinc-200 leading-tight">
                  {selectedCamOption.shortTag}: {selectedCamOption.label.split("(")[0]}
                </span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ml-1 ${
                  isCamDropdownOpen ? "rotate-180 text-cyan-400" : ""
                }`}
              />
            </button>

            {/* Camera Options Menu */}
            {isCamDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-72 sm:w-80 bg-zinc-900 border border-zinc-750 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-2 bg-zinc-950/90 border-b border-zinc-800 text-[10px] font-mono text-zinc-400 flex items-center justify-between">
                  <span>CAMERA FEEDS & SENSORS</span>
                  <span className="text-cyan-400 font-bold">{CAMERA_OPTIONS.length} LENSES</span>
                </div>

                <div className="py-1 max-h-72 overflow-y-auto custom-scrollbar divide-y divide-zinc-800/40">
                  {CAMERA_OPTIONS.map((cam) => {
                    const isSelected = cam.id === selectedCameraId;
                    return (
                      <button
                        key={cam.id}
                        type="button"
                        onClick={() => {
                          onSelectCamera(cam.id);
                          setIsCamDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${
                          isSelected
                            ? "bg-cyan-500/15 text-zinc-100"
                            : "hover:bg-zinc-800/70 text-zinc-300 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-1 h-7 rounded-full shrink-0 ${
                              isSelected ? "bg-cyan-400" : "bg-transparent"
                            }`}
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-zinc-100 truncate">
                              {cam.label}
                            </span>
                            <span className="text-[10px] font-mono text-cyan-400/90 truncate">
                              {cam.sensor}
                            </span>
                            <span className="text-[9px] font-mono text-zinc-500">
                              {cam.resolution} • {cam.fps}FPS • {cam.fov}
                            </span>
                          </div>
                        </div>

                        {isSelected && (
                          <Check className="w-4 h-4 text-cyan-400 shrink-0 ml-2" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Controls: Quick Snapshot + Live Telemetry */}
      <div className="flex items-center gap-3">
        {onSnapshotAll && (
          <button
            onClick={onSnapshotAll}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-750 hover:border-cyan-500/50 transition-colors shadow-sm"
            title="Trigger Instant Synchronized Snapshot from all 4 sensors"
          >
            <Camera className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline font-bold">SNAPSHOT ALL</span>
          </button>
        )}

        {selectedDrone && (
          <div className="hidden xl:flex items-center gap-3 text-[11px] font-mono bg-zinc-900/80 border border-zinc-800 px-3 py-1.5 rounded-lg text-zinc-400">
            <span>
              MODE: <strong className="text-zinc-200">{selectedDrone.flightMode}</strong>
            </span>
            <span className="text-zinc-700">|</span>
            <span>
              LIDAR: <strong className="text-cyan-400">{selectedDrone.lidarStatus}</strong>
            </span>
            <span className="text-zinc-700">|</span>
            <span>
              LINK: <strong className="text-emerald-400">24ms • 5.8 GHz</strong>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
