import React, { useEffect, useRef, useState } from "react";
import droneCameraFeed from "../../assets/images/drone_camera_feed_1787467816443.jpg";
import { CameraSourceInfo, LensType, VisionMode } from "./CameraTypes";
import { Drone } from "../../types";
import { AlertCircle, RefreshCw, RadioReceiver } from "lucide-react";

interface CameraRendererProps {
  source: CameraSourceInfo;
  drone?: Drone;
  visionMode: VisionMode;
  zoom: 1 | 2 | 4;
  ptz: { pan: number; tilt: number };
  showAiBoxes: boolean;
  onSnapshot?: () => void;
}

export function CameraRenderer({
  source,
  drone,
  visionMode,
  zoom,
  ptz,
  showAiBoxes,
}: CameraRendererProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLoadingWebcam, setIsLoadingWebcam] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  // Filter styles
  const filterClass = {
    normal: "",
    nvg: "sepia-[0.85] hue-rotate-[75deg] saturate-[300%] contrast-[130%] brightness-[105%]",
    thermal: "hue-rotate-[180deg] invert-[0.9] contrast-[170%] saturate-[250%]",
    mono: "grayscale contrast-[140%] brightness-[90%]",
  }[visionMode];

  // PTZ and Zoom transform
  const transformStyle = {
    transform: `scale(${zoom}) translate(${ptz.pan * 0.4}px, ${ptz.tilt * 0.4}px)`,
    transformOrigin: "center center",
    transition: "transform 0.15s ease-out",
  };

  // Start real webcam stream if source is device-webcam
  useEffect(() => {
    if (source.lensType !== "device-webcam") {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
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
  }, [source.lensType, source.deviceId, source.id, facingMode]);

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

        // Color by proximity (red = close, green/cyan = far)
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
          src={droneCameraFeed}
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
      </div>
    );
  }

  // 4. Downward Belly Precision Cam
  if (source.lensType === "belly-downward") {
    return (
      <div className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center">
        <img
          src={droneCameraFeed}
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
          src={droneCameraFeed}
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
          src={droneCameraFeed}
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
      {drone && drone.cameraStatus !== "Active" ? (
        <div className="flex flex-col items-center gap-2 text-zinc-600">
          <RadioReceiver className="w-8 h-8 opacity-50" />
          <span className="text-xs tracking-widest uppercase font-mono">Camera Offline / Standby</span>
        </div>
      ) : (
        <>
          <img
            src={droneCameraFeed}
            alt="Drone Forward Cam"
            style={transformStyle}
            className={`w-full h-full object-cover ${filterClass}`}
            referrerPolicy="no-referrer"
          />

          {/* AI Bounding Boxes */}
          {showAiBoxes && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Target 1: Vehicle */}
              <div className="absolute top-[28%] left-[45%] w-24 h-16 border-2 border-emerald-400 rounded-sm">
                <div className="absolute -top-4 left-0 bg-emerald-950/90 text-emerald-300 text-[8px] font-mono font-bold px-1 rounded border border-emerald-500/50">
                  VEHICLE [98%]
                </div>
              </div>

              {/* Target 2: Personnel */}
              <div className="absolute top-[52%] left-[22%] w-14 h-20 border-2 border-amber-400 rounded-sm">
                <div className="absolute -top-4 left-0 bg-amber-950/90 text-amber-300 text-[8px] font-mono font-bold px-1 rounded border border-amber-500/50">
                  HUMAN #04 [94%]
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
