import React, { useState, useEffect, useRef } from "react";
import { Drone } from "../../types";
import droneCameraFeed from "../../assets/images/drone_camera_feed_1787467816443.jpg";
import {
  Video,
  Camera,
  Maximize2,
  Minimize2,
  Crosshair,
  Sliders,
  Sparkles,
  Eye,
  RefreshCw,
  AlertCircle,
  Radio,
  Compass,
  ChevronDown,
  Layers,
  Check,
  Disc,
  Volume2,
  VolumeX,
  Target,
  Zap,
} from "lucide-react";

export type CameraLensId =
  | "rgb-gimbal"
  | "fpv-nose"
  | "belly-downward"
  | "flir-thermal"
  | "dock-cctv"
  | "mast-ptz"
  | "device-webcam";

export interface CameraLensOption {
  id: CameraLensId;
  label: string;
  shortTag: string;
  resolution: string;
  fov: string;
  fps: number;
  sensor: string;
  modeDescription: string;
}

export const CAMERA_OPTIONS: CameraLensOption[] = [
  {
    id: "rgb-gimbal",
    label: "4K RGB Gimbal (Primary)",
    shortTag: "4K MAIN",
    resolution: "3840x2160",
    fov: "84° Wide Optical",
    fps: 60,
    sensor: "1/1.3\" CMOS 48MP F/1.7",
    modeDescription: "Forward Stabilized Optical Gimbal",
  },
  {
    id: "fpv-nose",
    label: "FPV Pilot Nose Cam",
    shortTag: "FPV NOSE",
    resolution: "1920x1080",
    fov: "155° Ultrawide",
    fps: 120,
    sensor: "Low-Latency 12ms RF Pilot Stream",
    modeDescription: "High-Speed Navigation Cockpit",
  },
  {
    id: "belly-downward",
    label: "Downward Precision Belly Cam",
    shortTag: "BELLY NADIR",
    resolution: "1920x1080",
    fov: "95° Nadir",
    fps: 60,
    sensor: "Optical Flow & Laser Landing Lidar",
    modeDescription: "Vertical Precision Grid & Landing",
  },
  {
    id: "flir-thermal",
    label: "FLIR Radiometric Thermal IR",
    shortTag: "FLIR LWIR",
    resolution: "640x512",
    fov: "45° Fixed",
    fps: 30,
    sensor: "LWIR Radiometric <30mK NETD",
    modeDescription: "Thermal Heat Signature Inspection",
  },
  {
    id: "dock-cctv",
    label: "Base Station Hangar & Launchpad Cam",
    shortTag: "HQ DOCK",
    resolution: "2560x1440",
    fov: "110° Static",
    fps: 30,
    sensor: "Fixed Ground Station Hangar Cam",
    modeDescription: "Perimeter Launch & Pad Surveillance",
  },
  {
    id: "mast-ptz",
    label: "Sector A Perimeter Security Mast",
    shortTag: "MAST NORTH",
    resolution: "2560x1440",
    fov: "90° PTZ 30X",
    fps: 60,
    sensor: "Elevated 30m Dual Optical/IR Mast",
    modeDescription: "Long-Range Optical Sector Watch",
  },
  {
    id: "device-webcam",
    label: "Operator Device Live WebCam",
    shortTag: "OPERATOR",
    resolution: "1920x1080",
    fov: "80° Integrated",
    fps: 30,
    sensor: "Direct WebRTC Operator Optical",
    modeDescription: "Local Hardware Sensor Feed",
  },
];

interface LiveVideoPanelProps {
  drone: Drone;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
  isMasterRecording?: boolean;
  selectedCameraId?: CameraLensId;
  onSelectCamera?: (cameraId: CameraLensId) => void;
}

