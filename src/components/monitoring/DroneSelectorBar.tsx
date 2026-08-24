import React, { useState, useRef, useEffect, useMemo } from "react";
import { Drone } from "../../types";
import { CameraSourceInfo } from "../camera/CameraTypes";
import { useCameraSources } from "../camera/useCameraSources";
import { useDRS } from "../../store";
import {
  Battery,
  BatteryCharging,
  BatteryWarning,
  Radio,
  ChevronDown,
  Check,
  Video,
  Camera,
  User,
  Users,
  RefreshCw,
} from "lucide-react";

interface DroneSelectorBarProps {
  drones: Drone[];
  selectedDroneId: string;
  onSelectDrone: (droneId: string) => void;
  selectedCameraId?: string;
  onSelectCamera?: (cameraId: string) => void;
  isMasterRecording?: boolean;
  onToggleMasterRecording?: () => void;
  onSnapshotAll?: () => void;
}

export function DroneSelectorBar({
  drones,
  selectedDroneId,
  onSelectDrone,
  selectedCameraId,
  onSelectCamera,
  isMasterRecording = true,
  onToggleMasterRecording,
  onSnapshotAll,
}: DroneSelectorBarProps) {
  const { currentUser } = useDRS();
  const {
    allSources,
    isBroadcasting,
    toggleBroadcasting,
    switchCameraFacing,
    facingMode,
    activeVisitorCount,
  } = useCameraSources(drones, false, currentUser?.username || "Operator");

  const [isDroneDropdownOpen, setIsDroneDropdownOpen] = useState(false);
  const [isCamDropdownOpen, setIsCamDropdownOpen] = useState(false);
  const [camCategory, setCamCategory] = useState<"all" | "visitors" | "drone" | "cctv">("all");
  const droneDropdownRef = useRef<HTMLDivElement>(null);
  const camDropdownRef = useRef<HTMLDivElement>(null);

  const selectedDrone =
    drones.find((d) => d.id === selectedDroneId) || drones[0];

  // Find selected camera source info
  const selectedCamOption: CameraSourceInfo = useMemo(() => {
    if (!selectedCameraId) {
      return (
        allSources.find((s) => s.id === `${selectedDrone?.id}-rgb-gimbal`) ||
        allSources[0]
      );
    }
    const found = allSources.find((s) => s.id === selectedCameraId);
    if (found) return found;

    // Shorthand match (e.g. 'rgb-gimbal')
    const shortFound = allSources.find(
      (s) =>
        s.id === `${selectedDrone?.id}-${selectedCameraId}` ||
        s.lensType === selectedCameraId ||
        s.id.endsWith(selectedCameraId)
    );
    if (shortFound) return shortFound;

    return allSources[0] || {
      id: "rgb-gimbal",
      label: "4K RGB Gimbal (Primary)",
      shortLabel: "4K MAIN",
      lensType: "rgb-gimbal",
      lensName: "4K RGB Gimbal",
      resolution: "3840x2160",
      fov: "84° Wide Optical",
      status: "ONLINE",
      sensorSpec: "1/1.3\" CMOS 48MP F/1.7",
    };
  }, [allSources, selectedCameraId, selectedDrone]);

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

  const filteredCamOptions = allSources.filter((cam) => {
    if (camCategory === "visitors") return cam.lensType === "visitor-camera";
    if (camCategory === "drone") return !!cam.droneId;
    if (camCategory === "cctv") return cam.lensType === "ground-cctv" || cam.lensType === "device-webcam";
    return true;
  });

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

          {/* Drone Dropdown List */}
          {isDroneDropdownOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-72 sm:w-80 bg-zinc-900 border border-zinc-750 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-2 bg-zinc-950/90 border-b border-zinc-800 text-[10px] font-mono text-zinc-400 flex items-center justify-between">
                <span>AVAILABLE FLEET DRONES</span>
                <span className="text-cyan-400 font-bold">{drones.length} UNITS</span>
              </div>

              <div className="py-1 max-h-72 overflow-y-auto custom-scrollbar divide-y divide-zinc-800/40">
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

        {/* 2. Camera Lens & Visitor Device Quick Switcher Dropdown */}
        {onSelectCamera && (
          <div className="relative" ref={camDropdownRef}>
            <button
              id="top-camera-selector-btn"
              type="button"
              onClick={() => setIsCamDropdownOpen(!isCamDropdownOpen)}
              className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-750 hover:border-cyan-500/60 text-zinc-100 px-3 py-1.5 rounded-lg shadow-md transition-all text-xs font-mono group"
              title="Switch Active Camera Lens / Visitor Device Feed"
            >
              {selectedCamOption.lensType === "visitor-camera" ? (
                <User className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Video className="w-3.5 h-3.5 text-cyan-400" />
              )}
              <div className="flex flex-col text-left">
                <span className="text-[9px] font-mono text-zinc-500 leading-none uppercase">
                  ACTIVE CAMERA FEED
                </span>
                <span className="text-xs font-bold text-zinc-200 leading-tight flex items-center gap-1">
                  <span>{selectedCamOption.shortLabel}: {selectedCamOption.lensName}</span>
                  {selectedCamOption.isSelf && (
                    <span className="text-[8px] px-1 bg-cyan-950 text-cyan-300 rounded border border-cyan-500/40">
                      YOU
                    </span>
                  )}
                  {selectedCamOption.isRealDevice && !selectedCamOption.isSelf && (
                    <span className="text-[8px] px-1 bg-emerald-950 text-emerald-300 rounded border border-emerald-500/40 animate-pulse">
                      LIVE
                    </span>
                  )}
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
              <div className="absolute left-0 top-full mt-1.5 w-80 sm:w-96 bg-zinc-900 border border-zinc-750 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-2 bg-zinc-950/90 border-b border-zinc-800 text-[10px] font-mono text-zinc-400 flex items-center justify-between">
                  <span>CAMERA FEEDS & SENSORS</span>
                  <span className="text-cyan-400 font-bold">{allSources.length} STREAMS</span>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-1 p-1.5 bg-zinc-950/60 border-b border-zinc-800/60 overflow-x-auto custom-scrollbar">
                  {[
                    { id: "all", label: "All Feeds" },
                    { id: "visitors", label: `Visitors (${activeVisitorCount})`, highlight: true },
                    { id: "drone", label: "Drone Lenses" },
                    { id: "cctv", label: "CCTV / WebCam" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setCamCategory(tab.id as any)}
                      className={`px-2 py-1 rounded text-[9px] font-mono font-bold uppercase transition-colors shrink-0 ${
                        camCategory === tab.id
                          ? tab.highlight
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50"
                            : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50"
                          : "text-zinc-400 hover:text-zinc-200 bg-zinc-900"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="py-1 max-h-72 overflow-y-auto custom-scrollbar divide-y divide-zinc-800/40">
                  {filteredCamOptions.map((cam) => {
                    const isSelected = cam.id === selectedCamOption.id;
                    const isCamVisitor = cam.lensType === "visitor-camera";
                    const isRoot = cam.isRoot || cam.isSelf;

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
                            ? isRoot || isCamVisitor
                              ? "bg-emerald-500/15 text-emerald-100"
                              : "bg-cyan-500/15 text-zinc-100"
                            : isRoot
                            ? "bg-zinc-900/90 text-zinc-100 hover:bg-zinc-800"
                            : "hover:bg-zinc-800/70 text-zinc-300 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-1 h-7 rounded-full shrink-0 ${
                              isSelected
                                ? isRoot || isCamVisitor
                                  ? "bg-emerald-400"
                                  : "bg-cyan-400"
                                : isRoot
                                ? "bg-emerald-500/60"
                                : "bg-transparent"
                            }`}
                          />
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5">
                              {isRoot ? (
                                <Radio className="w-3 h-3 text-emerald-400 shrink-0" />
                              ) : isCamVisitor ? (
                                <User className="w-3 h-3 text-emerald-400 shrink-0" />
                              ) : null}
                              <span className="text-xs font-bold text-zinc-100 truncate">
                                {cam.label}
                              </span>
                              {isRoot && (
                                <span className="text-[8px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 font-extrabold rounded border border-emerald-500/50">
                                  ROOT (YOU)
                                </span>
                              )}
                              {cam.isRealDevice && !isRoot && (
                                <span className="text-[8px] px-1 bg-emerald-950 text-emerald-400 rounded border border-emerald-500/40 animate-pulse">
                                  LIVE
                                </span>
                              )}
                            </div>
                            <span
                              className={`text-[10px] font-mono truncate ${
                                isRoot || isCamVisitor ? "text-emerald-400/90" : "text-cyan-400/90"
                              }`}
                            >
                              {cam.sensorSpec}
                            </span>
                            <span className="text-[9px] font-mono text-zinc-500">
                              {cam.resolution} • {cam.fov}
                            </span>
                          </div>
                        </div>

                        {isSelected && (
                          <Check
                            className={`w-4 h-4 shrink-0 ml-2 ${
                              isRoot || isCamVisitor ? "text-emerald-400" : "text-cyan-400"
                            }`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick Broadcast / Share Cam Button */}
        <div className="flex items-center gap-1">
          <button
            onClick={toggleBroadcasting}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 border transition-colors shadow-sm ${
              isBroadcasting
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/60 font-bold animate-pulse"
                : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-750 hover:text-white"
            }`}
            title={
              isBroadcasting
                ? "Broadcasting camera to other devices (Click to Stop)"
                : "Broadcast this device's camera to all other connected screens"
            }
          >
            <Radio className={`w-3.5 h-3.5 ${isBroadcasting ? "text-emerald-400" : "text-zinc-400"}`} />
            <span>{isBroadcasting ? "BROADCASTING" : "BROADCAST CAM"}</span>
          </button>

          {isBroadcasting && (
            <button
              onClick={switchCameraFacing}
              className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-750 text-zinc-400 hover:text-cyan-300 hover:bg-zinc-800 transition-colors"
              title={`Flip Camera (${facingMode === "user" ? "Front" : "Rear"})`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
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
