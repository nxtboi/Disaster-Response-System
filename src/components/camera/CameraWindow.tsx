import React, { useState, useEffect } from "react";
import {
  CameraSourceInfo,
  VisionMode,
  WindowSlotConfig,
  getAvailableCameraSources,
} from "./CameraTypes";
import { useCameraSources } from "./useCameraSources";
import { CameraRenderer } from "./CameraRenderer";
import { Drone } from "../../types";
import { DroneDataOverlay } from "./DroneDataOverlay";
import {
  Camera,
  Maximize2,
  Minimize2,
  Eye,
  Crosshair,
  Sliders,
  Sparkles,
  ChevronDown,
  Check,
  Compass,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Volume2,
  VolumeX,
  Layers,
  Video,
  Activity,
} from "lucide-react";

interface CameraWindowProps {
  config: WindowSlotConfig;
  drones: Drone[];
  isFocused?: boolean;
  onUpdateConfig: (slotId: string, updates: Partial<WindowSlotConfig>) => void;
  onToggleFocus?: (slotId: string) => void;
}

export function CameraWindow({
  config,
  drones,
  isFocused = false,
  onUpdateConfig,
  onToggleFocus,
}: CameraWindowProps) {
  const { sources: availableSources, allSources, activeVisitorCount } = useCameraSources(drones, true);
  const activeSource =
    availableSources.find((s) => s.id === config.cameraSourceId) ||
    allSources.find((s) => s.id === config.cameraSourceId) ||
    availableSources[0] ||
    allSources[0];

  const matchedDrone = drones.find((d) => d.id === activeSource?.droneId);

  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [snapshotFlash, setSnapshotFlash] = useState(false);
  const [recSeconds, setRecSeconds] = useState(120);
  const [selectorCategory, setSelectorCategory] = useState<"all" | "drones" | "visitors" | "fixed">("all");
  const [showOverlay, setShowOverlay] = useState(true);

  // Timer for recording counter
  useEffect(() => {
    const timer = setInterval(() => setRecSeconds((p) => p + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatRecTime = (sec: number) => {
    const hrs = Math.floor(sec / 3600).toString().padStart(2, "0");
    const mins = Math.floor((sec % 3600) / 60).toString().padStart(2, "0");
    const secs = (sec % 60).toString().padStart(2, "0");
    return `${hrs}:${mins}:${secs}`;
  };

  const handleTakeSnapshot = () => {
    setSnapshotFlash(true);
    setTimeout(() => setSnapshotFlash(false), 250);
  };

  // PTZ gimbal adjustments
  const handlePtzMove = (panDelta: number, tiltDelta: number) => {
    const newPan = Math.max(-50, Math.min(50, config.ptz.pan + panDelta));
    const newTilt = Math.max(-50, Math.min(50, config.ptz.tilt + tiltDelta));
    onUpdateConfig(config.slotId, {
      ptz: { pan: newPan, tilt: newTilt },
    });
  };

  const handlePtzReset = () => {
    onUpdateConfig(config.slotId, {
      ptz: { pan: 0, tilt: 0 },
    });
  };

  // ONLY SHOW AVAILABLE CAMERAS IN DROPDOWN
  const filteredSources = availableSources.filter((src) => {
    if (selectorCategory === "drones") return !!src.droneId;
    if (selectorCategory === "visitors") return src.lensType === "visitor-camera";
    if (selectorCategory === "fixed") return src.lensType === "ground-cctv" || src.lensType === "device-webcam";
    return true;
  });

  return (
    <div className="w-full h-full bg-zinc-950 border border-zinc-800/80 rounded-xl overflow-hidden shadow-2xl flex flex-col relative group/win transition-all select-none">
      {/* Flash Effect on Snapshot */}
      {snapshotFlash && (
        <div className="absolute inset-0 bg-white z-50 animate-fade-out pointer-events-none" />
      )}

      {/* Window Top Control Bar */}
      <div className="px-3 py-2 bg-zinc-900/90 border-b border-zinc-800/80 flex items-center justify-between gap-2 z-30 font-mono">
        {/* Left: Camera Selector Dropdown */}
        <div className="relative flex items-center gap-2 min-w-0">
          <button
            onClick={() => {
              setIsSelectorOpen(!isSelectorOpen);
              setIsFiltersOpen(false);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-800/90 hover:bg-zinc-700/90 border border-zinc-700/80 text-zinc-200 text-xs font-bold transition-colors truncate max-w-[210px]"
            title="Click to switch camera source or lens"
          >
            <Video className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate">{activeSource.shortLabel}</span>
            <span className="text-[10px] text-cyan-400 shrink-0 font-normal">
              [{activeSource.lensName}]
            </span>
            <ChevronDown className="w-3 h-3 text-zinc-400 shrink-0 ml-0.5" />
          </button>

          {/* REC Status Badge */}
          <div className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/30 text-[9px] text-rose-400 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
            <span>LIVE</span>
          </div>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-1 text-zinc-400 shrink-0">
          {/* Live Data Overlay HUD Toggle */}
          {matchedDrone && (
            <button
              onClick={() => setShowOverlay(!showOverlay)}
              className={`p-1 rounded text-xs transition-colors ${
                showOverlay
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "hover:bg-zinc-800 hover:text-zinc-200"
              }`}
              title={showOverlay ? "Live Data Overlay: ON" : "Live Data Overlay: OFF"}
            >
              <Activity className="w-3.5 h-3.5" />
            </button>
          )}

          {/* AI Bounding Boxes Toggle */}
          <button
            onClick={() =>
              onUpdateConfig(config.slotId, { showAiBoxes: !config.showAiBoxes })
            }
            className={`p-1 rounded text-xs transition-colors ${
              config.showAiBoxes
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "hover:bg-zinc-800 hover:text-zinc-200"
            }`}
            title={config.showAiBoxes ? "AI Target Tracking: ON" : "AI Target Tracking: OFF"}
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>

          {/* PTZ Gimbal Control Toggle */}
          <button
            onClick={() =>
              onUpdateConfig(config.slotId, { isPtzOpen: !config.isPtzOpen })
            }
            className={`p-1 rounded text-xs transition-colors ${
              config.isPtzOpen
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                : "hover:bg-zinc-800 hover:text-zinc-200"
            }`}
            title="Gimbal PTZ (Pan/Tilt/Zoom) Controls"
          >
            <Compass className="w-3.5 h-3.5" />
          </button>

          {/* Vision Filters Menu */}
          <div className="relative">
            <button
              onClick={() => {
                setIsFiltersOpen(!isFiltersOpen);
                setIsSelectorOpen(false);
              }}
              className={`p-1 rounded text-xs transition-colors ${
                config.visionMode !== "normal"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "hover:bg-zinc-800 hover:text-zinc-200"
              }`}
              title="Optical Lens Filter (NVG / FLIR / Mono)"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>

            {/* Filters Dropdown */}
            {isFiltersOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-zinc-950/95 border border-zinc-800 rounded-lg p-1.5 shadow-2xl backdrop-blur-xl flex flex-col gap-1 z-50 font-mono text-[11px]">
                <button
                  onClick={() => {
                    onUpdateConfig(config.slotId, { visionMode: "normal" });
                    setIsFiltersOpen(false);
                  }}
                  className={`flex items-center justify-between px-2 py-1 rounded ${
                    config.visionMode === "normal"
                      ? "bg-cyan-500/20 text-cyan-300 font-bold"
                      : "text-zinc-400 hover:bg-zinc-900"
                  }`}
                >
                  <span>Standard RGB</span>
                  {config.visionMode === "normal" && <Check className="w-3 h-3 text-cyan-400" />}
                </button>
                <button
                  onClick={() => {
                    onUpdateConfig(config.slotId, { visionMode: "nvg" });
                    setIsFiltersOpen(false);
                  }}
                  className={`flex items-center justify-between px-2 py-1 rounded ${
                    config.visionMode === "nvg"
                      ? "bg-emerald-500/20 text-emerald-300 font-bold"
                      : "text-zinc-400 hover:bg-zinc-900"
                  }`}
                >
                  <span>NVG Night-Vis</span>
                  {config.visionMode === "nvg" && <Check className="w-3 h-3 text-emerald-400" />}
                </button>
                <button
                  onClick={() => {
                    onUpdateConfig(config.slotId, { visionMode: "thermal" });
                    setIsFiltersOpen(false);
                  }}
                  className={`flex items-center justify-between px-2 py-1 rounded ${
                    config.visionMode === "thermal"
                      ? "bg-amber-500/20 text-amber-300 font-bold"
                      : "text-zinc-400 hover:bg-zinc-900"
                  }`}
                >
                  <span>FLIR Thermal</span>
                  {config.visionMode === "thermal" && <Check className="w-3 h-3 text-amber-400" />}
                </button>
                <button
                  onClick={() => {
                    onUpdateConfig(config.slotId, { visionMode: "mono" });
                    setIsFiltersOpen(false);
                  }}
                  className={`flex items-center justify-between px-2 py-1 rounded ${
                    config.visionMode === "mono"
                      ? "bg-zinc-500/20 text-zinc-200 font-bold"
                      : "text-zinc-400 hover:bg-zinc-900"
                  }`}
                >
                  <span>Tactical Mono</span>
                  {config.visionMode === "mono" && <Check className="w-3 h-3 text-zinc-300" />}
                </button>
              </div>
            )}
          </div>

          {/* Zoom Cycle (1x, 2x, 4x) */}
          <button
            onClick={() => {
              const nextZoom: 1 | 2 | 4 =
                config.zoom === 1 ? 2 : config.zoom === 2 ? 4 : 1;
              onUpdateConfig(config.slotId, { zoom: nextZoom });
            }}
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors ${
              config.zoom > 1
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
                : "border-zinc-800 hover:bg-zinc-800 text-zinc-400"
            }`}
            title="Digital Optical Zoom"
          >
            {config.zoom}x
          </button>

          {/* Snapshot Capture */}
          <button
            onClick={handleTakeSnapshot}
            className="p-1 rounded hover:bg-zinc-800 hover:text-cyan-400 transition-colors"
            title="Capture Screenshot from this Camera"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen / Focus Toggle */}
          {onToggleFocus && (
            <button
              onClick={() => onToggleFocus(config.slotId)}
              className="p-1 rounded hover:bg-zinc-800 hover:text-cyan-400 transition-colors"
              title={isFocused ? "Restore Multi-Grid Layout" : "Maximize / Focus this Camera"}
            >
              {isFocused ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Camera Selection Modal Popover */}
      {isSelectorOpen && (
        <div className="absolute inset-x-2 top-11 bottom-2 z-40 bg-zinc-950/95 border border-cyan-500/40 rounded-xl p-3 shadow-2xl backdrop-blur-xl flex flex-col font-mono">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800 mb-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
                Select Available Camera Source
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                {filteredSources.length} AVAILABLE
              </span>
            </div>
            <button
              onClick={() => setIsSelectorOpen(false)}
              className="text-xs text-zinc-400 hover:text-zinc-100 p-1"
            >
              ✕
            </button>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex gap-1.5 mb-2.5 overflow-x-auto custom-scrollbar pb-0.5">
            {[
              { id: "all", label: "All Available" },
              { id: "visitors", label: `Visitors (${activeVisitorCount})`, badge: true },
              { id: "drones", label: "Drones" },
              { id: "fixed", label: "Ground CCTVs" },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectorCategory(cat.id as any)}
                className={`px-2.5 py-1 rounded text-[10px] uppercase font-bold transition-colors flex items-center gap-1.5 shrink-0 ${
                  selectorCategory === cat.id
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                    : "text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800"
                }`}
              >
                <span>{cat.label}</span>
                {cat.badge && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
                )}
              </button>
            ))}
          </div>

          {/* Source List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1.5 pr-1">
            {filteredSources.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 text-center text-zinc-500">
                <Video className="w-6 h-6 mb-2 opacity-40" />
                <span className="text-xs">No active camera devices available in this category</span>
              </div>
            ) : (
              filteredSources.map((src) => {
                const isSelected = src.id === config.cameraSourceId;
                return (
                  <button
                    key={src.id}
                    onClick={() => {
                      onUpdateConfig(config.slotId, { cameraSourceId: src.id });
                      setIsSelectorOpen(false);
                    }}
                    className={`flex items-center justify-between p-2 rounded-lg border text-left transition-all ${
                      isSelected
                        ? "bg-cyan-500/15 border-cyan-500/60 text-cyan-200"
                        : "bg-zinc-900/60 border-zinc-800 hover:bg-zinc-800/80 text-zinc-300"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-2 h-2 rounded-full shrink-0 bg-emerald-400 animate-pulse"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate">{src.label}</div>
                        <div className="text-[10px] text-zinc-500 truncate">
                          {src.sensorSpec} • {src.resolution} • {src.fov}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="px-2 py-0.5 rounded bg-cyan-500 text-black font-extrabold text-[10px] shrink-0 ml-2">
                        ACTIVE
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Main Viewport Container */}
      <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center">
        <CameraRenderer
          source={activeSource}
          drone={matchedDrone}
          visionMode={config.visionMode}
          zoom={config.zoom}
          ptz={config.ptz}
          showAiBoxes={config.showAiBoxes}
          onSnapshot={handleTakeSnapshot}
        />

        {/* PTZ Interactive Overlay Pad */}
        {config.isPtzOpen && (
          <div className="absolute top-3 right-3 z-30 bg-zinc-950/90 border border-cyan-500/50 rounded-xl p-2 shadow-2xl backdrop-blur-md flex flex-col items-center gap-1 font-mono">
            <span className="text-[9px] text-cyan-400 font-bold">GIMBAL PTZ</span>
            <div className="grid grid-cols-3 gap-1 w-24 h-24">
              <div></div>
              <button
                onClick={() => handlePtzMove(0, -10)}
                className="p-1 rounded bg-zinc-900 hover:bg-cyan-500/20 text-zinc-300 hover:text-cyan-300 border border-zinc-800 flex items-center justify-center"
                title="Tilt Up"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <div></div>

              <button
                onClick={() => handlePtzMove(-10, 0)}
                className="p-1 rounded bg-zinc-900 hover:bg-cyan-500/20 text-zinc-300 hover:text-cyan-300 border border-zinc-800 flex items-center justify-center"
                title="Pan Left"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handlePtzReset}
                className="p-1 rounded bg-zinc-900 hover:bg-cyan-500/30 text-cyan-400 border border-zinc-700 flex items-center justify-center"
                title="Center / Reset Gimbal"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
              <button
                onClick={() => handlePtzMove(10, 0)}
                className="p-1 rounded bg-zinc-900 hover:bg-cyan-500/20 text-zinc-300 hover:text-cyan-300 border border-zinc-800 flex items-center justify-center"
                title="Pan Right"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div></div>
              <button
                onClick={() => handlePtzMove(0, 10)}
                className="p-1 rounded bg-zinc-900 hover:bg-cyan-500/20 text-zinc-300 hover:text-cyan-300 border border-zinc-800 flex items-center justify-center"
                title="Tilt Down"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <div></div>
            </div>
            <div className="text-[8px] text-zinc-500">
              P: {config.ptz.pan}° | T: {config.ptz.tilt}°
            </div>
          </div>
        )}

        {/* Tactical HUD Telemetry Layer */}
        <div className="absolute inset-0 pointer-events-none p-3 flex flex-col justify-between z-10 font-mono">
          {/* Top Real-Time Data Overlay */}
          {showOverlay && matchedDrone ? (
            <div className="w-full">
              <DroneDataOverlay drone={matchedDrone} compact={!isFocused} showFullHud={isFocused} />
            </div>
          ) : (
            <div className="flex justify-between items-start text-[10px] text-cyan-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
              <div className="bg-black/60 px-2 py-0.5 rounded border border-cyan-500/30 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                <span>REC {formatRecTime(recSeconds)}</span>
                <span className="text-zinc-400">| 60 FPS</span>
              </div>
              {matchedDrone && (
                <div className="bg-black/60 px-2 py-0.5 rounded border border-cyan-500/30 text-right">
                  <div>LAT {matchedDrone.coordinates.lat.toFixed(4)}°</div>
                  <div>LNG {matchedDrone.coordinates.lng.toFixed(4)}°</div>
                </div>
              )}
            </div>
          )}

          {/* Center Tactical Crosshair */}
          <div className="flex justify-center items-center flex-1">
            <div className="relative w-16 h-16 border border-cyan-500/25 rounded-full flex items-center justify-center">
              <div className="w-1 h-1 bg-cyan-400 rounded-full" />
              <div className="w-full h-0.5 bg-cyan-500/20 absolute"></div>
              <div className="h-full w-0.5 bg-cyan-500/20 absolute"></div>
            </div>
          </div>

          {/* Bottom HUD */}
          <div className="flex justify-between items-end text-[10px] text-cyan-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
            {matchedDrone ? (
              <div className="bg-black/60 px-2 py-0.5 rounded border border-cyan-500/30 flex gap-2">
                <span>ALT {matchedDrone.telemetry.altitude}m</span>
                <span className="text-zinc-400">|</span>
                <span>SPD {matchedDrone.telemetry.speed.toFixed(1)} km/h</span>
                <span className="text-zinc-400">|</span>
                <span
                  className={
                    matchedDrone.battery < 20 ? "text-rose-400 font-bold" : "text-emerald-400"
                  }
                >
                  BAT {matchedDrone.battery}%
                </span>
              </div>
            ) : (
              <div className="bg-black/60 px-2 py-0.5 rounded border border-cyan-500/30">
                STATIC SENSOR LINKED
              </div>
            )}

            <div className="bg-black/60 px-2 py-0.5 rounded border border-cyan-500/30 flex items-center gap-1.5">
              <span className="text-zinc-400">FILTER:</span>
              <span className="uppercase text-cyan-300 font-bold">{config.visionMode}</span>
            </div>
          </div>
        </div>

        {/* Scanline CRT overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none opacity-25 z-10" />
      </div>
    </div>
  );
}
