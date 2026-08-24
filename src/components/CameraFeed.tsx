import React, { useEffect, useRef, useState, useCallback } from "react";
import { useDRS } from "../store";
import {
  Maximize2,
  Minimize2,
  Camera,
  GripHorizontal,
  Eye,
  Crosshair,
  Compass,
  ChevronDown,
  Check,
  Layers,
  Video,
  Activity,
  Gauge,
  Sparkles,
  Users,
  Radio,
  Wifi,
  ChevronLeft,
  ChevronRight,
  Share2,
  User,
  RefreshCw,
} from "lucide-react";
import { motion, useDragControls } from "motion/react";
import { Drone } from "../types";
import {
  VisionMode,
  getAvailableCameraSources,
  CameraSourceInfo,
} from "./camera/CameraTypes";
import { useCameraSources } from "./camera/useCameraSources";
import { CameraRenderer } from "./camera/CameraRenderer";
import { DroneDataOverlay } from "./camera/DroneDataOverlay";

interface CameraFeedProps {
  drone?: Drone;
  isFloating?: boolean;
  onClose?: () => void;
}

type HudMode = "full" | "compact" | "reticle_only" | "off";
type SelectorCategory = "all" | "drones" | "visitors" | "fixed";

export function CameraFeed({ drone, isFloating = true, onClose }: CameraFeedProps) {
  const { drones, selectedDrone, currentUser } = useDRS();
  const targetDrone = drone || selectedDrone;

  const {
    sources: availableSources,
    allSources,
    visitors,
    visitorSources,
    isBroadcasting,
    toggleBroadcasting,
    switchCameraFacing,
    facingMode,
    activeVisitorCount,
    realDeviceCount,
  } = useCameraSources(drones, true, currentUser?.username || "Operator");

  const defaultSourceId = targetDrone
    ? `${targetDrone.id}-rgb-gimbal`
    : "DRN-01-rgb-gimbal";

  const [selectedSourceId, setSelectedSourceId] = useState<string>(defaultSourceId);
  const [selectorCategory, setSelectorCategory] = useState<SelectorCategory>("all");
  const [visionMode, setVisionMode] = useState<VisionMode>("normal");
  const [showFiltersMenu, setShowFiltersMenu] = useState(false);
  const [showSelectorMenu, setShowSelectorMenu] = useState(false);
  const [showAiBoxes, setShowAiBoxes] = useState(true);
  const [hudMode, setHudMode] = useState<HudMode>("full");
  const [zoom, setZoom] = useState<1 | 2 | 4>(1);
  const [ptz, setPtz] = useState<{ pan: number; tilt: number }>({ pan: 0, tilt: 0 });
  const [snapshotFlash, setSnapshotFlash] = useState(false);
  const [recSeconds, setRecSeconds] = useState(145);

  // Resizeable dimensions state
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 480,
    height: 320,
  });
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  // Sync selected drone if source wasn't manually overridden
  useEffect(() => {
    if (
      targetDrone &&
      selectedSourceId.startsWith("DRN-") &&
      !selectedSourceId.includes(targetDrone.id)
    ) {
      setSelectedSourceId(`${targetDrone.id}-rgb-gimbal`);
    }
  }, [targetDrone?.id]);

  const activeSource =
    availableSources.find((s) => s.id === selectedSourceId) ||
    allSources.find((s) => s.id === selectedSourceId) ||
    availableSources[0] ||
    allSources[0];

  const matchedDrone = drones.find((d) => d.id === activeSource?.droneId) || targetDrone;
  const isVisitorFeed = activeSource?.lensType === "visitor-camera";

  // Filter only available camera sources for the dropdown
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
      setSelectedSourceId(allVisitorList[0].id);
      return;
    }
    const nextIdx =
      direction === "next"
        ? (currentVisitorIdx + 1) % allVisitorList.length
        : (currentVisitorIdx - 1 + allVisitorList.length) % allVisitorList.length;
    setSelectedSourceId(allVisitorList[nextIdx].id);
  };

  // Recording counter
  useEffect(() => {
    const timer = setInterval(() => {
      setRecSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatRecTime = (sec: number) => {
    const hrs = Math.floor(sec / 3600).toString().padStart(2, "0");
    const mins = Math.floor((sec % 3600) / 60).toString().padStart(2, "0");
    const secs = (sec % 60).toString().padStart(2, "0");
    return `${hrs}:${mins}:${secs}`;
  };

  const takeSnapshot = () => {
    setSnapshotFlash(true);
    setTimeout(() => setSnapshotFlash(false), 250);
  };

  // Interactive Resizing handlers
  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    resizeStartRef.current = {
      x: clientX,
      y: clientY,
      w: dimensions.width,
      h: dimensions.height,
    };
  };

  useEffect(() => {
    if (!isResizing) return;

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!resizeStartRef.current) return;
      const clientX = "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

      const deltaX = clientX - resizeStartRef.current.x;
      const deltaY = clientY - resizeStartRef.current.y;

      const newWidth = Math.max(320, Math.min(960, resizeStartRef.current.w + deltaX));
      const newHeight = Math.max(220, Math.min(650, resizeStartRef.current.h + deltaY));

      setDimensions({
        width: Math.round(newWidth),
        height: Math.round(newHeight),
      });
    };

    const handlePointerUp = () => {
      setIsResizing(false);
      resizeStartRef.current = null;
    };

    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseup", handlePointerUp);
    window.addEventListener("touchmove", handlePointerMove);
    window.addEventListener("touchend", handlePointerUp);

    return () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);
      window.removeEventListener("touchmove", handlePointerMove);
      window.removeEventListener("touchend", handlePointerUp);
    };
  }, [isResizing]);

  // Quick Preset Dimensions
  const setPresetDimension = (preset: "compact" | "default" | "wide" | "cinema") => {
    if (preset === "compact") setDimensions({ width: 360, height: 240 });
    if (preset === "default") setDimensions({ width: 480, height: 320 });
    if (preset === "wide") setDimensions({ width: 640, height: 400 });
    if (preset === "cinema") setDimensions({ width: 800, height: 480 });
  };

  // Dimensions preset cycling for compact mode
  const cycleDimensions = () => {
    if (dimensions.width <= 380) {
      setDimensions({ width: 480, height: 320 });
    } else if (dimensions.width <= 520) {
      setDimensions({ width: 640, height: 400 });
    } else if (dimensions.width <= 680) {
      setDimensions({ width: 800, height: 480 });
    } else {
      setDimensions({ width: 360, height: 240 });
    }
  };

  const isTiny = dimensions.width < 380;
  const isCompact = dimensions.width < 500;
  const isMedium = dimensions.width >= 500 && dimensions.width < 660;
  const isWide = dimensions.width >= 660;
  const isShort = dimensions.height < 270;
  const isTall = dimensions.height >= 380;

  const dragControls = useDragControls();

  const content = (
    <div
      style={isFloating ? { width: `${dimensions.width}px`, height: `${dimensions.height}px` } : undefined}
      className={`bg-zinc-950/90 backdrop-blur-xl border border-cyan-500/40 rounded-xl overflow-hidden shadow-[0_12px_35px_rgba(0,0,0,0.8),0_0_20px_rgba(6,182,212,0.15)] flex flex-col ${
        isFloating ? "" : "w-full h-full min-h-[260px]"
      } select-none relative group/cam font-mono transition-[border-color] duration-150`}
    >
      {/* Window Top Bar (Drag handle when floating) */}
      <div
        onPointerDown={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest("button, input, select, a, [role='button'], .no-drag")) {
            return;
          }
          if (isFloating) {
            dragControls.start(e);
          }
        }}
        className={`flex items-center justify-between px-2.5 py-1.5 border-b border-zinc-800/80 bg-zinc-900/90 backdrop-blur-md select-none ${
          isFloating ? "cursor-grab active:cursor-grabbing" : ""
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {isFloating && (
            <div className="text-zinc-500 hover:text-cyan-400 p-0.5" title="Drag window to reposition">
              <GripHorizontal className="w-3.5 h-3.5" />
            </div>
          )}

          {/* Camera Source Selector Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowSelectorMenu(!showSelectorMenu);
              setShowFiltersMenu(false);
            }}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[11px] font-bold transition-colors truncate ${
              isTiny ? "max-w-[100px]" : isCompact ? "max-w-[145px]" : "max-w-[210px]"
            } ${
              isVisitorFeed
                ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-200 hover:bg-emerald-900/60"
                : "bg-zinc-800/90 hover:bg-zinc-700/90 border-zinc-700/80 text-zinc-200"
            }`}
            title="Click to switch drone, visitor camera, or ground sensor"
          >
            {isVisitorFeed ? (
              <Users className="w-3 h-3 text-emerald-400 shrink-0" />
            ) : (
              <Video className="w-3 h-3 text-cyan-400 shrink-0" />
            )}
            <span className="truncate">{activeSource.shortLabel}</span>
            <ChevronDown className="w-2.5 h-2.5 text-zinc-400 shrink-0 ml-0.5" />
          </button>

          {/* Live Indicator */}
          {!isTiny && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/30 text-[9px] text-rose-400 font-bold">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              <span>LIVE</span>
            </div>
          )}

          {/* If viewing visitor, quick cycle arrow buttons */}
          {isVisitorFeed && allVisitorList.length > 1 && !isTiny && (
            <div className="flex items-center gap-0.5 bg-zinc-950/70 border border-emerald-500/30 rounded px-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  cycleVisitor("prev");
                }}
                className="p-0.5 text-zinc-400 hover:text-emerald-300"
                title="View previous visitor camera"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <span className="text-[9px] text-emerald-400 px-0.5">
                {currentVisitorIdx + 1}/{allVisitorList.length}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  cycleVisitor("next");
                }}
                className="p-0.5 text-zinc-400 hover:text-emerald-300"
                title="View next visitor camera"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Action Controls - Responsively Scaled */}
        <div className="flex items-center gap-1 text-zinc-400 shrink-0">
          {/* Quick Broadcast Camera Toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleBroadcasting();
            }}
            className={`px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1 border transition-colors ${
              isBroadcasting
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                : "border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"
            }`}
            title={
              isBroadcasting
                ? "Broadcasting camera to all devices (Click to stop)"
                : "Broadcast your device camera to other devices"
            }
          >
            <Radio className={`w-3 h-3 ${isBroadcasting ? "text-emerald-400 animate-pulse" : "text-zinc-500"}`} />
            {!isCompact && <span>{isBroadcasting ? "SHARING" : "SHARE"}</span>}
          </button>

          {/* If broadcasting, option to flip front/rear camera */}
          {isBroadcasting && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                switchCameraFacing();
              }}
              className="p-1 rounded text-zinc-400 hover:text-cyan-300 hover:bg-zinc-800 transition-colors"
              title={`Flip Camera Sensor (${facingMode === "user" ? "Front" : "Rear"})`}
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          )}

          {/* Data Overlay / HUD Mode Switcher */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setHudMode((prev) =>
                prev === "full" ? "compact" : prev === "compact" ? "reticle_only" : prev === "reticle_only" ? "off" : "full"
              );
            }}
            className={`px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1 border transition-colors ${
              hudMode !== "off"
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                : "border-zinc-800 text-zinc-500 hover:text-zinc-300"
            }`}
            title={`Telemetry HUD Mode: ${hudMode.toUpperCase()} (Click to cycle)`}
          >
            <Activity className="w-3 h-3 text-cyan-400" />
            {isTiny ? (
              <span className="uppercase text-[9px]">{hudMode === "full" ? "F" : hudMode === "compact" ? "C" : hudMode === "reticle_only" ? "R" : "OFF"}</span>
            ) : !isCompact ? (
              <span className="uppercase">{hudMode}</span>
            ) : null}
          </button>

          {/* AI Detection Toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowAiBoxes(!showAiBoxes);
            }}
            className={`p-1 rounded transition-colors ${
              showAiBoxes ? "text-emerald-400 bg-emerald-950/60" : "hover:text-zinc-200"
            }`}
            title="AI Target Tracking overlay"
          >
            <Crosshair className="w-3 h-3" />
          </button>

          {/* Vision Filters Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowFiltersMenu(!showFiltersMenu);
                setShowSelectorMenu(false);
              }}
              className={`p-1 rounded hover:bg-zinc-800 transition-colors ${
                visionMode !== "normal" ? "text-cyan-400 bg-cyan-950/60" : "hover:text-zinc-200"
              }`}
              title="Tactical Optical Filters (NVG, Thermal, Mono)"
            >
              <Eye className="w-3 h-3" />
            </button>

            {showFiltersMenu && (
              <div className="absolute right-0 mt-2 w-36 bg-zinc-950/95 border border-zinc-800 rounded-lg p-1.5 shadow-2xl backdrop-blur-xl flex flex-col gap-1 z-50 font-mono text-[11px]">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setVisionMode("normal");
                    setShowFiltersMenu(false);
                  }}
                  className={`flex items-center justify-between px-2 py-1 rounded transition-colors ${
                    visionMode === "normal" ? "bg-cyan-500/20 text-cyan-300 font-bold" : "text-zinc-400 hover:bg-zinc-900"
                  }`}
                >
                  <span>Standard RGB</span>
                  {visionMode === "normal" && <Check className="w-3 h-3 text-cyan-400" />}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setVisionMode("nvg");
                    setShowFiltersMenu(false);
                  }}
                  className={`flex items-center justify-between px-2 py-1 rounded transition-colors ${
                    visionMode === "nvg" ? "bg-emerald-500/20 text-emerald-300 font-bold" : "text-zinc-400 hover:bg-zinc-900"
                  }`}
                >
                  <span>NVG Night-Vis</span>
                  {visionMode === "nvg" && <Check className="w-3 h-3 text-emerald-400" />}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setVisionMode("thermal");
                    setShowFiltersMenu(false);
                  }}
                  className={`flex items-center justify-between px-2 py-1 rounded transition-colors ${
                    visionMode === "thermal" ? "bg-amber-500/20 text-amber-300 font-bold" : "text-zinc-400 hover:bg-zinc-900"
                  }`}
                >
                  <span>FLIR Thermal</span>
                  {visionMode === "thermal" && <Check className="w-3 h-3 text-amber-400" />}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setVisionMode("mono");
                    setShowFiltersMenu(false);
                  }}
                  className={`flex items-center justify-between px-2 py-1 rounded transition-colors ${
                    visionMode === "mono" ? "bg-zinc-500/20 text-zinc-200 font-bold" : "text-zinc-400 hover:bg-zinc-900"
                  }`}
                >
                  <span>Tactical Mono</span>
                  {visionMode === "mono" && <Check className="w-3 h-3 text-zinc-300" />}
                </button>
              </div>
            )}
          </div>

          {/* Zoom Cycle */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setZoom((prev) => (prev === 1 ? 2 : prev === 2 ? 4 : 1));
            }}
            className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors ${
              zoom > 1 ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" : "border-zinc-800 text-zinc-400"
            }`}
            title="Digital Zoom"
          >
            {zoom}x
          </button>

          {/* Snapshot Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              takeSnapshot();
            }}
            className="p-1 rounded hover:bg-zinc-800 hover:text-cyan-400 transition-colors"
            title="Take Recon Snapshot"
          >
            <Camera className="w-3 h-3" />
          </button>

          {/* Preset Sizing options when floating - Adapt dynamically based on viewer width */}
          {isFloating && (
            <>
              {isWide ? (
                <div className="flex items-center gap-0.5 border-l border-zinc-800 pl-1 ml-0.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPresetDimension("compact");
                    }}
                    className={`px-1 py-0.5 text-[9px] rounded transition-colors ${
                      dimensions.width <= 380 ? "bg-cyan-500/30 text-cyan-300 font-bold" : "hover:text-cyan-300 hover:bg-zinc-800"
                    }`}
                    title="Compact (360x240)"
                  >
                    S
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPresetDimension("default");
                    }}
                    className={`px-1 py-0.5 text-[9px] rounded transition-colors ${
                      dimensions.width > 380 && dimensions.width <= 520 ? "bg-cyan-500/30 text-cyan-300 font-bold" : "hover:text-cyan-300 hover:bg-zinc-800"
                    }`}
                    title="Medium (480x320)"
                  >
                    M
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPresetDimension("wide");
                    }}
                    className={`px-1 py-0.5 text-[9px] rounded transition-colors ${
                      dimensions.width > 520 && dimensions.width <= 680 ? "bg-cyan-500/30 text-cyan-300 font-bold" : "hover:text-cyan-300 hover:bg-zinc-800"
                    }`}
                    title="Wide (640x400)"
                  >
                    L
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPresetDimension("cinema");
                    }}
                    className={`px-1 py-0.5 text-[9px] rounded transition-colors ${
                      dimensions.width > 680 ? "bg-cyan-500/30 text-cyan-300 font-bold" : "hover:text-cyan-300 hover:bg-zinc-800"
                    }`}
                    title="Cinema (800x480)"
                  >
                    XL
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    cycleDimensions();
                  }}
                  className="p-1 rounded text-zinc-400 hover:text-cyan-300 hover:bg-zinc-800 transition-colors ml-0.5"
                  title={`Preset Size (${dimensions.width}x${dimensions.height}px) - Click to cycle size`}
                >
                  <Maximize2 className="w-3 h-3" />
                </button>
              )}
            </>
          )}

          {/* Close button if provided */}
          {onClose && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors ml-0.5"
              title="Close camera viewer"
            >
              <Minimize2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Floating Camera Selector Popover */}
      {showSelectorMenu && (
        <div className="absolute inset-x-2 top-11 bottom-2 z-40 bg-zinc-950/95 border border-cyan-500/40 rounded-xl p-3 shadow-2xl backdrop-blur-xl flex flex-col font-mono">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800 mb-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
                Select Available Camera
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
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold"
                    : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200"
                }`}
                title="Broadcast your camera as a visitor node"
              >
                <Radio className={`w-3 h-3 ${isBroadcasting ? "text-emerald-400 animate-pulse" : "text-zinc-400"}`} />
                <span>{isBroadcasting ? "BROADCASTING" : "BROADCAST MY CAM"}</span>
              </button>
              <button
                onClick={() => setShowSelectorMenu(false)}
                className="text-xs text-zinc-400 hover:text-zinc-100 p-1"
              >
                ✕
              </button>
            </div>
          </div>            {/* Category Filter Tabs */}
          <div className="flex gap-1.5 mb-2.5 overflow-x-auto custom-scrollbar pb-0.5">
            {[
              { id: "all", label: "All Cameras", icon: Layers },
              { id: "visitors", label: `Visitors & Root (${activeVisitorCount})`, icon: Users, badge: true },
              { id: "drones", label: "Drones", icon: Video },
              { id: "fixed", label: "Ground CCTVs", icon: Video },
            ].map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectorCategory(cat.id as SelectorCategory)}
                  className={`px-2 py-1 rounded text-[10px] uppercase font-bold transition-colors flex items-center gap-1.5 shrink-0 ${
                    selectorCategory === cat.id
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                      : "text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800"
                  }`}
                >
                  <Icon className="w-3 h-3 text-cyan-400" />
                  <span>{cat.label}</span>
                  {cat.badge && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1.5 pr-1">
            {filteredSources.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 text-center text-zinc-500">
                <Video className="w-6 h-6 mb-2 opacity-40" />
                <span className="text-xs">No active camera devices available in this category</span>
              </div>
            ) : (
              filteredSources.map((src) => {
                const isSelected = src.id === selectedSourceId;
                const isSrcVisitor = src.lensType === "visitor-camera";
                const isRootDevice = src.isRoot || src.isSelf;
                return (
                  <button
                    key={src.id}
                    onClick={() => {
                      setSelectedSourceId(src.id);
                      setShowSelectorMenu(false);
                    }}
                    className={`flex items-center justify-between p-2 rounded-lg border text-left transition-all ${
                      isSelected
                        ? isRootDevice
                          ? "bg-emerald-500/20 border-emerald-400 text-emerald-100 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                          : isSrcVisitor
                          ? "bg-emerald-500/15 border-emerald-500/60 text-emerald-200"
                          : "bg-cyan-500/15 border-cyan-500/60 text-cyan-200"
                        : isRootDevice
                        ? "bg-zinc-900/90 border-emerald-500/40 hover:bg-zinc-800/90 text-zinc-200"
                        : "bg-zinc-900/60 border-zinc-800 hover:bg-zinc-800/80 text-zinc-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-2 h-2 rounded-full shrink-0 animate-pulse ${
                          isRootDevice ? "bg-emerald-400 ring-2 ring-emerald-500/30" : isSrcVisitor ? "bg-emerald-400" : "bg-cyan-400"
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate flex items-center gap-1.5">
                          {isRootDevice ? (
                            <Radio className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : isSrcVisitor ? (
                            <User className="w-3 h-3 text-emerald-400 shrink-0" />
                          ) : null}
                          <span className="truncate">{src.label}</span>
                          {isRootDevice && (
                            <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 font-extrabold rounded border border-emerald-500/50">
                              ROOT (YOU)
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-500 truncate">
                          {src.resolution} • {src.sensorSpec}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <Check
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isRootDevice || isSrcVisitor ? "text-emerald-400" : "text-cyan-400"
                        }`}
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Main Video Viewport */}
      <div className="relative flex-1 bg-zinc-950 flex items-center justify-center overflow-hidden min-h-[160px]">
        {snapshotFlash && <div className="absolute inset-0 bg-white z-50 animate-fade-out pointer-events-none" />}

        <CameraRenderer
          source={activeSource}
          drone={matchedDrone}
          visionMode={visionMode}
          zoom={zoom}
          ptz={ptz}
          showAiBoxes={showAiBoxes}
          onSnapshot={takeSnapshot}
        />

        {/* REAL-TIME DATA OVERLAY HUD COMPONENT */}
        <div className="absolute inset-0 pointer-events-none p-2.5 flex flex-col justify-between z-10">
          {/* Top Real-time telemetry row or full overlay */}
          {!isVisitorFeed && hudMode === "full" && (
            <div className="w-full">
              <DroneDataOverlay
                drone={matchedDrone}
                compact={isShort || isCompact}
                showFullHud={!isShort && dimensions.height >= 320 && dimensions.width >= 500}
              />
            </div>
          )}

          {!isVisitorFeed && hudMode === "compact" && (
            <div className="w-full">
              <DroneDataOverlay drone={matchedDrone} compact={true} />
            </div>
          )}

          {hudMode === "reticle_only" && (
            <div className="flex justify-between items-start text-[10px] text-cyan-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
              <div className="bg-black/60 px-2 py-0.5 rounded border border-cyan-500/30 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                <span>REC {formatRecTime(recSeconds)}</span>
              </div>
              {!isVisitorFeed && matchedDrone && (
                <div className="bg-black/60 px-2 py-0.5 rounded border border-cyan-500/30">
                  <span>ALT {matchedDrone.telemetry.altitude}m</span>
                </div>
              )}
            </div>
          )}

          {/* Center Crosshairs & Optical Reticle (scales with viewport size) */}
          {hudMode !== "off" && (
            <div className="flex justify-center items-center flex-1 pointer-events-none my-1">
              <div
                className={`relative ${
                  isShort ? "w-12 h-12" : "w-16 h-16 sm:w-20 sm:h-20"
                } border border-cyan-500/30 rounded-full flex items-center justify-center`}
              >
                <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(6,182,212,1)]" />
                <div className="w-full h-0.5 bg-cyan-500/30 absolute"></div>
                <div className="h-full w-0.5 bg-cyan-500/30 absolute"></div>
                <div className="absolute top-1 left-1 w-2 h-2 border-t-2 border-l-2 border-cyan-400"></div>
                <div className="absolute top-1 right-1 w-2 h-2 border-t-2 border-r-2 border-cyan-400"></div>
                <div className="absolute bottom-1 left-1 w-2 h-2 border-b-2 border-l-2 border-cyan-400"></div>
                <div className="absolute bottom-1 right-1 w-2 h-2 border-b-2 border-r-2 border-cyan-400"></div>
              </div>
            </div>
          )}

          {/* Bottom Telemetry & REC Bar */}
          <div className="flex justify-between items-end text-[10px] text-cyan-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
            <div className="bg-black/70 px-2 py-0.5 rounded border border-cyan-500/30 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
              <span>REC {formatRecTime(recSeconds)}</span>
              {!isTiny && <span className="text-zinc-400">| 60 FPS</span>}
            </div>

            <div className="bg-black/70 px-2 py-0.5 rounded border border-cyan-500/30 flex items-center gap-1.5">
              <span className="text-zinc-400">SENSOR:</span>
              <span className="uppercase text-cyan-300 font-bold">{visionMode}</span>
            </div>
          </div>
        </div>

        {/* CRT Scanline Overlay Effect */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none opacity-25 z-10" />

        {/* Floating Interactive Resize Drag Handle at Bottom-Right */}
        {isFloating && (
          <div
            onMouseDown={handleResizeStart}
            onTouchStart={handleResizeStart}
            className="absolute bottom-0 right-0 w-6 h-6 z-30 cursor-nwse-resize flex items-end justify-end p-1 group/resize hover:bg-cyan-500/20 rounded-tl-lg transition-colors select-none"
            title="Drag corner to resize camera window"
          >
            <div className="w-3 h-3 border-r-2 border-b-2 border-cyan-400 group-hover/resize:border-white transition-colors" />
          </div>
        )}

        {/* Live Resize Dimension Tooltip Badge */}
        {isResizing && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/90 border border-cyan-400 px-3 py-1.5 rounded-lg text-cyan-300 font-mono text-xs font-bold shadow-2xl z-40 pointer-events-none">
            {dimensions.width} × {dimensions.height} px
          </div>
        )}
      </div>
    </div>
  );

  if (isFloating) {
    return (
      <motion.div
        drag
        dragControls={dragControls}
        dragListener={false}
        dragMomentum={false}
        dragElastic={0.05}
        initial={{ x: 24, y: 0, opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="pointer-events-auto cursor-default z-[500]"
        style={{ touchAction: "none" }}
      >
        {content}
      </motion.div>
    );
  }

  return content;
}

