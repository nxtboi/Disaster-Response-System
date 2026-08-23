import React, { useState, useEffect } from "react";
import { Drone } from "../../types";
import droneCameraFeed from "../../assets/images/drone_camera_feed_1787467816443.jpg";
import {
  Flame,
  Maximize2,
  Minimize2,
  Thermometer,
  Crosshair,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Sliders,
} from "lucide-react";

interface ThermalCameraPanelProps {
  drone: Drone;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
}

export type ThermalPalette = "ironbow" | "white-hot" | "black-hot" | "rainbow";

export function ThermalCameraPanel({
  drone,
  isMaximized,
  onToggleMaximize,
}: ThermalCameraPanelProps) {
  const [palette, setPalette] = useState<ThermalPalette>("ironbow");
  const [zoom, setZoom] = useState<number>(1);
  const [showSpotTemp, setShowSpotTemp] = useState<boolean>(true);
  const [heatAlarmActive, setHeatAlarmActive] = useState<boolean>(true);
  const [alarmThreshold, setAlarmThreshold] = useState<number>(45);

  // Simulated live thermal fluctuation
  const [temps, setTemps] = useState({
    spot1: 37.1,
    spot2: 64.8,
    max: 68.4,
    min: 17.2,
    ambient: 23.5,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setTemps((prev) => ({
        ...prev,
        spot1: Number((36.8 + (Math.random() * 0.6 - 0.3)).toFixed(1)),
        spot2: Number((64.5 + (Math.random() * 1.2 - 0.6)).toFixed(1)),
        max: Number((68.0 + (Math.random() * 1.0 - 0.5)).toFixed(1)),
        min: Number((17.0 + (Math.random() * 0.4 - 0.2)).toFixed(1)),
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const getPaletteStyle = () => {
    switch (palette) {
      case "ironbow":
        return "hue-rotate-[195deg] invert contrast-[185%] saturate-[280%]";
      case "white-hot":
        return "grayscale contrast-[220%] brightness-[110%]";
      case "black-hot":
        return "grayscale invert contrast-[220%] brightness-[105%]";
      case "rainbow":
        return "hue-rotate-[90deg] saturate-[350%] contrast-[190%]";
      default:
        return "hue-rotate-[195deg] invert contrast-[185%] saturate-[280%]";
    }
  };

  const isAlarmTriggered = temps.max > alarmThreshold;

  return (
    <div className="w-full h-full bg-zinc-950 border border-zinc-800/80 rounded-xl overflow-hidden flex flex-col relative group select-none shadow-lg">
      {/* Top Header */}
      <div className="h-10 bg-zinc-900/90 border-b border-zinc-800 px-3 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-amber-500/20 text-amber-400">
            <Flame className="w-3.5 h-3.5 animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold font-mono tracking-wider text-zinc-100 uppercase">
              FLIR THERMAL IR
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-500/40 text-amber-300">
              LWIR 640x512 • &lt;30mK
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Heat Alarm Badge */}
          {heatAlarmActive && (
            <div
              className={`px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 border ${
                isAlarmTriggered
                  ? "bg-rose-500/20 border-rose-500 text-rose-300 animate-pulse"
                  : "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
              }`}
            >
              <Thermometer className="w-3 h-3" />
              <span>MAX: {temps.max}°C</span>
            </div>
          )}

          {/* Spot Temp Toggle */}
          <button
            onClick={() => setShowSpotTemp(!showSpotTemp)}
            className={`p-1.5 rounded text-xs transition-colors ${
              showSpotTemp
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "text-zinc-400 hover:text-zinc-200 bg-zinc-800"
            }`}
            title="Toggle Radiometric Spot Readings"
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>

          {/* Maximize */}
          {onToggleMaximize && (
            <button
              onClick={onToggleMaximize}
              className="p-1.5 rounded text-zinc-400 hover:text-zinc-100 bg-zinc-800 transition-colors"
              title={isMaximized ? "Restore 4-Grid" : "Maximize Thermal Feed"}
            >
              {isMaximized ? (
                <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Main Thermal Viewport */}
      <div className="flex-1 relative overflow-hidden bg-black flex items-center justify-center">
        <img
          src={droneCameraFeed}
          alt="Thermal Infrared Feed"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "center center",
            transition: "transform 0.15s ease-out",
          }}
          className={`w-full h-full object-cover select-none pointer-events-none ${getPaletteStyle()}`}
          referrerPolicy="no-referrer"
        />

        {/* Spot Temperature Reticles */}
        {showSpotTemp && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Spot 1: Human Body Heat Signature */}
            <div className="absolute top-[46%] left-[32%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
              <div className="w-5 h-5 border border-amber-300 rounded-full flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-ping" />
              </div>
              <div className="mt-1 bg-black/85 border border-amber-400/80 px-1.5 py-0.5 rounded text-[8px] font-mono text-amber-300 font-bold whitespace-nowrap shadow-md flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>HUMAN CORE: {temps.spot1}°C</span>
              </div>
            </div>

            {/* Spot 2: Mechanical Heat Source */}
            <div className="absolute top-[30%] left-[62%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
              <div className="w-5 h-5 border border-rose-400 rounded-full flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
              </div>
              <div className="mt-1 bg-black/85 border border-rose-500/80 px-1.5 py-0.5 rounded text-[8px] font-mono text-rose-300 font-bold whitespace-nowrap shadow-md flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                <span>MOTOR/ENGINE: {temps.spot2}°C [HOT]</span>
              </div>
            </div>
          </div>
        )}

        {/* Thermal Scale Gradient Legend */}
        <div className="absolute top-3 right-3 bg-black/80 border border-zinc-800 p-2 rounded-md flex flex-col items-center gap-1 pointer-events-none">
          <span className="text-[8px] font-mono text-rose-400 font-bold">
            {temps.max}°C
          </span>
          <div
            className="w-3.5 h-24 rounded border border-zinc-700"
            style={{
              background:
                palette === "white-hot"
                  ? "linear-gradient(to top, #000, #fff)"
                  : palette === "black-hot"
                  ? "linear-gradient(to top, #fff, #000)"
                  : palette === "rainbow"
                  ? "linear-gradient(to top, #00f, #0ff, #0f0, #ff0, #f00)"
                  : "linear-gradient(to top, #000033, #4b0082, #800080, #ff4500, #ffff00, #ffffff)",
            }}
          />
          <span className="text-[8px] font-mono text-cyan-400 font-bold">
            {temps.min}°C
          </span>
        </div>

        {/* Telemetry Badge */}
        <div className="absolute bottom-2 left-2 bg-black/80 border border-zinc-800 px-2 py-1 rounded text-[9px] font-mono text-zinc-300 flex items-center gap-3 pointer-events-none">
          <span>EMISSIVITY: 0.95</span>
          <span>AMBIENT: {temps.ambient}°C</span>
          <span className="text-amber-400">ISOTHERM: ACTIVE</span>
        </div>
      </div>

      {/* Bottom Tool Strip */}
      <div className="h-9 bg-zinc-900/90 border-t border-zinc-800 px-3 flex items-center justify-between text-xs font-mono shrink-0">
        {/* Palette Selector */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-zinc-500 mr-1 uppercase">Palette:</span>
          {(["ironbow", "white-hot", "black-hot", "rainbow"] as const).map((pal) => (
            <button
              key={pal}
              onClick={() => setPalette(pal)}
              className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold transition-colors ${
                palette === pal
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {pal.replace("-", " ")}
            </button>
          ))}
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-1 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
          <button
            onClick={() => setZoom((z) => Math.max(1, z / 2))}
            disabled={zoom <= 1}
            className="text-zinc-400 hover:text-zinc-100 disabled:opacity-30"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] text-amber-300 font-bold px-1">{zoom}X</span>
          <button
            onClick={() => setZoom((z) => Math.min(4, z * 2))}
            disabled={zoom >= 4}
            className="text-zinc-400 hover:text-zinc-100 disabled:opacity-30"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
