import React, { useEffect, useRef, useState } from "react";
import droneCameraFeed from "../../assets/images/drone_camera_feed_1787467816443.jpg";
import { CameraSourceInfo, LensType, VisionMode } from "./CameraTypes";
import { Drone } from "../../types";
import {
  AlertCircle,
  RefreshCw,
  RadioReceiver,
  Radio,
  User,
  Wifi,
  Battery,
  Shield,
  MapPin,
  Mic,
  Activity,
} from "lucide-react";

interface CameraRendererProps {
  source: CameraSourceInfo;
  drone?: Drone;
  visionMode: VisionMode;
  zoom: 1 | 2 | 4;
  ptz: { pan: number; tilt: number };
  showAiBoxes: boolean;
  onSnapshot?: () => void;
  drone1RemoteFrame?: string | null;
  drone1Broadcast?: {
    isBroadcasting: boolean;
    broadcasterDeviceId?: string | null;
    broadcasterName?: string | null;
    hasLiveFrame?: boolean;
    isSelfBroadcasting?: boolean;
  };
  localBroadcastStream?: MediaStream | null;
  isAutoFraming?: boolean;
}

export function CameraRenderer({
  source,
  drone,
  visionMode,
  zoom,
  ptz,
  showAiBoxes,
  drone1RemoteFrame,
  drone1Broadcast,
  localBroadcastStream,
  isAutoFraming = false,
}: CameraRendererProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const visitorVideoRef = useRef<HTMLVideoElement | null>(null);
  const drone1VideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const visitorCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLoadingWebcam, setIsLoadingWebcam] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [remoteFrame, setRemoteFrame] = useState<string | null>(null);
  const [remoteFrameTimestamp, setRemoteFrameTimestamp] = useState<number>(0);

  // Internal Drone 1 Relay sync state
  const [drone1InternalState, setDrone1InternalState] = useState<{
    isBroadcasting: boolean;
    broadcasterName: string | null;
    isSelf: boolean;
    frame: string | null;
  }>({
    isBroadcasting: false,
    broadcasterName: null,
    isSelf: false,
    frame: null,
  });

  const isDrone1 =
    source.droneId === "DRN-01" ||
    drone?.id === "DRN-01" ||
    source.id.startsWith("DRN-01") ||
    Boolean(source.isDrone1Relay);

  // Listen to Drone 1 broadcast channel events and server endpoints
  useEffect(() => {
    if (!isDrone1) return;

    let isMounted = true;
    let channel: BroadcastChannel | null = null;
    let pollTimer: number | null = null;
    let isFetching = false;

    // Direct intra-browser BroadcastChannel sync
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        channel = new BroadcastChannel("drs_visitor_camera_network");
        channel.onmessage = (event) => {
          if (!isMounted) return;
          const { type, frame, isBroadcasting, broadcasterName } = event.data || {};
          if (type === "DRONE1_FRAME" && frame) {
            setDrone1InternalState((prev) => ({
              ...prev,
              isBroadcasting: true,
              frame,
              broadcasterName: broadcasterName || prev.broadcasterName,
            }));
          } else if (type === "DRONE1_BROADCAST_STATE") {
            setDrone1InternalState((prev) => ({
              ...prev,
              isBroadcasting: Boolean(isBroadcasting),
              broadcasterName: broadcasterName || prev.broadcasterName,
            }));
          } else if (type === "DRONE1_STOP_BROADCAST") {
            setDrone1InternalState({
              isBroadcasting: false,
              broadcasterName: null,
              isSelf: false,
              frame: null,
            });
          }
        };
      }
    } catch {}

    // Check server status
    fetch("/api/drone1/broadcast")
      .then((r) => r.json())
      .then((data) => {
        if (isMounted && data && data.isBroadcasting) {
          setDrone1InternalState((prev) => ({
            ...prev,
            isBroadcasting: true,
            broadcasterName: data.broadcasterName || prev.broadcasterName,
          }));
        }
      })
      .catch(() => {});

    // Polling loop for remote frame when Drone 1 is broadcasting
    const pollDrone1 = async () => {
      if (isFetching) return;
      try {
        isFetching = true;
        const res = await fetch("/api/drone1/frame");
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && data && data.frame) {
          setDrone1InternalState((prev) => ({
            ...prev,
            isBroadcasting: true,
            frame: data.frame,
          }));
        }
      } catch {
      } finally {
        isFetching = false;
      }
    };

    pollDrone1();
    pollTimer = window.setInterval(pollDrone1, 100);

    return () => {
      isMounted = false;
      if (channel) channel.close();
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [isDrone1]);

  const isDrone1RelayActive =
    isDrone1 &&
    (Boolean(source.isDrone1Relay) ||
      Boolean(drone1Broadcast?.isBroadcasting) ||
      drone1InternalState.isBroadcasting);

  const isSelfRelay = Boolean(
    drone1Broadcast?.isSelfBroadcasting ||
      drone1InternalState.isSelf ||
      (source.isDrone1Relay && source.isSelf)
  );

  const activeDrone1Frame =
    drone1RemoteFrame ||
    drone1InternalState.frame ||
    (source.isDrone1Relay ? source.stream ? null : remoteFrame : null);

  const activeDroneFeedImage = (isDrone1RelayActive && activeDrone1Frame) ? activeDrone1Frame : droneCameraFeed;

  const drone1BroadcasterName =
    drone1Broadcast?.broadcasterName ||
    drone1InternalState.broadcasterName ||
    source.visitorName ||
    "Live Device Broadcast";

  // Bind local stream for Drone 1 if self broadcasting
  useEffect(() => {
    if (isDrone1RelayActive && isSelfRelay && drone1VideoRef.current) {
      const targetStream = localBroadcastStream || source.stream || mediaStreamRef.current;
      if (targetStream) {
        drone1VideoRef.current.srcObject = targetStream;
        drone1VideoRef.current.play().catch(() => {});
      }
    }
  }, [isDrone1RelayActive, isSelfRelay, localBroadcastStream, source.stream]);

  // Filter styles
  const filterClass = {
    normal: "",
    nvg: "sepia-[0.85] hue-rotate-[75deg] saturate-[300%] contrast-[130%] brightness-[105%]",
    thermal: "hue-rotate-[180deg] invert-[0.9] contrast-[170%] saturate-[250%]",
    mono: "grayscale contrast-[140%] brightness-[90%]",
  }[visionMode];

  // Dynamic Auto-Framing tracking calculation (Center Stage / AI PTZ Auto-Follow)
  const [framingOffset, setFramingOffset] = useState<{
    x: number;
    y: number;
    zoom: number;
    targetName: string;
    confidence: number;
  }>({
    x: -18,
    y: -14,
    zoom: 1.85,
    targetName: "SURVIVOR #01",
    confidence: 98.4,
  });

  useEffect(() => {
    if (!isAutoFraming) return;

    let animId: number;
    const startTime = Date.now();

    const updateAutoFraming = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const targetBaseX = source.lensType === "thermal-flir" ? -28 : -18;
      const targetBaseY = source.lensType === "thermal-flir" ? -10 : -14;

      // Gentle natural framing follow tracking
      const swayX = Math.sin(elapsed * 0.7) * 10 + Math.cos(elapsed * 0.3) * 5;
      const swayY = Math.cos(elapsed * 0.6) * 6;

      const targetLabel =
        source.lensType === "thermal-flir"
          ? "HEAT SIGNATURE [37.2°C]"
          : source.lensType === "visitor-camera" || source.lensType === "device-webcam"
          ? "OPERATOR (CENTER STAGE)"
          : "SURVIVOR #01 (LOCKED)";

      setFramingOffset({
        x: targetBaseX + swayX,
        y: targetBaseY + swayY,
        zoom: 1.85 + Math.sin(elapsed * 0.35) * 0.08,
        targetName: targetLabel,
        confidence: 97.6 + Math.sin(elapsed * 1.5) * 1.8,
      });

      animId = requestAnimationFrame(updateAutoFraming);
    };

    updateAutoFraming();
    return () => cancelAnimationFrame(animId);
  }, [isAutoFraming, source.lensType]);

  // PTZ and Zoom transform (auto-framing smoothly overrides with AI centering & magnification)
  const currentZoom = isAutoFraming ? framingOffset.zoom : zoom;
  const currentPan = isAutoFraming ? framingOffset.x : ptz.pan * 0.4;
  const currentTilt = isAutoFraming ? framingOffset.y : ptz.tilt * 0.4;

  const transformStyle = {
    transform: `scale(${currentZoom}) translate(${currentPan}px, ${currentTilt}px)`,
    transformOrigin: "center center",
    transition: isAutoFraming
      ? "transform 0.45s cubic-bezier(0.25, 1, 0.5, 1)"
      : "transform 0.15s ease-out",
  };

  // Reusable tactical Auto-Framing targeting overlay
  const autoFramingOverlay = isAutoFraming ? (
    <div className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center">
      {/* Top Banner Indicator */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950/85 border border-cyan-400/80 shadow-[0_0_12px_rgba(6,182,212,0.35)] backdrop-blur-md text-[9px] font-mono text-cyan-200">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
        <span className="font-bold text-white tracking-wider">AUTO-FRAME ACTIVE</span>
        <span className="text-zinc-400">•</span>
        <span className="text-cyan-300 font-semibold">{framingOffset.targetName}</span>
        <span className="text-[8px] bg-cyan-500/20 text-cyan-300 px-1 rounded border border-cyan-400/40 font-bold">
          {framingOffset.confidence.toFixed(1)}%
        </span>
      </div>

      {/* Dynamic Target Framing Brackets (Center Stage Subject Box) */}
      <div className="relative w-44 h-44 sm:w-52 sm:h-52 flex items-center justify-center animate-pulse">
        {/* 4 Precision Corner Guides */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]" />

        {/* Center Targeting Reticle */}
        <div className="w-3 h-3 rounded-full border border-cyan-300/80 flex items-center justify-center">
          <div className="w-1 h-1 bg-cyan-400 rounded-full" />
        </div>

        {/* Subject Classification Tag */}
        <div className="absolute -top-5 left-0 flex items-center gap-1 bg-cyan-950/90 border border-cyan-400/60 rounded px-1.5 py-0.2 text-[8px] font-mono font-bold text-cyan-300 shadow">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>LOCK: {framingOffset.targetName}</span>
        </div>

        {/* Subject Telemetry Tag */}
        <div className="absolute -bottom-5 right-0 bg-black/80 border border-cyan-500/40 rounded px-1.5 py-0.2 text-[8px] font-mono text-zinc-300">
          AUTO PTZ • {currentZoom.toFixed(1)}x ZOOM
        </div>
      </div>
    </div>
  ) : null;

  // Start real webcam stream if source is device-webcam or self visitor camera
  useEffect(() => {
    if (source.lensType !== "device-webcam" && !(source.lensType === "visitor-camera" && source.isSelf)) {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      return;
    }

    if (source.stream) {
      if (videoRef.current) {
        videoRef.current.srcObject = source.stream;
        videoRef.current.play().catch(() => {});
      }
      return;
    }

    let isMounted = true;
    setIsLoadingWebcam(true);
    setCameraError(null);

    const initWebcam = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Camera API not supported in this browser");
        }
        const videoConstraint: MediaTrackConstraints = source.deviceId
          ? { deviceId: { exact: source.deviceId } }
          : { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } };

        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraint,
          audio: false,
        });

        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        mediaStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setIsLoadingWebcam(false);
      } catch (err: any) {
        if (!isMounted) return;
        setCameraError(
          err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
            ? "Camera permission denied by user"
            : err.message || "Failed to access webcam"
        );
        setIsLoadingWebcam(false);
      }
    };

    initWebcam();

    return () => {
      isMounted = false;
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
    };
  }, [source.lensType, source.deviceId, source.id, source.isSelf, source.stream, facingMode]);

  // Bind visitor stream to video if external or local broadcast stream is provided
  useEffect(() => {
    if (source.lensType === "visitor-camera") {
      const targetStream = source.stream || (source.isSelf ? localBroadcastStream : null);
      if (targetStream && visitorVideoRef.current) {
        visitorVideoRef.current.srcObject = targetStream;
        visitorVideoRef.current.play().catch(() => {});
      }
    }
  }, [source.lensType, source.stream, source.isSelf, localBroadcastStream]);

  // Poll real-time live frames from backend server if viewing another device + instant BroadcastChannel
  useEffect(() => {
    if (source.lensType !== "visitor-camera" || source.isSelf) {
      setRemoteFrame(null);
      return;
    }

    let isMounted = true;
    let pollTimer: number | null = null;
    let isFetching = false;
    let channel: BroadcastChannel | null = null;

    // Instant intra-browser zero-latency stream from other tabs/windows
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        channel = new BroadcastChannel("drs_visitor_camera_network");
        channel.onmessage = (event) => {
          if (!isMounted) return;
          const { type, id, frame, timestamp } = event.data || {};
          if (type === "VISITOR_FRAME" && id === source.id && frame) {
            setRemoteFrame(frame);
            setRemoteFrameTimestamp(timestamp || Date.now());
          }
        };
      }
    } catch {}

    const fetchLiveFrame = async () => {
      if (isFetching) return;
      try {
        isFetching = true;
        const res = await fetch(`/api/visitors/${encodeURIComponent(source.id)}/frame`);
        if (!res.ok) {
          return;
        }
        const data = await res.json();
        if (isMounted && data && data.frame) {
          setRemoteFrame(data.frame);
          setRemoteFrameTimestamp(data.timestamp || Date.now());
        }
      } catch {
        // Fallback to procedural simulation
      } finally {
        isFetching = false;
      }
    };

    // Immediate fetch
    fetchLiveFrame();

    // Poll live frame stream at ~10 FPS (100ms) for remote network devices
    pollTimer = window.setInterval(fetchLiveFrame, 100);

    return () => {
      isMounted = false;
      if (pollTimer) clearInterval(pollTimer);
      if (channel) channel.close();
    };
  }, [source.lensType, source.id, source.isSelf]);

  // High-fidelity procedural Tactical Visitor Bodycam / Helmet Cam Canvas video stream simulation
  useEffect(() => {
    const hasActiveLiveStream = source.stream || (source.isSelf && localBroadcastStream);
    if (source.lensType !== "visitor-camera" || hasActiveLiveStream) return;

    const canvas = visitorCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let tick = 0;
    const isThermalUnit = source.visitorId === "field-bravo" || visionMode === "thermal";

    // Load background image for texture
    const bgImg = new Image();
    bgImg.src = droneCameraFeed;

    const renderVisitorBodycam = () => {
      tick += 0.035;
      canvas.width = canvas.clientWidth || 640;
      canvas.height = canvas.clientHeight || 360;

      const w = canvas.width;
      const h = canvas.height;

      // Bobbing walking/panning motion simulation (realistic field cadence)
      const bobX = Math.sin(tick * 1.8) * 7;
      const bobY = Math.abs(Math.sin(tick * 3.6)) * 5;

      ctx.save();
      ctx.clearRect(0, 0, w, h);

      // 1. Draw background scene with bodycam movement
      if (bgImg.complete && bgImg.naturalWidth > 0 && !isThermalUnit) {
        ctx.drawImage(bgImg, -20 + bobX, -20 + bobY, w + 40, h + 40);
        ctx.fillStyle = "rgba(0, 15, 20, 0.25)";
        ctx.fillRect(0, 0, w, h);
      } else {
        // Deep tactical nocturnal or thermal backdrop
        const gradBg = ctx.createLinearGradient(0, 0, 0, h);
        if (isThermalUnit) {
          gradBg.addColorStop(0, "#08031d");
          gradBg.addColorStop(0.5, "#13093c");
          gradBg.addColorStop(1, "#260e4a");
        } else {
          gradBg.addColorStop(0, "#06090e");
          gradBg.addColorStop(0.6, "#0b1219");
          gradBg.addColorStop(1, "#080d12");
        }
        ctx.fillStyle = gradBg;
        ctx.fillRect(0, 0, w, h);

        // Moving terrain horizon and elevation contour ridges
        const horizonY = h * 0.52 + Math.sin(tick * 0.9) * 8 + bobY * 0.4;
        ctx.lineWidth = 1.2;

        // Draw dynamic search & rescue terrain wireframe mesh
        for (let i = 0; i < w; i += 32) {
          ctx.strokeStyle = isThermalUnit ? "rgba(168, 85, 247, 0.18)" : "rgba(6, 182, 212, 0.18)";
          ctx.beginPath();
          ctx.moveTo(i + bobX * 0.5, horizonY);
          ctx.lineTo(i + (i - w / 2) * 1.8, h);
          ctx.stroke();
        }

        for (let y = horizonY; y < h; y += 18) {
          ctx.strokeStyle = isThermalUnit ? "rgba(244, 63, 94, 0.22)" : "rgba(16, 185, 129, 0.22)";
          ctx.beginPath();
          ctx.moveTo(0, y + Math.sin(tick + y * 0.1) * 2);
          ctx.lineTo(w, y + Math.sin(tick + y * 0.1) * 2);
          ctx.stroke();
        }
      }

      // 2. Thermal Heat Signatures (if FLIR thermal scout Sarah Vance)
      if (isThermalUnit) {
        // Heat signature 1 (Survivor)
        const heat1X = w * 0.42 + bobX * 0.7;
        const heat1Y = h * 0.46 + bobY * 0.7;
        const heatGrad = ctx.createRadialGradient(heat1X, heat1Y, 4, heat1X, heat1Y, 45);
        heatGrad.addColorStop(0, "#ffffff");
        heatGrad.addColorStop(0.25, "#ffea00");
        heatGrad.addColorStop(0.55, "#ff3b00");
        heatGrad.addColorStop(0.85, "rgba(147, 51, 234, 0.4)");
        heatGrad.addColorStop(1, "rgba(147, 51, 234, 0)");
        ctx.fillStyle = heatGrad;
        ctx.beginPath();
        ctx.arc(heat1X, heat1Y, 45, 0, Math.PI * 2);
        ctx.fill();

        // Heat signature 2 (Rescue Vehicle / Power Generator)
        const heat2X = w * 0.72 + bobX * 0.4;
        const heat2Y = h * 0.38 + bobY * 0.4;
        const heat2Grad = ctx.createRadialGradient(heat2X, heat2Y, 2, heat2X, heat2Y, 30);
        heat2Grad.addColorStop(0, "#ffffff");
        heat2Grad.addColorStop(0.3, "#f97316");
        heat2Grad.addColorStop(0.7, "rgba(236, 72, 153, 0.4)");
        heat2Grad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = heat2Grad;
        ctx.beginPath();
        ctx.arc(heat2X, heat2Y, 30, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. Tactical Vignette & Edge Shadow
      const grad = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, h * 0.8);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(1, "rgba(0,0,0,0.65)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // 4. Optical horizon line & subtle gyro pitch indicator
      ctx.strokeStyle = isThermalUnit ? "rgba(244, 114, 182, 0.5)" : "rgba(6, 182, 212, 0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      const horizonY = h * 0.5 + Math.sin(tick * 0.8) * 3;
      ctx.moveTo(w * 0.22, horizonY);
      ctx.lineTo(w * 0.38, horizonY);
      ctx.moveTo(w * 0.62, horizonY);
      ctx.lineTo(w * 0.78, horizonY);
      ctx.stroke();

      // Optical center cross
      ctx.strokeStyle = isThermalUnit ? "rgba(251, 191, 36, 0.6)" : "rgba(16, 185, 129, 0.6)";
      ctx.beginPath();
      ctx.arc(w / 2 + bobX * 0.5, h / 2 + bobY * 0.5, 7, 0, Math.PI * 2);
      ctx.stroke();

      // 5. Dynamic scanlines for realistic live monitor texture
      ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
      for (let y = 0; y < h; y += 4) {
        ctx.fillRect(0, y, w, 1.5);
      }

      // 6. AI Detection Bounding Boxes
      if (showAiBoxes) {
        // AI detection box: Sector Recon Beacon
        const box2X = w * 0.68 + bobX * 0.4;
        const box2Y = h * 0.32 + bobY * 0.4;
        ctx.strokeStyle = "#38bdf8";
        ctx.strokeRect(box2X, box2Y, 52, 48);

        ctx.fillStyle = "rgba(12, 74, 110, 0.85)";
        ctx.fillRect(box2X, box2Y - 15, 52, 15);
        ctx.fillStyle = "#bae6fd";
        ctx.font = "bold 9px monospace";
        ctx.fillText("BEACON [94%]", box2X + 3, box2Y - 4);
      }

      // 7. Tactical telemetry HUD burned into bodycam stream
      const now = new Date();
      const timeStr = now.toISOString().slice(11, 23);
      ctx.fillStyle = isThermalUnit ? "rgba(251, 146, 60, 0.9)" : "rgba(6, 182, 212, 0.9)";
      ctx.font = "9px monospace";
      ctx.fillText(`UTC ${timeStr} • ISO 640 • 1/120s • HDG 248° WSW`, 12, h - 12);

      // Audio waveform VU simulation (live microphone channel)
      const micBars = 6;
      for (let m = 0; m < micBars; m++) {
        const barH = 3 + Math.abs(Math.sin(tick * 5 + m * 0.8)) * 10;
        ctx.fillStyle = m > 4 ? "#f43f5e" : "#10b981";
        ctx.fillRect(w - 70 + m * 5, h - 12 - barH, 3.5, barH);
      }

      ctx.restore();
      animId = requestAnimationFrame(renderVisitorBodycam);
    };

    renderVisitorBodycam();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [source.lensType, source.id, source.isSelf, source.stream, localBroadcastStream, showAiBoxes, visionMode]);

  // Animated procedural Canvas for LiDAR Depth or Thermal / Downward feeds
  useEffect(() => {
    if (source.lensType !== "lidar-pointcloud") return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let tick = 0;

    const renderLidar = () => {
      tick += 0.02;
      canvas.width = canvas.clientWidth || 400;
      canvas.height = canvas.clientHeight || 250;

      const w = Math.max(80, canvas.width || 300);
      const h = Math.max(80, canvas.height || 200);

      // Dark radar background
      ctx.fillStyle = "#09090b";
      ctx.fillRect(0, 0, w, h);

      // Radar scanning rings
      ctx.strokeStyle = "rgba(6, 182, 212, 0.15)";
      ctx.lineWidth = 1;
      const centerX = w / 2;
      const centerY = h / 2;
      const maxR = Math.max(15, Math.min(w, h) * 0.45);

      for (let r = maxR * 0.25; r <= maxR; r += maxR * 0.25) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, Math.max(1, r), 0, Math.PI * 2);
        ctx.stroke();
      }

      // Sweeping beam
      const angle = tick * 2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, maxR, angle - 0.4, angle);
      ctx.closePath();
      const sweepGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxR);
      sweepGrad.addColorStop(0, "rgba(6, 182, 212, 0.4)");
      sweepGrad.addColorStop(1, "rgba(6, 182, 212, 0.0)");
      ctx.fillStyle = sweepGrad;
      ctx.fill();

      // Draw point cloud dots
      const numPoints = 140;
      for (let i = 0; i < numPoints; i++) {
        const ptAngle = (i * 137.5 * Math.PI) / 180 + Math.sin(tick + i) * 0.1;
        const distRatio = 0.2 + (Math.sin(i * 99 + tick * 0.5) * 0.5 + 0.5) * 0.75;
        const dist = distRatio * maxR;

        const px = centerX + Math.cos(ptAngle) * dist;
        const py = centerY + Math.sin(ptAngle) * dist;

        // Color by proximity
        const hue = 180 - distRatio * 160;
        ctx.fillStyle = `hsl(${hue}, 100%, 60%)`;
        ctx.beginPath();
        ctx.arc(px, py, distRatio > 0.7 ? 2 : 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      animId = requestAnimationFrame(renderLidar);
    };

    renderLidar();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [source.lensType]);

  // 1. Device Live Webcam
  if (source.lensType === "device-webcam") {
    return (
      <div className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center">
        {isLoadingWebcam && (
          <div className="absolute inset-0 bg-zinc-950/80 flex flex-col items-center justify-center gap-2 z-20">
            <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-mono text-cyan-300">CONNECTING TO WEBCAM...</span>
          </div>
        )}

        {cameraError ? (
          <div className="absolute inset-0 bg-zinc-950/95 p-4 flex flex-col items-center justify-center text-center gap-2 z-20">
            <AlertCircle className="w-8 h-8 text-amber-400" />
            <span className="text-xs font-bold text-zinc-200">Device Camera Unavailable</span>
            <p className="text-[11px] text-zinc-400 max-w-xs">{cameraError}</p>
            <button
              onClick={() => setFacingMode((prev) => (prev === "user" ? "environment" : "user"))}
              className="mt-2 px-3 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded text-xs font-mono border border-cyan-500/40 flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry / Flip Sensor</span>
            </button>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={transformStyle}
            className={`w-full h-full object-cover ${filterClass}`}
          />
        )}
        {autoFramingOverlay}
      </div>
    );
  }

  // 2. Visitor & Remote Field Unit Camera
  if (source.lensType === "visitor-camera") {
    const streamToDisplay = source.stream || (source.isSelf ? localBroadcastStream : null);

    return (
      <div className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center">
        {streamToDisplay ? (
          <video
            ref={(el) => {
              visitorVideoRef.current = el;
              if (el && el.srcObject !== streamToDisplay) {
                el.srcObject = streamToDisplay;
                el.play().catch(() => {});
              }
            }}
            autoPlay
            playsInline
            muted
            style={transformStyle}
            className={`w-full h-full object-cover ${filterClass}`}
          />
        ) : source.isSelf && !cameraError ? (
          <video
            ref={(el) => {
              videoRef.current = el;
              const stream = mediaStreamRef.current || localBroadcastStream;
              if (el && stream && el.srcObject !== stream) {
                el.srcObject = stream;
                el.play().catch(() => {});
              }
            }}
            autoPlay
            playsInline
            muted
            style={transformStyle}
            className={`w-full h-full object-cover ${filterClass}`}
          />
        ) : remoteFrame ? (
          <img
            src={remoteFrame}
            alt="Live Remote Visitor Feed"
            style={transformStyle}
            className={`w-full h-full object-cover ${filterClass}`}
          />
        ) : (
          <canvas
            ref={visitorCanvasRef}
            style={transformStyle}
            className={`w-full h-full object-cover ${filterClass}`}
          />
        )}

        {/* Visitor Tactical Badge Overlay (Top Left) */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 pointer-events-none z-20">
          <div className={`px-2 py-1 rounded border text-[10px] font-mono flex items-center gap-1.5 shadow-lg backdrop-blur-md ${
            source.isRoot || source.isSelf
              ? "bg-emerald-950/90 border-emerald-400 text-emerald-200"
              : "bg-black/85 border-cyan-500/50 text-cyan-300"
          }`}>
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            {source.isRoot || source.isSelf ? (
              <Radio className="w-3 h-3 text-emerald-400" />
            ) : (
              <User className="w-3 h-3 text-cyan-400" />
            )}
            <span className="font-bold text-white tracking-wide truncate max-w-[180px]">
              {source.visitorName || source.label}
            </span>
            {(source.isRoot || source.isSelf) ? (
              <span className="text-[8px] font-extrabold px-1 py-0.2 bg-emerald-500/30 text-emerald-300 rounded border border-emerald-400">
                ROOT (YOU)
              </span>
            ) : streamToDisplay ? (
              <span className="text-[8px] font-extrabold px-1 py-0.2 bg-emerald-500/30 text-emerald-300 rounded border border-emerald-400 animate-pulse">
                LIVE WEBRTC
              </span>
            ) : remoteFrame ? (
              <span className="text-[8px] font-extrabold px-1 py-0.2 bg-emerald-500/30 text-emerald-300 rounded border border-emerald-400 animate-pulse">
                LIVE P2P RELAY
              </span>
            ) : (
              <span className="text-[8px] font-mono px-1 py-0.2 bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/40">
                SAR MESH FEED
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {source.visitorRole && (
              <span className="bg-black/75 px-1.5 py-0.5 rounded border border-zinc-700 text-[9px] font-mono text-zinc-300 truncate max-w-[140px]">
                {source.visitorRole}
              </span>
            )}
            {source.visitorLocation && (
              <span className="bg-black/75 px-1.5 py-0.5 rounded border border-cyan-500/30 text-[9px] font-mono text-cyan-400 flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                <span className="truncate max-w-[140px]">{source.visitorLocation}</span>
              </span>
            )}
          </div>
        </div>

        {/* Visitor Stream Link Quality HUD (Top Right) */}
        <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-md px-2 py-1 rounded border border-emerald-500/40 text-[9px] font-mono text-emerald-400 flex items-center gap-2 pointer-events-none z-20">
          <div className="flex items-center gap-1 text-emerald-300 font-bold">
            <Wifi className="w-3 h-3 text-emerald-400" />
            <span>P2P {source.visitorLatency || 18}ms</span>
          </div>
          <span className="text-zinc-500">|</span>
          <div className="flex items-center gap-1 text-zinc-300">
            <Battery className="w-3 h-3 text-emerald-400" />
            <span>{source.visitorBattery || 88}%</span>
          </div>
        </div>

        {/* Tactical Bodycam Audio & Stabilization Status (Bottom Left) */}
        <div className="absolute bottom-2 left-2 bg-black/80 backdrop-blur-md px-2 py-1 rounded border border-zinc-800 text-[9px] font-mono text-zinc-300 flex items-center gap-2 pointer-events-none z-20">
          <div className="flex items-center gap-1 text-cyan-400">
            <Shield className="w-3 h-3" />
            <span>OPTICAL STAB ACTIVE</span>
          </div>
          <span className="text-zinc-600">|</span>
          <div className="flex items-center gap-1 text-emerald-400">
            <Mic className="w-3 h-3" />
            <span className="flex gap-0.5 items-end h-2.5">
              <span className="w-0.5 h-1.5 bg-emerald-400 animate-pulse" />
              <span className="w-0.5 h-2.5 bg-emerald-400 animate-pulse" />
              <span className="w-0.5 h-1 bg-emerald-400 animate-pulse" />
            </span>
            <span>VOICE LINK</span>
          </div>
        </div>
        {autoFramingOverlay}
      </div>
    );
  }

  // 2. LiDAR 3D Scanner Point Cloud
  if (source.lensType === "lidar-pointcloud") {
    return (
      <div className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center">
        <canvas ref={canvasRef} className="w-full h-full object-cover" />
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-[9px] font-mono text-cyan-300">
          3D SOLID-STATE LIDAR RAYCAST
        </div>
      </div>
    );
  }

  // 3. FLIR Radiometric Thermal Sensor
  if (source.lensType === "thermal-flir") {
    return (
      <div className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center">
        <img
          src={activeDroneFeedImage}
          alt="Thermal IR Feed"
          style={transformStyle}
          className="w-full h-full object-cover hue-rotate-[190deg] invert contrast-[180%] saturate-[280%]"
          referrerPolicy="no-referrer"
        />
        {/* Radiometric spot temperature measurements */}
        <div className="absolute top-1/3 left-1/3 p-1 rounded bg-black/60 border border-amber-400/80 text-[9px] font-mono text-amber-300 flex items-center gap-1 pointer-events-none">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></div>
          <span>SPOT 01: 37.4°C [HEAT SIGNATURE]</span>
        </div>
        <div className="absolute bottom-1/3 right-1/4 p-1 rounded bg-black/60 border border-rose-500/80 text-[9px] font-mono text-rose-300 flex items-center gap-1 pointer-events-none">
          <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></div>
          <span>ENGINE: 64.2°C [HOT]</span>
        </div>
        {autoFramingOverlay}
      </div>
    );
  }

  // 4. Downward Belly Precision Cam
  if (source.lensType === "belly-downward") {
    return (
      <div className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center">
        <img
          src={activeDroneFeedImage}
          alt="Downward Belly Cam"
          style={transformStyle}
          className={`w-full h-full object-cover rotate-90 scale-125 opacity-90 ${filterClass}`}
          referrerPolicy="no-referrer"
        />
        {/* Precision Landing Target Cross & Altitude Radar Line */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-28 h-28 border-2 border-dashed border-amber-400/70 rounded-full flex items-center justify-center animate-spin-slow">
            <div className="w-16 h-16 border border-amber-400 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
            </div>
          </div>
          <div className="absolute top-3 left-3 bg-black/70 px-2 py-0.5 rounded border border-amber-500/40 text-[9px] font-mono text-amber-300">
            NADIR ALT RANGEFINDER: {drone?.telemetry.altitude || 120}m LOCK
          </div>
        </div>
      </div>
    );
  }

  // 5. FPV Nose Pilot Cockpit Cam
  if (source.lensType === "fpv-nose") {
    return (
      <div className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center">
        <img
          src={activeDroneFeedImage}
          alt="FPV Nose Cam"
          style={transformStyle}
          className={`w-full h-full object-cover scale-110 contrast-125 ${filterClass}`}
          referrerPolicy="no-referrer"
        />
        {/* Flight Ladder HUD Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="w-48 h-32 border-x-2 border-cyan-400/40 flex flex-col justify-between py-2 text-[8px] font-mono text-cyan-300">
            <div className="flex justify-between px-1"><span>+10°</span><span>+10°</span></div>
            <div className="w-full h-0.5 bg-cyan-400/60 flex justify-between">
              <span className="text-[10px] -mt-2">SPD {drone?.telemetry.speed.toFixed(0) || 35}</span>
              <span className="text-[10px] -mt-2">ALT {drone?.telemetry.altitude || 120}</span>
            </div>
            <div className="flex justify-between px-1"><span>-10°</span><span>-10°</span></div>
          </div>
          <div className="absolute top-2 left-2 bg-black/70 px-2 py-0.5 rounded border border-cyan-500/40 text-[9px] font-mono text-cyan-300">
            FPV NOSE • 120FPS 12ms RF LINK
          </div>
        </div>
      </div>
    );
  }

  // 6. 360° Wide Panoramic
  if (source.lensType === "wide-360") {
    return (
      <div className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center">
        <img
          src={activeDroneFeedImage}
          alt="360 Wide Cam"
          style={transformStyle}
          className={`w-full h-full object-cover scale-x-125 scale-y-90 ${filterClass}`}
          referrerPolicy="no-referrer"
        />
        <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-0.5 rounded border border-cyan-500/40 text-[9px] font-mono text-cyan-300 pointer-events-none">
          180° ULTRA-WIDE FISHEYE RECON
        </div>
      </div>
    );
  }

  // 7. Base Station Ground CCTV Cam
  if (source.lensType === "ground-cctv") {
    return (
      <div className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center">
        <img
          src={droneCameraFeed}
          alt="Ground CCTV"
          style={transformStyle}
          className={`w-full h-full object-cover contrast-110 brightness-90 grayscale-[0.3] ${filterClass}`}
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-2 left-2 bg-black/70 px-2 py-0.5 rounded border border-emerald-500/40 text-[9px] font-mono text-emerald-400 flex items-center gap-1.5 pointer-events-none">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span>STATIC CCTV • PERIMETER MOTION DETECT</span>
        </div>
      </div>
    );
  }

  // 8. Default Forward 4K RGB Main Gimbal
  return (
    <div className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center">
      {drone && drone.cameraStatus !== "Active" && !isDrone1RelayActive ? (
        <div className="flex flex-col items-center gap-2 text-zinc-600">
          <RadioReceiver className="w-8 h-8 opacity-50" />
          <span className="text-xs tracking-widest uppercase font-mono">Camera Offline / Standby</span>
        </div>
      ) : (
        <>
          {isDrone1RelayActive && isSelfRelay ? (
            <video
              ref={drone1VideoRef}
              autoPlay
              playsInline
              muted
              style={transformStyle}
              className={`w-full h-full object-cover select-none ${filterClass}`}
            />
          ) : (
            <img
              src={activeDroneFeedImage}
              alt="Drone Forward Cam"
              style={transformStyle}
              className={`w-full h-full object-cover ${filterClass}`}
              referrerPolicy="no-referrer"
            />
          )}

          {/* Drone 1 Relay Tactical Status Badge */}
          {isDrone1RelayActive && (
            <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950/90 border border-emerald-400/80 shadow-xl text-[10px] font-mono text-emerald-200 pointer-events-none backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-bold text-white">DRN-01 RELAY:</span>
              <span className="text-emerald-300 font-bold truncate max-w-[140px]">{drone1BroadcasterName}</span>
              <span className="text-[8px] bg-emerald-500/20 text-emerald-300 px-1 py-0.2 rounded border border-emerald-400/50 font-bold uppercase tracking-wider ml-1">
                {isSelfRelay ? "THIS DEVICE" : "REMOTE BROADCAST"}
              </span>
            </div>
          )}

          {/* AI Bounding Boxes */}
          {showAiBoxes && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Target: Vehicle */}
              <div className="absolute top-[28%] left-[45%] w-24 h-16 border-2 border-emerald-400 rounded-sm">
                <div className="absolute -top-4 left-0 bg-emerald-950/90 text-emerald-300 text-[8px] font-mono font-bold px-1 rounded border border-emerald-500/50">
                  VEHICLE [98%]
                </div>
              </div>
            </div>
          )}
          {autoFramingOverlay}
        </>
      )}
    </div>
  );
}