export function LiveVideoPanel({
  drone,
  isMaximized,
  onToggleMaximize,
  isMasterRecording = true,
  selectedCameraId = "rgb-gimbal",
  onSelectCamera,
}: LiveVideoPanelProps) {
  const [internalCameraId, setInternalCameraId] = useState<CameraLensId>(selectedCameraId);
  const activeCamId = onSelectCamera ? selectedCameraId : internalCameraId;
  const setCamId = (id: CameraLensId) => {
    if (onSelectCamera) onSelectCamera(id);
    else setInternalCameraId(id);
  };

  const [isCameraDropdownOpen, setIsCameraDropdownOpen] = useState(false);
  const cameraDropdownRef = useRef<HTMLDivElement>(null);

  const [zoom, setZoom] = useState<number>(1);
  const [visionFilter, setVisionFilter] = useState<"normal" | "nvg" | "mono" | "edge">("normal");
  const [showHud, setShowHud] = useState<boolean>(true);
  const [showAiBoxes, setShowAiBoxes] = useState<boolean>(true);
  const [ptz, setPtz] = useState<{ pan: number; tilt: number }>({ pan: 0, tilt: 0 });
  const [isPtzOpen, setIsPtzOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(isMasterRecording);
  const [recSeconds, setRecSeconds] = useState(0);
  const [snapshotToast, setSnapshotToast] = useState(false);

  // WebRTC user device camera state
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        cameraDropdownRef.current &&
        !cameraDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCameraDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync master recording
  useEffect(() => {
    setIsRecording(isMasterRecording);
  }, [isMasterRecording]);

  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => setRecSeconds((s) => s + 1), 1000);
    } else {
      setRecSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Handle device webcam activation
  useEffect(() => {
    if (activeCamId === "device-webcam") {
      let isMounted = true;
      navigator.mediaDevices
        ?.getUserMedia({ video: { width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
        .then((stream) => {
          if (isMounted) {
            setWebcamStream(stream);
            setWebcamError(null);
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
            }
          }
        })
        .catch((err) => {
          if (isMounted) {
            console.warn("Webcam access error:", err);
            setWebcamError("Camera access permission required or device unavailable");
          }
        });

      return () => {
        isMounted = false;
        if (webcamStream) {
          webcamStream.getTracks().forEach((track) => track.stop());
        }
      };
    } else {
      if (webcamStream) {
        webcamStream.getTracks().forEach((track) => track.stop());
        setWebcamStream(null);
      }
    }
  }, [activeCamId]);

  useEffect(() => {
    if (videoRef.current && webcamStream) {
      videoRef.current.srcObject = webcamStream;
    }
  }, [webcamStream]);

  const activeCamOption =
    CAMERA_OPTIONS.find((c) => c.id === activeCamId) || CAMERA_OPTIONS[0];

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const handleSnapshot = () => {
    setSnapshotToast(true);
    setTimeout(() => setSnapshotToast(false), 2500);
  };

  const getLensSpecificFilter = () => {
    if (activeCamId === "flir-thermal") {
      return "hue-rotate-[195deg] invert contrast-[185%] saturate-[280%]";
    }
    if (activeCamId === "belly-downward") {
      return "contrast-[125%] saturate-[110%] brightness-[95%]";
    }
    if (activeCamId === "fpv-nose") {
      return "contrast-[115%] saturate-[130%]";
    }
    if (activeCamId === "dock-cctv") {
      return "contrast-[110%] brightness-[98%]";
    }
    if (activeCamId === "mast-ptz") {
      return "contrast-[120%] saturate-[105%]";
    }

    switch (visionFilter) {
      case "nvg":
        return "sepia-[0.85] hue-rotate-[75deg] saturate-[300%] contrast-[130%] brightness-[105%]";
      case "mono":
        return "grayscale contrast-[140%] brightness-[90%]";
      case "edge":
        return "contrast-[200%] saturate-[0%] brightness-[120%]";
      default:
        return "";
    }
  };

  const transformStyle = {
    transform: `scale(${zoom}) translate(${ptz.pan * 0.4}px, ${ptz.tilt * 0.4}px)`,
    transformOrigin: "center center",
    transition: "transform 0.12s ease-out",
  };

  return (
    <div className="w-full h-full bg-zinc-950 border border-zinc-800/90 rounded-xl overflow-hidden flex flex-col relative group select-none shadow-xl">
      {/* Top Header Bar */}
      <div className="h-10 bg-zinc-900/95 border-b border-zinc-800/90 px-3 flex items-center justify-between z-20 shrink-0 gap-2">
        {/* Left: Camera Switcher Dropdown */}
        <div className="flex items-center gap-2 min-w-0" ref={cameraDropdownRef}>
          <div className="p-1 rounded bg-cyan-500/20 text-cyan-400 shrink-0">
            <Video className="w-3.5 h-3.5" />
          </div>

          <div className="relative">
            <button
              id="camera-switch-dropdown-btn"
              type="button"
              onClick={() => setIsCameraDropdownOpen(!isCameraDropdownOpen)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-850 hover:bg-zinc-800 border border-zinc-700/80 hover:border-cyan-500/50 text-zinc-100 transition-all text-xs font-mono font-medium group"
              title="Click to switch active optical/IR camera feed"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
              <span className="truncate max-w-[140px] sm:max-w-[200px] font-bold text-zinc-200">
                {activeCamOption.shortTag}: {activeCamOption.label.split("(")[0]}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${
                  isCameraDropdownOpen ? "rotate-180 text-cyan-400" : ""
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {isCameraDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-72 sm:w-80 bg-zinc-900 border border-zinc-700/90 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-2 bg-zinc-950/90 border-b border-zinc-800 text-[10px] font-mono text-zinc-400 flex items-center justify-between">
                  <span>SELECT CAMERA LENS / SOURCE</span>
                  <span className="text-cyan-400 font-bold">7 AVAILABLE</span>
                </div>

                <div className="py-1 max-h-72 overflow-y-auto custom-scrollbar divide-y divide-zinc-800/40">
                  {CAMERA_OPTIONS.map((cam) => {
                    const isSelected = cam.id === activeCamId;
                    return (
                      <button
                        key={cam.id}
                        type="button"
                        onClick={() => {
                          setCamId(cam.id);
                          setIsCameraDropdownOpen(false);
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
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-zinc-100 truncate">
                                {cam.label}
                              </span>
                            </div>
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

          <span className="hidden xl:inline text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 shrink-0">
            {activeCamOption.resolution} • {activeCamOption.fps}FPS
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Rec Status */}
          {isRecording ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/40 text-[10px] font-mono text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span>REC {formatTimer(recSeconds)}</span>
            </div>
          ) : (
            <div className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] font-mono text-zinc-400">
              STANDBY
            </div>
          )}

          {/* AI Toggle */}
          <button
            onClick={() => setShowAiBoxes(!showAiBoxes)}
            className={`p-1.5 rounded text-xs transition-colors ${
              showAiBoxes
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "text-zinc-400 hover:text-zinc-200 bg-zinc-800 border border-zinc-700/50"
            }`}
            title="Toggle AI Target Detection"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>

          {/* HUD Toggle */}
          <button
            onClick={() => setShowHud(!showHud)}
            className={`p-1.5 rounded text-xs transition-colors ${
              showHud
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                : "text-zinc-400 hover:text-zinc-200 bg-zinc-800 border border-zinc-700/50"
            }`}
            title="Toggle Tactical HUD"
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>

          {/* PTZ Controls Toggle */}
          <button
            onClick={() => setIsPtzOpen(!isPtzOpen)}
            className={`p-1.5 rounded text-xs transition-colors ${
              isPtzOpen
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "text-zinc-400 hover:text-zinc-200 bg-zinc-800 border border-zinc-700/50"
            }`}
            title="Gimbal Pan/Tilt Controls"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          {/* Snapshot */}
          <button
            onClick={handleSnapshot}
            className="p-1.5 rounded text-zinc-400 hover:text-zinc-100 bg-zinc-800 border border-zinc-700/50 transition-colors"
            title="Capture Snapshot"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>

          {/* Maximize */}
          {onToggleMaximize && (
            <button
              onClick={onToggleMaximize}
              className="p-1.5 rounded text-zinc-400 hover:text-zinc-100 bg-zinc-800 border border-zinc-700/50 transition-colors"
              title={isMaximized ? "Restore 4-Grid" : "Maximize Feed"}
            >
              {isMaximized ? (
                <Minimize2 className="w-3.5 h-3.5 text-cyan-400" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Main Video Viewport */}
      <div className="flex-1 relative overflow-hidden bg-black flex items-center justify-center">
        {activeCamId === "device-webcam" ? (
          webcamError ? (
            <div className="flex flex-col items-center gap-2 text-zinc-500 p-6 text-center">
              <AlertCircle className="w-8 h-8 text-amber-400 opacity-80" />
              <span className="text-xs font-mono font-bold text-zinc-200 uppercase">
                WebCam Device Offline / Denied
              </span>
              <span className="text-[11px] text-zinc-400 max-w-xs">{webcamError}</span>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={transformStyle}
              className={`w-full h-full object-cover select-none ${getLensSpecificFilter()}`}
            />
          )
        ) : drone.cameraStatus !== "Active" && activeCamId.startsWith("rgb") ? (
          <div className="flex flex-col items-center gap-2 text-zinc-500 p-6 text-center">
            <AlertCircle className="w-8 h-8 text-amber-400 opacity-60" />
            <span className="text-xs font-mono font-bold text-zinc-300 uppercase">
              Optical Camera Sensor Inactive
            </span>
            <span className="text-[11px] text-zinc-500">
              Drone status: {drone.status} • Verify optical payload link
            </span>
          </div>
        ) : (
          <>
            <img
              src={droneCameraFeed}
              alt="Live Camera Stream"
              style={transformStyle}
              className={`w-full h-full object-cover select-none pointer-events-none ${getLensSpecificFilter()}`}
              referrerPolicy="no-referrer"
            />

            {/* Lens Specific Stylized Watermark / Mode Stamp */}
            <div className="absolute top-3 left-3 bg-black/65 backdrop-blur-sm border border-zinc-700/80 px-2.5 py-1 rounded text-[10px] font-mono text-zinc-200 pointer-events-none flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-cyan-400 font-bold">{activeCamOption.shortTag}</span>
              <span className="text-zinc-400">|</span>
              <span>{activeCamOption.fov}</span>
              <span className="text-zinc-600">|</span>
              <span className="text-zinc-400">{activeCamOption.sensor}</span>
            </div>

            {/* Downward Belly Cam Laser Landing Grid */}
            {activeCamId === "belly-downward" && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-48 h-48 border border-dashed border-emerald-400/40 rounded-lg flex items-center justify-center">
                  <div className="w-24 h-24 border border-emerald-400/80 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
                  </div>
                </div>
                <div className="absolute bottom-12 text-[10px] font-mono bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 px-2 py-0.5 rounded">
                  LASER NADIR ALT: {drone.telemetry.altitude.toFixed(2)}m • TOUCHDOWN READY
                </div>
              </div>
            )}

            {/* AI Bounding Boxes */}
            {showAiBoxes && activeCamId !== "flir-thermal" && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Target 1: Human Ground Party */}
                <div className="absolute top-[48%] left-[28%] w-16 h-24 border-2 border-emerald-400 rounded-sm">
                  <div className="absolute -top-4 left-0 bg-emerald-950/90 text-emerald-300 text-[8px] font-mono font-bold px-1 rounded border border-emerald-500/50 flex items-center gap-1">
                    <span>HUMAN #01</span>
                    <span className="text-emerald-400">98%</span>
                  </div>
                  <div className="absolute -bottom-3 left-0 bg-black/80 text-[7px] font-mono text-zinc-300 px-1">
                    DIST: 14.2m
                  </div>
                </div>

                {/* Target 2: Vehicle */}
                <div className="absolute top-[26%] left-[56%] w-28 h-18 border-2 border-cyan-400 rounded-sm">
                  <div className="absolute -top-4 left-0 bg-cyan-950/90 text-cyan-300 text-[8px] font-mono font-bold px-1 rounded border border-cyan-500/50 flex items-center gap-1">
                    <span>VEHICLE #04</span>
                    <span className="text-cyan-400">95%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Tactical Flight HUD Reticle */}
            {showHud && (
              <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3">
                {/* Top HUD Telemetry */}
                <div className="flex justify-between items-start text-[10px] font-mono text-cyan-400 bg-black/40 backdrop-blur-xs p-1.5 rounded border border-cyan-500/20">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-white">{drone.id}</span>
                    <span>HDG {drone.telemetry.heading}°</span>
                    <span>SPD {drone.telemetry.speed.toFixed(1)} KM/H</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span>ALT {drone.telemetry.altitude}M</span>
                    <span>SATS {drone.telemetry.satelliteCount}</span>
                    <span className="text-emerald-400">FPS {activeCamOption.fps}.0</span>
                  </div>
                </div>

                {/* Center Pitch/Roll Crosshair */}
                <div className="self-center flex flex-col items-center justify-center">
                  <div className="w-24 h-24 border border-dashed border-cyan-400/30 rounded-full flex items-center justify-center">
                    <div className="w-12 h-12 border border-cyan-400/60 rounded-full flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                    </div>
                  </div>
                  {/* Artificial horizon pitch ticks */}
                  <div className="w-32 h-0.5 bg-cyan-400/50 my-1 flex justify-between px-1 text-[8px] font-mono text-cyan-300">
                    <span>- -</span>
                    <span>- -</span>
                  </div>
                </div>

                {/* Bottom HUD Bar */}
                <div className="flex justify-between items-end text-[9px] font-mono text-zinc-400">
                  <div className="bg-black/60 px-2 py-0.5 rounded border border-zinc-800 text-zinc-300">
                    LAT {drone.coordinates.lat.toFixed(5)}° / LNG {drone.coordinates.lng.toFixed(5)}°
                  </div>
                  <div className="bg-black/60 px-2 py-0.5 rounded border border-zinc-800 text-cyan-300">
                    ZOOM {zoom}X • GIMBAL TILT {ptz.tilt}°
                  </div>
                </div>
              </div>
            )}

            {/* Gimbal PTZ Overlay Control Pad */}
            {isPtzOpen && (
              <div className="absolute bottom-3 right-3 bg-zinc-950/90 border border-zinc-700 p-2 rounded-lg z-30 shadow-2xl flex flex-col items-center gap-1">
                <span className="text-[9px] font-mono font-bold text-amber-400 uppercase">
                  Gimbal PTZ
                </span>
                <button
                  onClick={() => setPtz((p) => ({ ...p, tilt: Math.max(p.tilt - 15, -60) }))}
                  className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-[10px] rounded text-zinc-200"
                >
                  ▲ TILT UP
                </button>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPtz((p) => ({ ...p, pan: Math.max(p.pan - 15, -90) }))}
                    className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-[10px] rounded text-zinc-200"
                  >
                    ◀ PAN L
                  </button>
                  <button
                    onClick={() => setPtz({ pan: 0, tilt: 0 })}
                    className="px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-[9px] rounded text-cyan-400"
                  >
                    CTR
                  </button>
                  <button
                    onClick={() => setPtz((p) => ({ ...p, pan: Math.min(p.pan + 15, 90) }))}
                    className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-[10px] rounded text-zinc-200"
                  >
                    PAN R ▶
                  </button>
                </div>
                <button
                  onClick={() => setPtz((p) => ({ ...p, tilt: Math.min(p.tilt + 15, 60) }))}
                  className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-[10px] rounded text-zinc-200"
                >
                  ▼ TILT DN
                </button>
              </div>
            )}
          </>
        )}

        {/* Snapshot feedback badge */}
        {snapshotToast && (
          <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-cyan-500 text-black px-3 py-1 rounded font-bold font-mono text-xs shadow-lg animate-bounce flex items-center gap-1.5 z-40">
            <Camera className="w-3.5 h-3.5" />
            <span>SNAPSHOT CAPTURED ({activeCamOption.shortTag})</span>
          </div>
        )}
      </div>

      {/* Bottom Camera Toolbar */}
      <div className="h-9 bg-zinc-900/90 border-t border-zinc-800 px-3 flex items-center justify-between text-xs z-10 shrink-0">
        {/* Optical Zoom Controls */}
        <div className="flex items-center gap-1 font-mono text-[11px]">
          <span className="text-zinc-500 text-[10px] mr-1 hidden sm:inline">ZOOM:</span>
          {[1, 2, 4, 8].map((z) => (
            <button
              key={z}
              onClick={() => setZoom(z)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                zoom === z
                  ? "bg-cyan-500 text-black font-extrabold"
                  : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {z}x
            </button>
          ))}
        </div>

        {/* Vision Filter Presets */}
        <div className="flex items-center gap-1">
          <span className="text-zinc-500 text-[10px] mr-1 font-mono hidden sm:inline">FILTER:</span>
          {(["normal", "nvg", "mono", "edge"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setVisionFilter(filter)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase transition-colors ${
                visionFilter === filter
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "text-zinc-400 hover:text-zinc-200 bg-zinc-800/80"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
