import React, { useState } from "react";
import { 
  Flame, Crosshair, Thermometer, Users, Zap, BatteryCharging, 
  RefreshCw, Layers, ShieldCheck, Activity, Terminal
} from "lucide-react";

export function LivePreviewSandbox({ 
  previewType, 
  customCode, 
  fileName 
}: { 
  previewType?: string; 
  customCode: string;
  fileName: string;
}) {
  const [thermalMode, setThermalMode] = useState<"IRONBOW" | "WHITE_HOT" | "RAINBOW">("IRONBOW");
  const [formation, setFormation] = useState<"DELTA" | "VEE" | "ECHELON" | "PERIMETER_RING">("DELTA");
  const [batteryCharge, setBatteryCharge] = useState(94);
  const [isSyncing, setIsSyncing] = useState(false);
  const [logMessages, setLogMessages] = useState<string[]>([
    "Sandbox instance mounted: VIBE_SANDBOX_OK",
    "Tailwind utility styles injected",
    `Target module: ${fileName}`,
  ]);

  const addLog = (msg: string) => {
    setLogMessages((prev) => [msg, ...prev.slice(0, 5)]);
  };

  // Render FLIR Thermal target tracker sandbox
  if (previewType === "ThermalTargetTracker" || customCode.includes("FLIR RADIOMETRIC TRACKER")) {
    return (
      <div className="bg-zinc-950 border border-amber-500/30 rounded-xl p-6 text-zinc-100 font-mono shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40">
              <Flame className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white tracking-wider">FLIR RADIOMETRIC TRACKER</h3>
              <p className="text-xs text-zinc-400">Uncooled VOx Microbolometer • 640x512 • 30Hz</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {(["IRONBOW", "WHITE_HOT", "RAINBOW"] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setThermalMode(m);
                  addLog(`Palette mode toggled to: ${m}`);
                }}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                  thermalMode === m
                    ? "bg-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                    : "bg-zinc-900 text-zinc-400 hover:text-white"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Heatmap Visual Canvas */}
        <div className={`relative aspect-video rounded-lg overflow-hidden border border-zinc-800 flex items-center justify-center transition-all ${
          thermalMode === "IRONBOW" ? "bg-gradient-to-br from-purple-950 via-zinc-950 to-amber-950/60" :
          thermalMode === "WHITE_HOT" ? "bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-800" :
          "bg-gradient-to-br from-blue-950 via-green-950 to-rose-950"
        }`}>
          {/* Noise pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:16px_16px] opacity-25" />

          {/* Hotspots */}
          <div className="absolute top-[32%] left-[44%] flex flex-col items-center">
            <div className="w-8 h-8 rounded-full border-2 border-amber-400/80 animate-ping absolute" />
            <div className="w-7 h-7 rounded-full bg-amber-500/40 border border-amber-400 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.8)]">
              <Crosshair className="w-4 h-4 text-amber-300" />
            </div>
            <span className="mt-1 px-2 py-0.5 bg-black/80 border border-amber-500/50 text-[10px] text-amber-300 rounded font-bold">
              T-01: 38.4°C (Human Signature)
            </span>
          </div>

          <div className="absolute top-[65%] left-[72%] flex flex-col items-center">
            <div className="w-6 h-6 rounded-full bg-rose-500/40 border border-rose-400 flex items-center justify-center shadow-[0_0_15px_rgba(244,63,94,0.8)]">
              <Crosshair className="w-3.5 h-3.5 text-rose-300" />
            </div>
            <span className="mt-1 px-2 py-0.5 bg-black/80 border border-rose-500/50 text-[10px] text-rose-300 rounded font-bold">
              T-02: 78.6°C (Engine Exhaust)
            </span>
          </div>

          {/* Crosshair Center */}
          <div className="absolute inset-x-12 top-1/2 h-[1px] bg-amber-500/30" />
          <div className="absolute inset-y-12 left-1/2 w-[1px] bg-amber-500/30" />
          <div className="absolute bottom-3 left-3 bg-black/80 px-3 py-1.5 rounded border border-zinc-800 text-xs flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-amber-400" />
            <span>FOCAL PEAK: <strong className="text-amber-300">41.8°C</strong></span>
          </div>
        </div>

        {/* Live Terminal */}
        <div className="p-3 bg-zinc-900/90 rounded-lg border border-zinc-800 text-[11px] space-y-1">
          <div className="text-zinc-500 flex items-center gap-1">
            <Terminal className="w-3.5 h-3.5 text-amber-400" />
            <span>SANDBOX RUNTIME LOGS:</span>
          </div>
          {logMessages.map((m, idx) => (
            <div key={idx} className="text-zinc-300 font-mono">
              &gt; {m}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Render Swarm Mesh formation sandbox
  if (previewType === "SwarmMeshOrchestrator" || customCode.includes("SWARM MESH FORMATION")) {
    return (
      <div className="bg-zinc-950 border border-violet-500/30 rounded-xl p-6 text-zinc-100 font-mono shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-violet-500/20 text-violet-400 border border-violet-500/40">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white tracking-wider">SWARM MESH FORMATION ORCHESTRATOR</h3>
              <p className="text-xs text-zinc-400">IEEE 802.11ah Sub-GHz Autonomous Inter-Drone Relay</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded bg-violet-950/80 border border-violet-500/40 text-xs text-violet-300 font-bold">
            99.4% MESH SYNC
          </span>
        </div>

        {/* Formation selection */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-zinc-400 font-bold">FORMATION GEOMETRY:</span>
          {(["DELTA", "VEE", "ECHELON", "PERIMETER_RING"] as const).map((fmt) => (
            <button
              key={fmt}
              onClick={() => {
                setFormation(fmt);
                addLog(`Swarm geometry vector updated: ${fmt}`);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                formation === fmt
                  ? "bg-violet-600 text-white shadow-[0_0_12px_rgba(139,92,246,0.6)]"
                  : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
              }`}
            >
              {fmt.replace("_", " ")}
            </button>
          ))}
        </div>

        {/* Dynamic Canvas Simulation */}
        <div className="relative aspect-video bg-zinc-900/90 rounded-lg overflow-hidden border border-zinc-800 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[radial-gradient(#8b5cf6_1px,transparent_1px)] [background-size:20px_20px] opacity-20" />
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full z-10">
            {[
              { id: "DRN-01 LEAD", role: "Apex Master", status: "LOCKED" },
              { id: "DRN-02 WING-L", role: "Left Flank", status: "SYNCED" },
              { id: "DRN-03 WING-R", role: "Right Flank", status: "SYNCED" },
              { id: "DRN-04 SCOUT", role: "High Apex Relay", status: "STANDBY" },
            ].map((node) => (
              <div key={node.id} className="p-3 bg-zinc-950/80 border border-violet-500/30 rounded-lg text-center">
                <div className="w-3 h-3 rounded-full bg-violet-400 mx-auto mb-1.5 animate-pulse" />
                <div className="text-xs font-bold text-white">{node.id}</div>
                <div className="text-[10px] text-zinc-500">{node.role}</div>
                <div className="mt-2 text-[9px] bg-violet-950 text-violet-300 font-bold py-0.5 rounded border border-violet-500/30">
                  {node.status}
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => {
            setIsSyncing(true);
            addLog("Transmitting broadcast vector across 4 nodes...");
            setTimeout(() => {
              setIsSyncing(false);
              addLog("Swarm vector synchrony confirmed: 0 packet loss.");
            }, 1200);
          }}
          disabled={isSyncing}
          className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(139,92,246,0.4)]"
        >
          <Zap className="w-4 h-4" />
          <span>{isSyncing ? "BROADCASTING MESH PACKETS..." : "EXECUTE SWARM VECTOR SYNC"}</span>
        </button>
      </div>
    );
  }

  // Render Battery Power Forecast sandbox
  if (previewType === "FleetPowerForecast" || customCode.includes("LIPO 6S DISCHARGE")) {
    return (
      <div className="bg-zinc-950 border border-emerald-500/30 rounded-xl p-6 text-zinc-100 font-mono shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <BatteryCharging className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white tracking-wider">LIPO 6S DISCHARGE & CYCLE HEALTH FORECAST</h3>
              <p className="text-xs text-zinc-400">Solid-State Smart BMS • 22.2V Nominal • 16000mAh</p>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-emerald-950 text-emerald-300 border border-emerald-500/40 rounded text-xs font-bold">
            EST. ENDURANCE: 34m 18s
          </span>
        </div>

        {/* 6 Cells */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[4.18, 4.19, 4.17, 4.18, 4.16, 4.19].map((v, i) => (
            <div key={i} className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-center">
              <span className="text-[10px] text-zinc-500 font-bold">CELL 0{i + 1}</span>
              <div className="text-base font-extrabold text-emerald-400 mt-1">{v}V</div>
              <span className="text-[9px] text-zinc-400 mt-0.5">31.8°C</span>
            </div>
          ))}
        </div>

        <div className="p-4 bg-zinc-900/70 border border-zinc-800 rounded-lg flex items-center justify-between">
          <div>
            <div className="text-xs text-zinc-400">Total Battery Capacity</div>
            <div className="text-2xl font-extrabold text-emerald-400">{batteryCharge}% Active</div>
          </div>
          <button
            onClick={() => {
              setBatteryCharge(100);
              addLog("Fast DC balanced charging initiated: +100% capacity restored.");
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>CALIBRATE BMS</span>
          </button>
        </div>
      </div>
    );
  }

  // Default Custom Tactical Sandbox
  return (
    <div className="bg-zinc-950 border border-cyan-500/30 rounded-xl p-6 text-zinc-100 font-mono shadow-2xl space-y-4">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white tracking-wider">LIVE COMPONENT PREVIEW</h3>
            <p className="text-xs text-zinc-400">{fileName} • Rendered in VibeCoding Sandbox</p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 text-xs font-bold">
          LIVE EXECUTION
        </span>
      </div>

      <div className="p-5 bg-zinc-900/60 border border-zinc-800 rounded-lg space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-400 font-bold">Module State Health</span>
          <span className="text-xs font-extrabold text-emerald-400">99.8% Online</span>
        </div>
        <div className="w-full bg-zinc-950 h-2.5 rounded-full overflow-hidden border border-zinc-800">
          <div className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 w-[94%]" />
        </div>
        <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-950/70 p-3 rounded border border-zinc-800">
          Component successfully mounted with props and active synthetic state. The generated code adheres strictly to TypeScript interfaces and DRS tactical UI styling.
        </p>
      </div>

      <div className="p-3 bg-zinc-900/90 rounded-lg border border-zinc-800 text-[11px] space-y-1">
        <div className="text-zinc-500 flex items-center gap-1">
          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
          <span>RUNTIME DIAGNOSTICS:</span>
        </div>
        {logMessages.map((m, idx) => (
          <div key={idx} className="text-zinc-300 font-mono">
            &gt; {m}
          </div>
        ))}
      </div>
    </div>
  );
}
