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
  Radio,
  Users,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Share2,
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
  const {
    sources: availableSources,
    allSources,
    visitors,
    visitorSources,
    isBroadcasting,
    startBroadcasting,
    stopBroadcasting,
    toggleBroadcasting,
    switchCameraFacing,
    facingMode,
    activeVisitorCount,
    realDeviceCount,
    myDeviceId,
  } = useCameraSources(drones, true);

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

  // Visitor quick cycle helper
  const allVisitorList = availableSources.filter((s) => s.lensType === "visitor-camera");
  const currentVisitorIdx = allVisitorList.findIndex((s) => s.id === activeSource?.id);

  const cycleVisitor = (direction: "next" | "prev") => {
    if (allVisitorList.length === 0) return;
    if (currentVisitorIdx === -1) {
      onUpdateConfig(config.slotId, { cameraSourceId: allVisitorList[0].id });
      return;
    }
    const nextIdx =
      direction === "next"
        ? (currentVisitorIdx + 1) % allVisitorList.length
        : (currentVisitorIdx - 1 + allVisitorList.length) % allVisitorList.length;
    onUpdateConfig(config.slotId, { cameraSourceId: allVisitorList[nextIdx].id });
  };

  const isCurrentVisitorFeed = activeSource?.lensType === "visitor-camera";
  const isRootOrSelf = activeSource?.isRoot || activeSource?.isSelf;

  return (
    <div className="w-full h-full bg-zinc-950 border border-zinc-800/80 rounded-xl overflow-hidden shadow-2xl flex flex-col relative group/win transition-all select-none">
      {/* Flash Effect on Snapshot */}
      {snapshotFlash && (
        <div className="absolute inset-0 bg-white z-50 animate-fade-out pointer-events-none" />
      )}

      {/* Window Top Control Bar */}
      <div className="px-3 py-2 bg-zinc-900/90 border-b border-zinc-800/80 flex items-center justify-between gap-2 z-30 font-mono">
        {/* Left: Camera Selector Dropdown + Quick Visitor Navigator */}
        <div className="relative flex items-center gap-1.5 min-w-0">
          <button
            onClick={() => {
              setIsSelectorOpen(!isSelectorOpen);
              setIsFiltersOpen(false);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-bold transition-colors truncate max-w-[210px] ${
              isRootOrSelf
                ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-200 hover:bg-emerald-900/80"
                : isCurrentVisitorFeed
                ? "bg-cyan-950/80 border-cyan-500/50 text-cyan-200 hover:bg-cyan-900/80"
                : "bg-zinc-800/90 hover:bg-zinc-700/90 border-zinc-700/80 text-zinc-200"
            }`}
            title="Click to switch camera source, view other visitors, or drones"
          >
            {isRootOrSelf ? (
              <Radio className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : isCurrentVisitorFeed ? (
              <Users className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            ) : (
              <Video className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            )}
            <span className="truncate">{activeSource.shortLabel}</span>
            <span className="text-[10px] text-cyan-400 shrink-0 font-normal">
              [{activeSource.lensName}]
            </span>
            <ChevronDown className="w-3 h-3 text-zinc-400 shrink-0 ml-0.5" />
          </button>

          {/* Quick cycle buttons for visitor cameras */}
          {allVisitorList.length > 1 && (
            <div className="hidden sm:flex items-center gap-0.5 bg-zinc-900 border border-zinc-800 rounded p-0.5 text-zinc-400">
              <button
                onClick={() => cycleVisitor("prev")}
                className="p-0.5 hover:text-cyan-300 hover:bg-zinc-800 rounded"
                title="Previous Visitor Camera"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <span className="text-[9px] px-1 font-bold text-zinc-400">
                {currentVisitorIdx >= 0 ? `${currentVisitorIdx + 1}/${allVisitorList.length}` : `V-MESH`}
              </span>
              <button
                onClick={() => cycleVisitor("next")}
                className="p-0.5 hover:text-cyan-300 hover:bg-zinc-800 rounded"
                title="Next Visitor Camera"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* REC Status Badge */}
          <div className="hidden md:flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/30 text-[9px] text-rose-400 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
            <span>LIVE</span>
          </div>
        </div>

        {/* Right: Quick Action Controls + Live Stream Broadcast Toggle */}
        <div className="flex items-center gap-1 text-zinc-400 shrink-0">
          {/* Live Broadcast Button */}
          <button
            onClick={toggleBroadcasting}
            className={`px-2 py-1 rounded text-xs flex items-center gap-1.5 border transition-all ${
              isBroadcasting
                ? "bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.25)] font-bold animate-pulse"
                : "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/40"
            }`}
            title={
              isBroadcasting
                ? "Live Streaming Active • Click to Stop Broadcasting"
                : "Live Stream Your Camera • Allow all other visitors to view your feed"
            }
          >
            <Radio className={`w-3.5 h-3.5 ${isBroadcasting ? "text-rose-400 animate-spin" : "text-emerald-400"}`} />
            <span className="text-[10px] hidden sm:inline font-bold">
              {isBroadcasting ? "BROADCASTING" : "LIVE STREAM"}
            </span>
          </button>

          {/* Flip camera sensor if broadcasting */}
          {isBroadcasting && (
            <button
              onClick={switchCameraFacing}
              className="p-1 rounded text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
              title={`Flip Camera (${facingMode === "user" ? "Front" : "Back/Environment"})`}
            >
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            </button>
          )}

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
                Select Camera Source
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                {filteredSources.length} AVAILABLE
              </span>
            </div>

            {/* Broadcast My Camera button inside selector header */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleBroadcasting}
                className={`px-2 py-0.5 rounded text-[10px] flex items-center gap-1 border transition-colors ${
                  isBroadcasting
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/50 font-bold"
                    : "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30"
                }`}
                title="Broadcast your camera as a live stream for other visitors"
              >
                <Radio className="w-3 h-3" />
                <span>{isBroadcasting ? "Stop Live Stream" : "Live Stream My Camera"}</span>
              </button>
              <button
                onClick={() => setIsSelectorOpen(false)}
                className="text-xs text-zinc-400 hover:text-zinc-100 p-1"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex gap-1.5 mb-2.5 overflow-x-auto custom-scrollbar pb-0.5">
            {[
              { id: "all", label: "All Cameras", icon: Layers },
              { id: "visitors", label: `Visitors & Root (${activeVisitorCount})`, icon: Users, badge: true },
              { id: "drones", label: "Drones", icon: Video },
              { id: "fixed", label: "Ground CCTVs", icon: Video },
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
                const isRootDevice = src.isRoot || src.isSelf;
                const isVisitor = src.lensType === "visitor-camera";
                return (
                  <button
                    key={src.id}
                    onClick={() => {
                      onUpdateConfig(config.slotId, { cameraSourceId: src.id });
                      setIsSelectorOpen(false);
                    }}
                    className={`flex items-center justify-between p-2 rounded-lg border text-left transition-all ${
                      isSelected
                        ? isRootDevice
                          ? "bg-emerald-500/20 border-emerald-400 text-emerald-100 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                          : "bg-cyan-500/15 border-cyan-500/60 text-cyan-200"
                        : isRootDevice
                        ? "bg-zinc-900/90 border-emerald-500/40 hover:bg-zinc-800/90 text-zinc-200"
                        : "bg-zinc-900/60 border-zinc-800 hover:bg-zinc-800/80 text-zinc-300"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-2 h-2 rounded-full shrink-0 animate-pulse ${
                          isRootDevice ? "bg-emerald-400 ring-2 ring-emerald-500/30" : isVisitor ? "bg-emerald-400" : "bg-cyan-400"
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate flex items-center gap-1.5">
                          {isRootDevice ? (
                            <Radio className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : isVisitor ? (
                            <Users className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          ) : null}
                          <span className="truncate">{src.label}</span>
                          {isRootDevice && (
                            <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 font-extrabold rounded border border-emerald-500/50">
                              ROOT (YOU)
                            </span>
                          )}
                          {src.isRealDevice && !isRootDevice && (
                            <span className="text-[8px] px-1 bg-emerald-950 text-emerald-400 rounded border border-emerald-500/40 animate-pulse">
                              LIVE
                            </span>
                          )}
                        </div>
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

        {/* Broadcasting Notification Banner (Floating bottom center) */}
        {isBroadcasting && (
          <div className="absolute bottom-3 inset-x-4 max-w-sm mx-auto z-30 bg-black/90 backdrop-blur-md border border-rose-500/60 rounded-lg px-3 py-1.5 shadow-2xl flex items-center justify-between gap-2 font-mono text-[10px]">
            <div className="flex items-center gap-1.5 text-rose-300">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span className="font-bold">LIVE BROADCASTING</span>
              <span className="text-zinc-400 hidden sm:inline">• Viewable by other visitors</span>
            </div>
            <div className="flex items-center gap-1">
              {!isRootOrSelf && (
                <button
                  onClick={() => {
                    const selfSrc = availableSources.find((s) => s.isRoot || s.isSelf);
                    if (selfSrc) onUpdateConfig(config.slotId, { cameraSourceId: selfSrc.id });
                  }}
                  className="px-1.5 py-0.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded border border-emerald-500/40 text-[9px]"
                >
                  View My Cam
                </button>
              )}
              <button
                onClick={stopBroadcasting}
                className="px-1.5 py-0.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded border border-rose-500/40 text-[9px]"
              >
                Stop
              </button>
            </div>
          </div>
        )}

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
            <div className="flex items-center justify-between w-full text-[8px] text-zinc-400 px-1">
              <span>P: {config.ptz.pan}°</span>
              <span>T: {config.ptz.tilt}°</span>
            </div>
          </div>
        )}

        {/* Telemetry HUD Data Overlay */}
        {matchedDrone && showOverlay && (
          <DroneDataOverlay drone={matchedDrone} />
        )}

        {/* Scanline CRT overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none opacity-25 z-10" />
      </div>
    </div>
  );
}

