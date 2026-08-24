import React, { useState, useEffect, useRef, useMemo } from "react";
import { Drone } from "../../types";
import droneCameraFeed from "../../assets/images/drone_camera_feed_1787467816443.jpg";
import { CameraSourceInfo, getAvailableCameraSources } from "../camera/CameraTypes";
import { useCameraSources } from "../camera/useCameraSources";
import { useDRS } from "../../store";
import {
  Video,
  Camera,
  Maximize2,
  Minimize2,
  Crosshair,
  Sliders,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Radio,
  ChevronDown,
  Layers,
  Check,
  User,
  Users,
  Smartphone,
  Shield,
  Eye,
} from "lucide-react";

export type CameraLensId = string;

interface LiveVideoPanelProps {
  drone: Drone;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
  isMasterRecording?: boolean;
  selectedCameraId?: string;
  onSelectCamera?: (cameraId: string) => void;
}

export function LiveVideoPanel({
  drone,
  isMaximized,
  onToggleMaximize,
  isMasterRecording = true,
  selectedCameraId,
  onSelectCamera,
}: LiveVideoPanelProps) {
  const { drones, currentUser } = useDRS();
  const {
    sources: availableSources,
    allSources,
    visitors,
    isBroadcasting,
    toggleBroadcasting,
    switchCameraFacing,
    facingMode,
    activeVisitorCount,
    realDeviceCount,
    myDeviceId,
  } = useCameraSources(drones, false, currentUser?.username || "Operator");

  // Determine default camera ID if not provided
  const defaultCamId = `${drone.id}-rgb-gimbal`;
  const [internalCameraId, setInternalCameraId] = useState<string>(selectedCameraId || defaultCamId);

  // Sync with prop when changed
  useEffect(() => {
    if (selectedCameraId) {
      setInternalCameraId(selectedCameraId);
    }
  }, [selectedCameraId]);

  const activeCamId = onSelectCamera ? (selectedCameraId || internalCameraId) : internalCameraId;
  const setCamId = (id: string) => {
    setInternalCameraId(id);
    if (onSelectCamera) onSelectCamera(id);
  };

  // Find active CameraSourceInfo
  const activeSource: CameraSourceInfo = useMemo(() => {
    // Exact match
    let found = allSources.find((s) => s.id === activeCamId);
    if (found) return found;

    // Shorthand match (e.g. 'rgb-gimbal' -> '${drone.id}-rgb-gimbal')
    found = allSources.find(
      (s) =>
        s.id === `${drone.id}-${activeCamId}` ||
        s.lensType === activeCamId ||
        s.id.endsWith(activeCamId)
    );
    if (found) return found;

    // Fallback to primary drone gimbal
    return (
      allSources.find((s) => s.id === `${drone.id}-rgb-gimbal`) ||
      allSources[0] || {
        id: "rgb-gimbal",
        label: `${drone.name} • 4K RGB Main Gimbal`,
        shortLabel: `${drone.name} FWD`,
        lensType: "rgb-gimbal",
        lensName: "4K RGB Gimbal",
        resolution: "3840x2160",
        fov: "84° Zoom",
        status: "ONLINE",
        sensorSpec: "1/1.3\" CMOS 48MP F/1.7",
      }
    );
  }, [allSources, activeCamId, drone]);

  const [isCameraDropdownOpen, setIsCameraDropdownOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<"all" | "visitors" | "drone" | "cctv">("all");
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

  // WebRTC user device camera state (local)
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const visitorCanvasRef = useRef<HTMLCanvasElement>(null);

  // Remote visitor live frame from server
  const [remoteFrame, setRemoteFrame] = useState<string | null>(null);
  const [remoteFrameAge, setRemoteFrameAge] = useState<number>(0);

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

  // Handle local device webcam activation when self camera is selected
  useEffect(() => {
    const isSelfCam =
      activeSource.lensType === "device-webcam" ||
      (activeSource.lensType === "visitor-camera" && activeSource.isSelf);

    if (isSelfCam) {
      if (activeSource.stream) {
        setWebcamStream(activeSource.stream);
        setWebcamError(null);
        if (videoRef.current) {
          videoRef.current.srcObject = activeSource.stream;
        }
        return;
      }

      let isMounted = true;
      navigator.mediaDevices
        ?.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: facingMode,
          },
          audio: false,
        })
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
      if (webcamStream && !isBroadcasting) {
        webcamStream.getTracks().forEach((track) => track.stop());
        setWebcamStream(null);
      }
    }
  }, [activeSource.lensType, activeSource.isSelf, activeSource.stream, facingMode, isBroadcasting]);

  useEffect(() => {
    if (videoRef.current && webcamStream) {
      videoRef.current.srcObject = webcamStream;
    }
  }, [webcamStream]);

  // Poll real-time live frames from backend server if viewing another device / visitor
  useEffect(() => {
    if (activeSource.lensType !== "visitor-camera" || activeSource.isSelf) {
      setRemoteFrame(null);
      return;
    }

    let isMounted = true;
    let pollTimer: number | null = null;
    let isFetching = false;

    const fetchLiveFrame = async () => {
      if (isFetching) return;
      try {
        isFetching = true;
        const res = await fetch(`/api/visitors/${encodeURIComponent(activeSource.id)}/frame`);
        if (!res.ok) {
          if (isMounted) setRemoteFrame(null);
          return;
        }
        const data = await res.json();
        if (isMounted && data && data.frame) {
          setRemoteFrame(data.frame);
          setRemoteFrameAge(data.ageMs || 0);
        }
      } catch {
        // Procedural canvas fallback
      } finally {
        isFetching = false;
      }
    };

    fetchLiveFrame();
    pollTimer = window.setInterval(fetchLiveFrame, 100);

    return () => {
      isMounted = false;
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [activeSource.lensType, activeSource.id, activeSource.isSelf]);

  // Procedural canvas fallback for visitor tactical feeds without live frames
  useEffect(() => {
    if (
      activeSource.lensType !== "visitor-camera" ||
      (activeSource.isSelf && webcamStream) ||
      remoteFrame
    ) {
      return;
    }

    const canvas = visitorCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animFrame: number;
    let frameCount = 0;

    const renderTacticalView = () => {
      frameCount++;
      const w = (canvas.width = canvas.parentElement?.clientWidth || 640);
      const h = (canvas.height = canvas.parentElement?.clientHeight || 360);

      // Deep tactical backdrop
      ctx.fillStyle = "#090d10";
      ctx.fillRect(0, 0, w, h);

      // Moving horizon and terrain grid
      ctx.strokeStyle = "rgba(6, 182, 212, 0.18)";
      ctx.lineWidth = 1;
      const horizonY = h * 0.52 + Math.sin(frameCount * 0.03) * 6;

      ctx.beginPath();
      ctx.moveTo(0, horizonY);
      ctx.lineTo(w, horizonY);
      ctx.stroke();

      for (let i = 0; i < w; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, horizonY);
        ctx.lineTo(i + (i - w / 2) * 1.5, h);
        ctx.stroke();
      }

      for (let y = horizonY; y < h; y += 22) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Simulated thermal body signatures
      const targetX = (w * 0.48) + Math.sin(frameCount * 0.02) * 35;
      const targetY = horizonY + 20;

      ctx.fillStyle = "rgba(16, 185, 129, 0.85)";
      ctx.fillRect(targetX - 10, targetY - 25, 20, 30);
      ctx.fillStyle = "rgba(6, 182, 212, 0.9)";
      ctx.fillRect(targetX - 6, targetY - 40, 12, 12);

      // Bodycam Gyro reticle
      ctx.strokeStyle = "rgba(16, 185, 129, 0.6)";
      ctx.strokeRect(targetX - 16, targetY - 48, 32, 58);

      animFrame = requestAnimationFrame(renderTacticalView);
    };

    renderTacticalView();

    return () => {
      cancelAnimationFrame(animFrame);
    };
  }, [activeSource.lensType, activeSource.isSelf, webcamStream, remoteFrame]);

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
    if (activeSource.lensType === "thermal-flir") {
      return "hue-rotate-[195deg] invert contrast-[185%] saturate-[280%]";
    }
    if (activeSource.lensType === "belly-downward") {
      return "contrast-[125%] saturate-[110%] brightness-[95%]";
    }
    if (activeSource.lensType === "fpv-nose") {
      return "contrast-[115%] saturate-[130%]";
    }
    if (activeSource.lensType === "ground-cctv") {
      return "contrast-[110%] brightness-[98%]";
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

  // Filter sources for the dropdown
  const filteredDropdownSources = allSources.filter((src) => {
    if (categoryFilter === "visitors") return src.lensType === "visitor-camera";
    if (categoryFilter === "drone") return !!src.droneId;
    if (categoryFilter === "cctv") return src.lensType === "ground-cctv" || src.lensType === "device-webcam";
    return true;
  });

  const isCurrentVisitor = activeSource.lensType === "visitor-camera";

  return (
    <div className="w-full h-full bg-zinc-950 border border-zinc-800/90 rounded-xl overflow-hidden flex flex-col relative group select-none shadow-xl">
      {/* Top Header Bar */}
      <div className="h-10 bg-zinc-900/95 border-b border-zinc-800/90 px-3 flex items-center justify-between z-20 shrink-0 gap-2">
        {/* Left: Camera Switcher Dropdown */}
        <div className="flex items-center gap-2 min-w-0" ref={cameraDropdownRef}>
          <div
            className={`p-1 rounded shrink-0 ${
              isCurrentVisitor
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-cyan-500/20 text-cyan-400"
            }`}
          >
            {isCurrentVisitor ? <User className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
          </div>

          <div className="relative">
            <button
              id="camera-switch-dropdown-btn"
              type="button"
              onClick={() => setIsCameraDropdownOpen(!isCameraDropdownOpen)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-850 hover:bg-zinc-800 border border-zinc-700/80 hover:border-cyan-500/50 text-zinc-100 transition-all text-xs font-mono font-medium group"
              title="Click to switch active optical/IR camera or visitor device feed"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  isCurrentVisitor
                    ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] animate-pulse"
                    : "bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)]"
                }`}
              />
              <span className="truncate max-w-[140px] sm:max-w-[210px] font-bold text-zinc-200">
                {activeSource.shortLabel}: {activeSource.lensName}
              </span>
              {activeSource.isSelf && (
                <span className="text-[9px] px-1 bg-cyan-950 text-cyan-300 rounded border border-cyan-500/40">
                  YOU
                </span>
              )}
              {activeSource.isRealDevice && !activeSource.isSelf && (
                <span className="text-[9px] px-1 bg-emerald-950 text-emerald-300 rounded border border-emerald-500/40 animate-pulse">
                  LIVE DEVICE
                </span>
              )}
              <ChevronDown
                className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${
                  isCameraDropdownOpen ? "rotate-180 text-cyan-400" : ""
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {isCameraDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-80 sm:w-96 bg-zinc-900 border border-zinc-700/90 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150">
                {/* Dropdown Header */}
                <div className="px-3 py-2 bg-zinc-950/90 border-b border-zinc-800 text-[10px] font-mono text-zinc-400 flex items-center justify-between">
                  <span className="font-bold tracking-wider">AVAILABLE VIDEO FEED SOURCES</span>
                  <span className="text-cyan-400 font-bold">{allSources.length} STREAMS</span>
                </div>

                {/* Category Filter Tabs */}
                <div className="flex gap-1 p-1.5 bg-zinc-950/60 border-b border-zinc-800/60 overflow-x-auto custom-scrollbar">
                  {[
                    { id: "all", label: "All Feeds" },
                    { id: "visitors", label: `Visitors & Devices (${activeVisitorCount})`, highlight: true },
                    { id: "drone", label: "Drone Lenses" },
                    { id: "cctv", label: "Base CCTV & WebCam" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setCategoryFilter(tab.id as any)}
                      className={`px-2 py-1 rounded text-[9px] font-mono font-bold uppercase transition-colors shrink-0 ${
                        categoryFilter === tab.id
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

                {/* Dropdown Source List */}
                <div className="py-1 max-h-80 overflow-y-auto custom-scrollbar divide-y divide-zinc-800/40">
                  {filteredDropdownSources.map((cam) => {
                    const isSelected = cam.id === activeSource.id;
                    const isCamVisitor = cam.lensType === "visitor-camera";

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
                            ? isCamVisitor
                              ? "bg-emerald-500/15 text-emerald-100"
                              : "bg-cyan-500/15 text-zinc-100"
                            : "hover:bg-zinc-800/70 text-zinc-300 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-1.5 h-8 rounded-full shrink-0 ${
                              isSelected
                                ? isCamVisitor
                                  ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                                  : "bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]"
                                : "bg-transparent"
                            }`}
                          />
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5">
                              {isCamVisitor && <User className="w-3 h-3 text-emerald-400 shrink-0" />}
                              <span className="text-xs font-bold text-zinc-100 truncate">
                                {cam.label}
                              </span>
                              {cam.isSelf && (
                                <span className="text-[8px] px-1 bg-cyan-950 text-cyan-300 rounded border border-cyan-500/40">
                                  YOU
                                </span>
                              )}
                              {cam.isRealDevice && !cam.isSelf && (
                                <span className="text-[8px] px-1 bg-emerald-950 text-emerald-400 rounded border border-emerald-500/40 animate-pulse">
                                  LIVE
                                </span>
                              )}
                            </div>
                            <span
                              className={`text-[10px] font-mono truncate ${
                                isCamVisitor ? "text-emerald-400/90" : "text-cyan-400/90"
                              }`}
                            >
                              {cam.sensorSpec}
                            </span>
                            <span className="text-[9px] font-mono text-zinc-500">
                              {cam.resolution} • {cam.fov}
                              {cam.visitorLatency ? ` • ${cam.visitorLatency}ms` : ""}
                            </span>
                          </div>
                        </div>

                        {isSelected && (
                          <Check
                            className={`w-4 h-4 shrink-0 ml-2 ${
                              isCamVisitor ? "text-emerald-400" : "text-cyan-400"
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

          <span className="hidden xl:inline text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-300 shrink-0">
            {activeSource.resolution}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Quick Broadcast Camera Button */}
          <button
            onClick={toggleBroadcasting}
            className={`px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 border transition-colors ${
              isBroadcasting
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/60 font-bold"
                : "bg-zinc-850 hover:bg-zinc-800 text-zinc-300 border-zinc-700 hover:text-white"
            }`}
            title={
              isBroadcasting
                ? "You are broadcasting this device camera to all other devices (Click to Stop)"
                : "Broadcast this device's camera to all other connected screens & visitors"
            }
          >
            <Radio className={`w-3 h-3 ${isBroadcasting ? "text-emerald-400 animate-pulse" : "text-zinc-400"}`} />
            <span className="hidden sm:inline">
              {isBroadcasting ? "BROADCASTING" : "BROADCAST CAM"}
            </span>
          </button>

          {/* Flip Sensor Button if Broadcasting */}
          {isBroadcasting && (
            <button
              onClick={switchCameraFacing}
              className="p-1 rounded text-zinc-400 hover:text-cyan-300 hover:bg-zinc-800 transition-colors"
              title={`Flip Camera Sensor (${facingMode === "user" ? "Front / Self" : "Rear / Environment"})`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}

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
        {/* Case 1: Local Device WebCam / Self Stream */}
        {(activeSource.lensType === "device-webcam" || (activeSource.lensType === "visitor-camera" && activeSource.isSelf)) ? (
          webcamError ? (
            <div className="flex flex-col items-center gap-2 text-zinc-500 p-6 text-center">
              <AlertCircle className="w-8 h-8 text-amber-400 opacity-80" />
              <span className="text-xs font-mono font-bold text-zinc-200 uppercase">
                WebCam Device Offline / Permission Denied
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
        ) : activeSource.lensType === "visitor-camera" ? (
          /* Case 2: Remote Visitor / Device Live Stream */
          remoteFrame ? (
            <img
              src={remoteFrame}
              alt="Live Remote Visitor Feed"
              style={transformStyle}
              className={`w-full h-full object-cover select-none ${getLensSpecificFilter()}`}
            />
          ) : (
            <canvas
              ref={visitorCanvasRef}
              style={transformStyle}
              className={`w-full h-full object-cover select-none ${getLensSpecificFilter()}`}
            />
          )
        ) : (
          /* Case 3: Drone-Mounted Optical & Thermal Feeds */
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
              <span className="text-cyan-400 font-bold">{activeSource.shortLabel}</span>
              <span className="text-zinc-400">|</span>
              <span>{activeSource.fov}</span>
              <span className="text-zinc-600">|</span>
              <span className="text-zinc-400">{activeSource.sensorSpec}</span>
            </div>

            {/* Downward Belly Cam Laser Landing Grid */}
            {activeSource.lensType === "belly-downward" && (
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
            {showAiBoxes && activeSource.lensType !== "thermal-flir" && (
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
                    <span className="text-emerald-400">FPS 60.0</span>
                  </div>
                </div>

                {/* Center Pitch/Roll Crosshair */}
                <div className="self-center flex flex-col items-center justify-center">
                  <div className="w-24 h-24 border border-dashed border-cyan-400/30 rounded-full flex items-center justify-center">
                    <div className="w-12 h-12 border border-cyan-400/60 rounded-full flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                    </div>
                  </div>
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
          </>
        )}

        {/* Live Visitor / Remote Device HUD Badge */}
        {isCurrentVisitor && (
          <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-md border border-emerald-500/50 px-3 py-1.5 rounded-lg text-[10px] font-mono text-zinc-200 pointer-events-none flex items-center gap-2.5 shadow-xl">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <div className="flex flex-col">
              <span className="text-emerald-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3 h-3 text-emerald-400" />
                {activeSource.visitorName || activeSource.label}
              </span>
              <span className="text-[9px] text-zinc-400">
                {activeSource.visitorRole || "Live Remote Camera"} • {activeSource.visitorLocation || "Mesh Link"}
              </span>
            </div>
            <div className="border-l border-zinc-700 pl-2 text-right">
              <span className="text-emerald-400 font-bold block">
                {remoteFrame ? "LIVE FRAME" : "MESH FEED"}
              </span>
              <span className="text-[9px] text-zinc-500">
                {activeSource.visitorLatency || 14}ms Latency
              </span>
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

        {/* Snapshot feedback badge */}
        {snapshotToast && (
          <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-cyan-500 text-black px-3 py-1 rounded font-bold font-mono text-xs shadow-lg animate-bounce flex items-center gap-1.5 z-40">
            <Camera className="w-3.5 h-3.5" />
            <span>SNAPSHOT CAPTURED ({activeSource.shortLabel})</span>
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
