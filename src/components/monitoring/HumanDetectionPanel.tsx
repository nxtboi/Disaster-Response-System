import React, { useState, useEffect } from "react";
import { Drone } from "../../types";
import {
  UserCheck,
  Users,
  Activity,
  Heart,
  Maximize2,
  Minimize2,
  Compass,
  AlertCircle,
  ShieldAlert,
  Volume2,
  VolumeX,
  Target,
  Clock,
  Sparkles,
  CheckCircle2,
  Navigation,
} from "lucide-react";

interface HumanDetectionPanelProps {
  drone: Drone;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
}

export interface DetectedHumanTarget {
  id: string;
  name: string;
  confidence: number;
  distanceMeters: number;
  bearingDeg: number;
  vitalTemp: number;
  heartRateEst: number;
  posture: "WALKING" | "STANDING" | "CROUCHED" | "PRONE / INJURED";
  classification: "SURVIVOR / CIV" | "FRIENDLY SEARCHER" | "UNIDENTIFIED";
  riskLevel: "safe" | "warning" | "sos";
  lastDetectedAgo: string;
}

export function HumanDetectionPanel({
  drone,
  isMaximized,
  onToggleMaximize,
}: HumanDetectionPanelProps) {
  const [sensitivity, setSensitivity] = useState<number>(85);
  const [audioAlerts, setAudioAlerts] = useState<boolean>(true);
  const [selectedTargetId, setSelectedTargetId] = useState<string>("TGT-01");
  const [beaconSentToast, setBeaconSentToast] = useState<string | null>(null);

  // Live Detected Human Targets state
  const [targets, setTargets] = useState<DetectedHumanTarget[]>([
    {
      id: "TGT-01",
      name: "Human Target #01 (Survivor)",
      confidence: 98.4,
      distanceMeters: 14.2,
      bearingDeg: 58,
      vitalTemp: 36.8,
      heartRateEst: 76,
      posture: "STANDING",
      classification: "SURVIVOR / CIV",
      riskLevel: "warning",
      lastDetectedAgo: "Just now",
    },
    {
      id: "TGT-02",
      name: "Human Target #02 (Search Team)",
      confidence: 94.1,
      distanceMeters: 38.6,
      bearingDeg: 210,
      vitalTemp: 37.1,
      heartRateEst: 88,
      posture: "WALKING",
      classification: "FRIENDLY SEARCHER",
      riskLevel: "safe",
      lastDetectedAgo: "4s ago",
    },
    {
      id: "TGT-03",
      name: "Human Target #03 (Perimeter)",
      confidence: 89.2,
      distanceMeters: 52.0,
      bearingDeg: 315,
      vitalTemp: 36.6,
      heartRateEst: 72,
      posture: "CROUCHED",
      classification: "UNIDENTIFIED",
      riskLevel: "sos",
      lastDetectedAgo: "12s ago",
    },
  ]);

  // Periodic simulated micro-movements
  useEffect(() => {
    const interval = setInterval(() => {
      setTargets((prev) =>
        prev.map((t) => ({
          ...t,
          distanceMeters: Number(Math.max(4, t.distanceMeters + (Math.random() * 0.6 - 0.3)).toFixed(1)),
          confidence: Number(Math.min(99.9, Math.max(80, t.confidence + (Math.random() * 0.8 - 0.4))).toFixed(1)),
          vitalTemp: Number((36.7 + (Math.random() * 0.4 - 0.2)).toFixed(1)),
        }))
      );
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleDispatchBeacon = (targetName: string) => {
    setBeaconSentToast(`Dispatched Optical/Audio Beacon to ${targetName}`);
    setTimeout(() => setBeaconSentToast(null), 3000);
  };

  const selectedTarget = targets.find((t) => t.id === selectedTargetId) || targets[0];

  return (
    <div className="w-full h-full bg-zinc-950 border border-zinc-800/80 rounded-xl overflow-hidden flex flex-col relative group select-none shadow-lg">
      {/* Top Header */}
      <div className="h-10 bg-zinc-900/90 border-b border-zinc-800 px-3 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-emerald-500/20 text-emerald-400">
            <UserCheck className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold font-mono tracking-wider text-zinc-100 uppercase">
              HUMAN DETECTION SENSOR
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300">
              {targets.length} CONFIRMED TARGETS
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Audio alerts toggle */}
          <button
            onClick={() => setAudioAlerts(!audioAlerts)}
            className={`p-1.5 rounded text-xs transition-colors ${
              audioAlerts
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "text-zinc-500 bg-zinc-800"
            }`}
            title={audioAlerts ? "Audio Siren Warnings Enabled" : "Audio Warnings Muted"}
          >
            {audioAlerts ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Maximize */}
          {onToggleMaximize && (
            <button
              onClick={onToggleMaximize}
              className="p-1.5 rounded text-zinc-400 hover:text-zinc-100 bg-zinc-800 transition-colors"
              title={isMaximized ? "Restore 4-Grid" : "Maximize Human Detection Feed"}
            >
              {isMaximized ? (
                <Minimize2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Main Content: Split Radar & Target Cards */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 flex flex-col gap-3 bg-zinc-950">
        {/* Sensor Fusion Status Banner */}
        <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono">
          <div className="bg-zinc-900/90 border border-zinc-800 p-1.5 rounded-lg">
            <div className="text-zinc-500 text-[9px]">AI MODEL</div>
            <div className="text-emerald-400 font-bold">YOLO-v9 EDGE</div>
          </div>
          <div className="bg-zinc-900/90 border border-zinc-800 p-1.5 rounded-lg">
            <div className="text-zinc-500 text-[9px]">THERMAL CONFIRM</div>
            <div className="text-amber-400 font-bold">LWIR 36.8°C MATCH</div>
          </div>
          <div className="bg-zinc-900/90 border border-zinc-800 p-1.5 rounded-lg">
            <div className="text-zinc-500 text-[9px]">RADAR DOPPLER</div>
            <div className="text-cyan-400 font-bold">MICROMOVE 1.2m/s</div>
          </div>
        </div>

        {/* Selected Target Deep Telemetry Card */}
        {selectedTarget && (
          <div className="bg-gradient-to-br from-emerald-950/40 via-zinc-900 to-zinc-900 border border-emerald-500/40 rounded-xl p-3 shadow-md flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-mono font-bold text-emerald-300">
                  {selectedTarget.name}
                </span>
              </div>
              <span
                className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${
                  selectedTarget.riskLevel === "sos"
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/50"
                    : selectedTarget.riskLevel === "warning"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                    : "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                }`}
              >
                {selectedTarget.classification}
              </span>
            </div>

            {/* Vital and Distance Stats Grid */}
            <div className="grid grid-cols-4 gap-2 text-[10px] font-mono mt-1">
              <div className="bg-black/60 p-2 rounded border border-zinc-800 flex flex-col">
                <span className="text-zinc-500 text-[8px]">PROXIMITY</span>
                <span className="text-cyan-300 font-bold text-xs">{selectedTarget.distanceMeters}m</span>
                <span className="text-zinc-500 text-[8px]">BEARING {selectedTarget.bearingDeg}°</span>
              </div>

              <div className="bg-black/60 p-2 rounded border border-zinc-800 flex flex-col">
                <span className="text-zinc-500 text-[8px]">CONFIDENCE</span>
                <span className="text-emerald-400 font-bold text-xs">{selectedTarget.confidence}%</span>
                <div className="w-full bg-zinc-800 h-1 rounded-full mt-1 overflow-hidden">
                  <div
                    className="bg-emerald-400 h-full rounded-full"
                    style={{ width: `${selectedTarget.confidence}%` }}
                  />
                </div>
              </div>

              <div className="bg-black/60 p-2 rounded border border-zinc-800 flex flex-col">
                <span className="text-zinc-500 text-[8px]">BODY TEMP</span>
                <span className="text-amber-300 font-bold text-xs">{selectedTarget.vitalTemp}°C</span>
                <span className="text-emerald-400 text-[8px]">NORMAL VITALS</span>
              </div>

              <div className="bg-black/60 p-2 rounded border border-zinc-800 flex flex-col">
                <span className="text-zinc-500 text-[8px]">POSTURE</span>
                <span className="text-white font-bold text-[10px] truncate">{selectedTarget.posture}</span>
                <span className="text-zinc-500 text-[8px]">~{selectedTarget.heartRateEst} BPM</span>
              </div>
            </div>

            {/* Action Buttons for this Target */}
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={() => handleDispatchBeacon(selectedTarget.name)}
                className="flex-1 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                <Target className="w-3 h-3" />
                <span>DISPATCH AUDIO BEACON</span>
              </button>
            </div>
          </div>
        )}

        {/* All Detected Targets List */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
            Detected Targets in Scan Radius ({targets.length})
          </span>

          {targets.map((tgt) => {
            const isSelected = tgt.id === selectedTargetId;
            return (
              <div
                key={tgt.id}
                onClick={() => setSelectedTargetId(tgt.id)}
                className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                  isSelected
                    ? "bg-zinc-900 border-emerald-500/60 ring-1 ring-emerald-500/30"
                    : "bg-zinc-900/60 border-zinc-800/80 hover:bg-zinc-800/60"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      tgt.riskLevel === "sos"
                        ? "bg-rose-400 animate-ping"
                        : tgt.riskLevel === "warning"
                        ? "bg-amber-400"
                        : "bg-emerald-400"
                    }`}
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-mono font-bold text-zinc-200">
                      {tgt.name}
                    </span>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500">
                      <span>{tgt.distanceMeters}m away</span>
                      <span>•</span>
                      <span>{tgt.posture}</span>
                      <span>•</span>
                      <span className="text-amber-400">{tgt.vitalTemp}°C</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right font-mono">
                    <span className="text-xs font-bold text-emerald-400">{tgt.confidence}%</span>
                    <div className="text-[8px] text-zinc-500">{tgt.lastDetectedAgo}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Toast */}
        {beaconSentToast && (
          <div className="bg-emerald-500 text-black font-bold text-xs px-3 py-1.5 rounded-lg text-center shadow-lg animate-bounce">
            🔊 {beaconSentToast}
          </div>
        )}
      </div>

      {/* Bottom Tool Strip */}
      <div className="h-9 bg-zinc-900/90 border-t border-zinc-800 px-3 flex items-center justify-between text-xs font-mono shrink-0">
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
          <span className="text-zinc-500">AI THRESHOLD:</span>
          {[75, 85, 95].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setSensitivity(lvl)}
              className={`px-1.5 py-0.5 rounded font-bold ${
                sensitivity === lvl
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {lvl}%
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 text-[10px] text-emerald-400">
          <Activity className="w-3 h-3 animate-pulse" />
          <span>FUSION ACTIVE</span>
        </div>
      </div>
    </div>
  );
}
