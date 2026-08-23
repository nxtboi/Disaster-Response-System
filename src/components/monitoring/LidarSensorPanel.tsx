import React, { useEffect, useRef, useState } from "react";
import { Drone } from "../../types";
import {
  Radar,
  Maximize2,
  Minimize2,
  AlertTriangle,
  Layers,
  ShieldCheck,
  Zap,
  Activity,
  Sliders,
  Scan,
} from "lucide-react";

interface LidarSensorPanelProps {
  drone: Drone;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
}

export function LidarSensorPanel({
  drone,
  isMaximized,
  onToggleMaximize,
}: LidarSensorPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rangeRadius, setRangeRadius] = useState<number>(30); // 15m, 30m, 60m, 120m
  const [returnMode, setReturnMode] = useState<"strongest" | "dual" | "nadir">("strongest");
  const [filterNoise, setFilterNoise] = useState(true);
  const [nearestObstacle, setNearestObstacle] = useState<{ distance: number; angle: number; level: "safe" | "warning" | "danger" }>({
    distance: 4.2,
    angle: 52,
    level: "warning",
  });

  const isLidarActive = drone.lidarStatus === "Active";

  // Render 360° Real-Time LiDAR Radar Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let sweepAngle = 0;
    let tick = 0;

    const render = () => {
      tick += 0.03;
      sweepAngle = (sweepAngle + 0.04) % (Math.PI * 2);

      // Handle high-DPI scaling
      const width = Math.max(80, canvas.clientWidth || 300);
      const height = Math.max(80, canvas.clientHeight || 200);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      ctx.fillStyle = "#09090b";
      ctx.fillRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const maxR = Math.max(20, Math.min(centerX, centerY) - 15);

      // Draw Grid / Range Rings
      const ringSteps = [0.25, 0.5, 0.75, 1.0];
      ringSteps.forEach((step, idx) => {
        const r = Math.max(2, maxR * step);
        ctx.strokeStyle = idx === ringSteps.length - 1 ? "rgba(6, 182, 212, 0.4)" : "rgba(6, 182, 212, 0.15)";
        ctx.lineWidth = 1;
        ctx.setLineDash(idx % 2 === 0 ? [] : [3, 3]);
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.stroke();

        // Distance label
        ctx.fillStyle = "rgba(6, 182, 212, 0.5)";
        ctx.font = "8px monospace";
        ctx.fillText(`${(rangeRadius * step).toFixed(0)}m`, centerX + r - 16, centerY - 3);
      });
      ctx.setLineDash([]);

      // Cardinal axes
      ctx.strokeStyle = "rgba(6, 182, 212, 0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(centerX - maxR, centerY);
      ctx.lineTo(centerX + maxR, centerY);
      ctx.moveTo(centerX, centerY - maxR);
      ctx.lineTo(centerX, centerY + maxR);
      ctx.stroke();

      // Heading indicator (drone heading)
      const droneHeadingRad = ((drone.telemetry.heading - 90) * Math.PI) / 180;
      ctx.strokeStyle = "rgba(244, 63, 94, 0.7)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + Math.cos(droneHeadingRad) * (maxR * 0.9), centerY + Math.sin(droneHeadingRad) * (maxR * 0.9));
      ctx.stroke();

      if (isLidarActive) {
        // Draw 360° Radar Sweep
        const safeSweepRadius = Math.max(10, maxR);
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, safeSweepRadius, sweepAngle - 0.5, sweepAngle);
        ctx.closePath();
        const sweepGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, safeSweepRadius);
        sweepGrad.addColorStop(0, "rgba(6, 182, 212, 0.45)");
        sweepGrad.addColorStop(0.8, "rgba(6, 182, 212, 0.15)");
        sweepGrad.addColorStop(1, "rgba(6, 182, 212, 0.0)");
        ctx.fillStyle = sweepGrad;
        ctx.fill();

        // Draw Point Cloud
        const totalPoints = 180;
        let minObsDist = 999;
        let minObsAngle = 0;

        for (let i = 0; i < totalPoints; i++) {
          const ptAngle = (i * 137.5 * Math.PI) / 180 + Math.sin(tick * 0.5 + i) * 0.05;
          // Cluster points to simulate trees/structures
          const clusterNoise = Math.sin(i * 0.7) * 0.3;
          const distRatio = Math.max(0.12, Math.min(0.96, 0.25 + clusterNoise + Math.sin(i * 12.3 + tick * 0.2) * 0.35));
          const r = Math.max(1, distRatio * maxR);

          const px = centerX + Math.cos(ptAngle) * r;
          const py = centerY + Math.sin(ptAngle) * r;

          const realDistanceMeters = distRatio * rangeRadius;
          if (realDistanceMeters < minObsDist) {
            minObsDist = realDistanceMeters;
            minObsAngle = Math.round(((ptAngle * 180) / Math.PI + 360) % 360);
          }

          // Point Color: Red/Amber if close (<8m), Cyan/Emerald if safe (>12m)
          let color = "#06b6d4";
          let pointSize = 1.5;
          if (realDistanceMeters < 5) {
            color = "#f43f5e"; // danger
            pointSize = 2.5;
          } else if (realDistanceMeters < 10) {
            color = "#f59e0b"; // warning
            pointSize = 2;
          } else {
            color = "#10b981"; // clear
          }

          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(px, py, Math.max(0.5, pointSize), 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw Simulated Detected Obstacle Clusters
        const obstacles = [
          { angle: 0.8, distRatio: 0.28, label: "OBSTACLE [TREE]" },
          { angle: 2.4, distRatio: 0.55, label: "STRUCTURE" },
          { angle: 4.6, distRatio: 0.72, label: "TERRAIN ELEVATION" },
        ];

        obstacles.forEach((obs) => {
          const ox = centerX + Math.cos(obs.angle + Math.sin(tick) * 0.02) * (obs.distRatio * maxR);
          const oy = centerY + Math.sin(obs.angle + Math.sin(tick) * 0.02) * (obs.distRatio * maxR);

          ctx.strokeStyle = obs.distRatio < 0.35 ? "#f43f5e" : "#f59e0b";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(ox, oy, 8, 0, Math.PI * 2);
          ctx.stroke();

          // Pulsing inner ring
          ctx.fillStyle = obs.distRatio < 0.35 ? "rgba(244, 63, 94, 0.3)" : "rgba(245, 158, 11, 0.2)";
          ctx.beginPath();
          ctx.arc(ox, oy, Math.max(0.5, 4 + Math.sin(tick * 4) * 2), 0, Math.PI * 2);
          ctx.fill();
        });

        // Center Drone Reticle
        ctx.fillStyle = "#38bdf8";
        ctx.beginPath();
        ctx.arc(centerX, centerY, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isLidarActive, rangeRadius, drone.telemetry.heading]);

  return (
    <div className="w-full h-full bg-zinc-950 border border-zinc-800/80 rounded-xl overflow-hidden flex flex-col relative group select-none shadow-lg">
      {/* Top Header */}
      <div className="h-10 bg-zinc-900/90 border-b border-zinc-800 px-3 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-cyan-500/20 text-cyan-400">
            <Radar className="w-3.5 h-3.5 animate-spin-slow" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold font-mono tracking-wider text-zinc-100 uppercase">
              3D LIDAR FEEDBACK
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">
              240k PTS/S • 360°x40°
            </span>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-1.5">
          {/* Lidar health status badge */}
          <div
            className={`px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 ${
              isLidarActive
                ? "bg-emerald-500/15 border border-emerald-500/40 text-emerald-400"
                : "bg-zinc-800 text-zinc-400"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isLidarActive ? "bg-emerald-400 animate-ping" : "bg-zinc-500"
              }`}
            />
            <span>{isLidarActive ? "ACTIVE SCAN" : "STANDBY"}</span>
          </div>

          {/* Maximize */}
          {onToggleMaximize && (
            <button
              onClick={onToggleMaximize}
              className="p-1.5 rounded text-zinc-400 hover:text-zinc-100 bg-zinc-800 transition-colors"
              title={isMaximized ? "Restore 4-Grid" : "Maximize LiDAR Feed"}
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

      {/* Main LiDAR Canvas Viewport */}
      <div className="flex-1 relative overflow-hidden bg-zinc-950 flex items-center justify-center">
        {!isLidarActive ? (
          <div className="flex flex-col items-center gap-2 text-zinc-500 p-6 text-center">
            <AlertTriangle className="w-8 h-8 text-amber-400 opacity-60" />
            <span className="text-xs font-mono font-bold text-zinc-300 uppercase">
              LiDAR Scanner Offline
            </span>
            <span className="text-[11px] text-zinc-500">
              Drone #{drone.id} LiDAR payload not streaming. Switch to Drone 01 or calibrate sensor.
            </span>
          </div>
        ) : (
          <>
            <canvas ref={canvasRef} className="w-full h-full object-contain" />

            {/* Obstacle Proximity Warning Banner */}
            <div className="absolute top-2 left-2 bg-black/80 border border-amber-500/60 backdrop-blur-xs px-2.5 py-1 rounded-md text-[10px] font-mono text-amber-300 flex items-center gap-2 pointer-events-none shadow-md">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <div>
                <span className="font-bold text-white">NEAREST OBSTACLE: </span>
                <span className="text-rose-400 font-extrabold">{nearestObstacle.distance}m</span>
                <span className="text-zinc-400"> @ {nearestObstacle.angle}° [AVOIDANCE SAFE]</span>
              </div>
            </div>

            {/* Live Point Cloud Metrics Overlay */}
            <div className="absolute bottom-2 right-2 bg-black/80 border border-zinc-800 p-2 rounded-md text-[9px] font-mono text-zinc-400 flex flex-col gap-0.5 pointer-events-none">
              <div className="flex justify-between gap-3 text-cyan-300">
                <span>PULSE RATE:</span>
                <span className="font-bold">20.0 Hz</span>
              </div>
              <div className="flex justify-between gap-3 text-zinc-300">
                <span>ELEVATION:</span>
                <span>±20° SOLID-STATE</span>
              </div>
              <div className="flex justify-between gap-3 text-emerald-400">
                <span>SURFACE RETURN:</span>
                <span>DUAL-ECHO OK</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom Tool Strip */}
      <div className="h-9 bg-zinc-900/90 border-t border-zinc-800 px-3 flex items-center justify-between text-xs font-mono shrink-0">
        {/* Range Radius Switcher */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-zinc-500 mr-1 uppercase">Scan Range:</span>
          {[15, 30, 60, 120].map((r) => (
            <button
              key={r}
              onClick={() => setRangeRadius(r)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                rangeRadius === r
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {r}m
            </button>
          ))}
        </div>

        {/* Return Mode */}
        <div className="flex items-center gap-1 text-[10px] text-zinc-400">
          <span className="text-zinc-500">MODE:</span>
          {(["strongest", "dual"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setReturnMode(m)}
              className={`px-1.5 py-0.5 rounded uppercase font-mono ${
                returnMode === m
                  ? "bg-zinc-800 text-cyan-300 border border-cyan-500/30"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
