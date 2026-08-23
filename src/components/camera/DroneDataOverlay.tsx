import React, { useState, useEffect } from "react";
import { Drone } from "../../types";
import {
  Battery,
  BatteryCharging,
  BatteryWarning,
  Signal,
  Radio,
  Compass,
  ArrowUp,
  ArrowDown,
  Gauge,
  Wifi,
  Satellite,
  Activity,
  Layers,
  Cpu,
} from "lucide-react";

interface DroneDataOverlayProps {
  drone?: Drone;
  compact?: boolean;
  showFullHud?: boolean;
}

export function DroneDataOverlay({
  drone,
  compact = false,
  showFullHud = false,
}: DroneDataOverlayProps) {
  // Simulated real-time micro-fluctuations
  const [altOffset, setAltOffset] = useState(0);
  const [vSpeed, setVSpeed] = useState(0.2);
  const [signalDbm, setSignalDbm] = useState(-58);
  const [latencyMs, setLatencyMs] = useState(16);
  const [batteryAmps, setBatteryAmps] = useState(14.2);
  const [batteryTemp, setBatteryTemp] = useState(32.4);

  // Default baseline data if drone is undefined
  const baseAltitude = drone?.telemetry?.altitude ?? 120;
  const batteryPct = drone?.battery ?? 88;
  const baseSpeed = drone?.telemetry?.speed ?? 34.5;
  const satellites = drone?.telemetry?.satelliteCount ?? 18;
  const heading = drone?.telemetry?.heading ?? 45;

  // Live micro-jitter tick for authentic airborne telemetry
  useEffect(() => {
    const timer = setInterval(() => {
      setAltOffset((prev) => {
        const delta = (Math.random() - 0.5) * 0.4;
        const newOffset = Math.max(-2, Math.min(2, prev + delta));
        return Number(newOffset.toFixed(2));
      });

      setVSpeed((prev) => {
        const delta = (Math.random() - 0.48) * 0.15;
        return Number(Math.max(-1.5, Math.min(1.5, prev + delta)).toFixed(2));
      });

      setSignalDbm((prev) => {
        const delta = (Math.random() - 0.5) * 2;
        return Math.round(Math.max(-85, Math.min(-45, prev + delta)));
      });

      setLatencyMs((prev) => {
        const delta = (Math.random() - 0.5) * 3;
        return Math.round(Math.max(12, Math.min(38, prev + delta)));
      });

      setBatteryAmps((prev) => {
        const delta = (Math.random() - 0.5) * 0.4;
        return Number(Math.max(8, Math.min(22, prev + delta)).toFixed(1));
      });

      setBatteryTemp((prev) => {
        const delta = (Math.random() - 0.5) * 0.1;
        return Number(Math.max(28, Math.min(42, prev + delta)).toFixed(1));
      });
    }, 600);

    return () => clearInterval(timer);
  }, []);

  const currentAltitude = Math.max(0, Number((baseAltitude + altOffset).toFixed(1)));
  const altitudeFeet = Math.round(currentAltitude * 3.28084);

  // Signal Strength calculation (0-100%)
  // -50 dBm is ~100%, -90 dBm is ~10%
  const signalPercentage = Math.round(
    Math.max(10, Math.min(100, ((signalDbm + 95) / 45) * 100))
  );

  // Battery remaining flight time estimate (approx 28 mins total pack capacity)
  const estMinutesRemaining = Math.max(1, Math.round((batteryPct / 100) * 28));
  const estSecondsRemaining = Math.round(((batteryPct % 1) || 0.4) * 60);

  // Color classes based on thresholds
  const batteryColor =
    batteryPct > 50
      ? "text-emerald-400"
      : batteryPct > 20
      ? "text-amber-400"
      : "text-rose-400";

  const batteryBarBg =
    batteryPct > 50
      ? "bg-emerald-500"
      : batteryPct > 20
      ? "bg-amber-500"
      : "bg-rose-500";

  const signalColor =
    signalPercentage > 75
      ? "text-cyan-400"
      : signalPercentage > 40
      ? "text-amber-400"
      : "text-rose-400";

  if (compact) {
    return (
      <div
        id="drs-compact-data-overlay"
        className="w-full flex items-center justify-between gap-1.5 px-2 py-1 bg-black/70 backdrop-blur-md border border-cyan-500/25 rounded-md font-mono text-[10px] text-zinc-300 shadow-md select-none"
      >
        {/* Altitude */}
        <div className="flex items-center gap-1 min-w-0">
          <Gauge className="w-3 h-3 text-cyan-400 shrink-0" />
          <span className="text-zinc-500">ALT:</span>
          <span className="font-bold text-cyan-300">{currentAltitude}m</span>
          <span className="text-[9px] text-zinc-500 hidden sm:inline">({altitudeFeet}ft)</span>
          <span className={`text-[9px] ${vSpeed >= 0 ? "text-emerald-400" : "text-amber-400"}`}>
            {vSpeed >= 0 ? `▲+${vSpeed}` : `▼${vSpeed}`}
          </span>
        </div>

        {/* Battery */}
        <div className="flex items-center gap-1 min-w-0">
          <Battery className={`w-3 h-3 ${batteryColor} shrink-0`} />
          <span className="text-zinc-500">BAT:</span>
          <span className={`font-bold ${batteryColor}`}>{batteryPct}%</span>
          <span className="text-[9px] text-zinc-500 hidden md:inline">({estMinutesRemaining}m)</span>
        </div>

        {/* Signal */}
        <div className="flex items-center gap-1 min-w-0">
          <Wifi className={`w-3 h-3 ${signalColor} shrink-0`} />
          <span className="text-zinc-500">LINK:</span>
          <span className={`font-bold ${signalColor}`}>{signalPercentage}%</span>
          <span className="text-[9px] text-zinc-500 hidden lg:inline">{signalDbm}dBm</span>
        </div>
      </div>
    );
  }

  return (
    <div
      id="drs-tactical-data-overlay"
      className="w-full flex flex-col gap-2 font-mono text-zinc-200 select-none pointer-events-none"
    >
      {/* Top Telemetry Dashboard Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
        {/* Altitude Module Card */}
        <div
          id="overlay-altitude-card"
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-black/75 backdrop-blur-md border border-cyan-500/40 shadow-[0_4px_12px_rgba(0,0,0,0.6)] pointer-events-auto group/alt"
        >
          <div className="p-1 rounded bg-cyan-500/20 text-cyan-300">
            <Gauge className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">ALTITUDE</span>
              <div className="flex items-center text-[9px] px-1 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-300">
                {vSpeed >= 0 ? (
                  <span className="flex items-center text-emerald-400 font-bold">
                    <ArrowUp className="w-2.5 h-2.5" />+{vSpeed}m/s
                  </span>
                ) : (
                  <span className="flex items-center text-amber-400 font-bold">
                    <ArrowDown className="w-2.5 h-2.5" />{vSpeed}m/s
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-black text-cyan-300 tracking-tight">
                {currentAltitude} <span className="text-[10px] font-normal text-cyan-400">m</span>
              </span>
              <span className="text-[10px] text-zinc-400">/ {altitudeFeet} ft</span>
              <span className="text-[9px] text-zinc-500 hidden sm:inline">MSL 1013 hPa</span>
            </div>
          </div>
        </div>

        {/* Signal & RF Link Module Card */}
        <div
          id="overlay-signal-card"
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-black/75 backdrop-blur-md border border-cyan-500/40 shadow-[0_4px_12px_rgba(0,0,0,0.6)] pointer-events-auto"
        >
          <div className="p-1 rounded bg-cyan-500/20 text-cyan-300">
            <Wifi className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">RF LINK</span>
              <span className="text-[9px] text-zinc-400">{latencyMs}ms</span>
              <div className="flex items-center gap-0.5 ml-1">
                {[1, 2, 3, 4, 5].map((bar) => {
                  const isActive = signalPercentage >= bar * 20 - 10;
                  return (
                    <div
                      key={bar}
                      className={`w-1 rounded-sm transition-all ${
                        isActive
                          ? signalPercentage > 50
                            ? "bg-cyan-400"
                            : "bg-amber-400"
                          : "bg-zinc-700"
                      }`}
                      style={{ height: `${bar * 2.5 + 4}px` }}
                    />
                  );
                })}
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-sm font-black ${signalColor} tracking-tight`}>
                {signalPercentage}%
              </span>
              <span className="text-[10px] text-zinc-400">({signalDbm} dBm)</span>
              <span className="text-[9px] text-emerald-400/90 hidden sm:inline flex items-center gap-0.5">
                <Satellite className="w-2.5 h-2.5 inline" /> {satellites} Sats
              </span>
            </div>
          </div>
        </div>

        {/* Battery Power Module Card */}
        <div
          id="overlay-battery-card"
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-black/75 backdrop-blur-md border border-cyan-500/40 shadow-[0_4px_12px_rgba(0,0,0,0.6)] pointer-events-auto"
        >
          <div className={`p-1 rounded bg-zinc-900 ${batteryColor}`}>
            {batteryPct > 20 ? (
              <Battery className="w-4 h-4" />
            ) : (
              <BatteryWarning className="w-4 h-4 animate-bounce" />
            )}
          </div>
          <div className="flex flex-col min-w-[110px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">BATTERY</span>
              <span className="text-[9px] text-zinc-400 font-medium">
                ~{estMinutesRemaining}m {estSecondsRemaining}s
              </span>
            </div>
            
            <div className="flex items-center gap-2 mt-0.5">
              {/* Progress gauge bar */}
              <div className="flex-1 h-2 rounded bg-zinc-800 border border-zinc-700 overflow-hidden relative">
                <div
                  className={`h-full ${batteryBarBg} transition-all duration-300 rounded-sm`}
                  style={{ width: `${Math.min(100, Math.max(0, batteryPct))}%` }}
                />
              </div>
              <span className={`text-xs font-black ${batteryColor}`}>
                {batteryPct}%
              </span>
            </div>

            <div className="flex items-center justify-between text-[8px] text-zinc-500 mt-0.5">
              <span>{batteryAmps}A • 22.8V</span>
              <span>{batteryTemp}°C</span>
            </div>
          </div>
        </div>
      </div>

      {/* Optional Full HUD Pitch Ladder & Crosshair Lines (when expanded) */}
      {showFullHud && (
        <div className="relative w-full h-24 my-2 flex items-center justify-between px-6 pointer-events-none opacity-40">
          {/* Left Speed / Air Tape */}
          <div className="flex flex-col items-center gap-1 text-[9px] font-mono text-cyan-400">
            <span className="text-[8px] text-zinc-500">SPD (KM/H)</span>
            <div className="border-l-2 border-cyan-400 pl-1 flex flex-col gap-1">
              <span>{(baseSpeed + 5).toFixed(0)}</span>
              <span className="font-bold text-white bg-cyan-950 px-1 rounded border border-cyan-400">
                {baseSpeed.toFixed(1)}
              </span>
              <span>{Math.max(0, baseSpeed - 5).toFixed(0)}</span>
            </div>
          </div>

          {/* Center Artificial Horizon Line */}
          <div className="flex-1 flex flex-col items-center justify-center relative">
            <div className="w-32 h-[1px] bg-cyan-400/60 relative">
              <div className="w-2 h-2 border-t-2 border-l-2 border-cyan-400 absolute -top-1 left-0" />
              <div className="w-2 h-2 border-t-2 border-r-2 border-cyan-400 absolute -top-1 right-0" />
            </div>
            <div className="text-[8px] text-cyan-300 mt-1">HDG {heading}° • PITCH 0°</div>
          </div>

          {/* Right Altitude Tape */}
          <div className="flex flex-col items-center gap-1 text-[9px] font-mono text-cyan-400">
            <span className="text-[8px] text-zinc-500">ALT (M)</span>
            <div className="border-r-2 border-cyan-400 pr-1 flex flex-col items-end gap-1">
              <span>{(currentAltitude + 10).toFixed(0)}</span>
              <span className="font-bold text-white bg-cyan-950 px-1 rounded border border-cyan-400">
                {currentAltitude.toFixed(0)}m
              </span>
              <span>{Math.max(0, currentAltitude - 10).toFixed(0)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
