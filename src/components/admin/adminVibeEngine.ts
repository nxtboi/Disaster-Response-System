export interface GeneratedFile {
  id: string;
  name: string;
  path: string;
  language: "typescript" | "tsx" | "css" | "json";
  content: string;
  originalContent?: string;
  description: string;
  status: "new" | "modified" | "unchanged";
  category: "components" | "pages" | "data" | "types" | "styles";
}

export interface VibePromptResult {
  prompt: string;
  timestamp: string;
  targetFileName: string;
  targetPath: string;
  actionType: "CREATE_FILE" | "MODIFY_EXISTING" | "EXTEND_SYSTEM";
  summary: string;
  tags: string[];
  files: GeneratedFile[];
  diffPreview?: {
    additions: number;
    deletions: number;
    patch: string;
  };
  suggestedImports: string[];
  previewComponentType?: string;
}

export const INITIAL_PROJECT_FILES: GeneratedFile[] = [
  {
    id: "app-tsx",
    name: "App.tsx",
    path: "/src/App.tsx",
    language: "tsx",
    category: "pages",
    status: "unchanged",
    description: "Main application router and authentication controller",
    content: `import { useState } from "react";
import { DRSProvider } from "./store";
import { LoginPage } from "./components/LoginPage";
import { LandingPage } from "./components/LandingPage";
import { Dashboard } from "./components/Dashboard";
import { ExploreSystemPage } from "./components/ExploreSystemPage";
import { AdminPanel } from "./components/admin/AdminPanel";

export type AppPage = "landing" | "command_center" | "explore_system" | "admin_panel";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<"admin" | "operator">("operator");
  const [currentPage, setCurrentPage] = useState<AppPage>("landing");

  return (
    <DRSProvider>
      {/* Dynamic Tactical Application Container */}
    </DRSProvider>
  );
}`,
  },
  {
    id: "dashboard-tsx",
    name: "Dashboard.tsx",
    path: "/src/components/Dashboard.tsx",
    language: "tsx",
    category: "components",
    status: "unchanged",
    description: "Command Center tactical HUD layout with live radar and telemetry",
    content: `import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { MainContent } from "./MainContent";
import { RightPanel } from "./RightPanel";

export function Dashboard({ onExit }: { onExit?: () => void }) {
  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-950 overflow-hidden text-zinc-100">
      <Header onExit={onExit} />
      <div className="flex flex-1 min-h-0 relative overflow-hidden">
        <Sidebar onExit={onExit} />
        <MainContent />
        <RightPanel />
      </div>
    </div>
  );
}`,
  },
  {
    id: "explore-tsx",
    name: "ExploreSystemPage.tsx",
    path: "/src/components/ExploreSystemPage.tsx",
    language: "tsx",
    category: "pages",
    status: "unchanged",
    description: "Standalone collective UAV fleet database & multi-sensor registry",
    content: `import React, { useState } from "react";
import { useDRS } from "../store";
import { Drone } from "../types";

export function ExploreSystemPage() {
  const { drones } = useDRS();
  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <h1 className="text-2xl font-bold font-mono text-cyan-400">FLEET REGISTRY</h1>
      <p className="text-zinc-400 text-xs">UAV Aggregate Telemetry Database</p>
    </div>
  );
}`,
  },
  {
    id: "types-ts",
    name: "types.ts",
    path: "/src/types.ts",
    language: "typescript",
    category: "types",
    status: "unchanged",
    description: "Core data models for drones, telemetry, sensors and waypoints",
    content: `export type ConnectionStatus = "Online" | "Standby" | "Charging" | "Offline";

export interface DroneTelemetry {
  altitude: number;
  speed: number;
  heading: number;
  battery: number;
  satelliteCount: number;
  distanceFromOperator: number;
}

export interface Drone {
  id: string;
  name: string;
  status: ConnectionStatus;
  battery: number;
  flightMode: "Autonomous" | "Manual" | "Hover" | "Return to Home";
  coordinates: { lat: number; lng: number };
  telemetry: DroneTelemetry;
  cameraStatus: "Active" | "Standby" | "Offline";
  lidarStatus: "Active" | "Standby" | "Offline";
  thermalStatus: "Active" | "Standby" | "Offline";
  gpsStatus: "Connected" | "Weak" | "Disconnected";
  missionActive: boolean;
  alerts: string[];
}`,
  },
  {
    id: "data-ts",
    name: "data.ts",
    path: "/src/data.ts",
    language: "typescript",
    category: "data",
    status: "unchanged",
    description: "Preset telemetry feeds, waypoint missions and sensor specs",
    content: `import { Drone } from "./types";

export const INITIAL_DRONES: Drone[] = [
  {
    id: "DRN-01",
    name: "Alpha Vanguard",
    status: "Online",
    battery: 88,
    flightMode: "Autonomous",
    coordinates: { lat: 37.7749, lng: -122.4194 },
    telemetry: {
      altitude: 142,
      speed: 48.5,
      heading: 124,
      battery: 88,
      satelliteCount: 18,
      distanceFromOperator: 3.2,
    },
    cameraStatus: "Active",
    lidarStatus: "Active",
    thermalStatus: "Active",
    gpsStatus: "Connected",
    missionActive: true,
    alerts: [],
  },
];`,
  },
];

/**
 * Intelligent VibeCoding synthesis engine
 * Converts natural language developer/operator prompts into real TypeScript/React code,
 * file path metadata, and live component previews.
 */
export function generateVibeCode(userPrompt: string): VibePromptResult {
  const p = userPrompt.toLowerCase().trim();
  const timestamp = new Date().toLocaleTimeString();

  // 1. Thermal AI / Target Tracking Detection
  if (p.includes("thermal") || p.includes("heat") || p.includes("flir") || p.includes("infrared")) {
    const fileName = "ThermalTargetTracker.tsx";
    const path = `/src/components/monitoring/${fileName}`;
    const code = `import React, { useState, useEffect } from "react";
import { Flame, Crosshair, Thermometer, ShieldAlert, Scan, Activity, Maximize2 } from "lucide-react";

export function ThermalTargetTracker() {
  const [thermalMode, setThermalMode] = useState<"IRONBOW" | "WHITE_HOT" | "RAINBOW">("IRONBOW");
  const [focalTemp, setFocalTemp] = useState(41.8);
  const [detectedTargets, setDetectedTargets] = useState([
    { id: "T-01", temp: "38.2°C", type: "Human Signature", confidence: "94.2%", x: 42, y: 35 },
    { id: "T-02", temp: "78.6°C", type: "Engine Exhaust", confidence: "98.7%", x: 68, y: 58 },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setFocalTemp((prev) => +(prev + (Math.random() * 0.4 - 0.2)).toFixed(1));
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-zinc-950 border border-amber-500/30 rounded-xl p-5 text-zinc-100 font-mono shadow-2xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40">
            <Flame className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white tracking-wider">FLIR RADIOMETRIC TRACKER</h3>
            <p className="text-[10px] text-zinc-500">Uncooled VOx Microbolometer • 640x512</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {(["IRONBOW", "WHITE_HOT", "RAINBOW"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setThermalMode(m)}
              className={\`px-2 py-1 rounded text-[10px] font-bold transition-all \${
                thermalMode === m
                  ? "bg-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                  : "bg-zinc-900 text-zinc-400 hover:text-white"
              }\`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Visual Canvas Simulation */}
      <div className="relative aspect-video bg-gradient-to-br from-zinc-900 via-zinc-950 to-amber-950/40 rounded-lg overflow-hidden border border-zinc-800 flex items-center justify-center">
        {/* Synthetic Thermal Noise Grid */}
        <div className="absolute inset-0 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />

        {/* Hotspots */}
        {detectedTargets.map((target) => (
          <div
            key={target.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer"
            style={{ left: \`\${target.x}%\`, top: \`\${target.y}%\` }}
          >
            <div className="w-8 h-8 rounded-full border-2 border-amber-400/80 animate-ping absolute" />
            <div className="w-6 h-6 rounded-full bg-amber-500/30 border border-amber-400 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.8)]">
              <Crosshair className="w-3.5 h-3.5 text-amber-300" />
            </div>
            <span className="mt-1 px-1.5 py-0.5 bg-black/80 border border-amber-500/50 text-[9px] text-amber-300 rounded whitespace-nowrap">
              {target.id}: {target.temp}
            </span>
          </div>
        ))}

        {/* HUD Crosshairs */}
        <div className="absolute inset-x-8 top-1/2 h-[1px] bg-amber-500/20" />
        <div className="absolute inset-y-8 left-1/2 w-[1px] bg-amber-500/20" />
        <div className="absolute bottom-3 left-3 bg-black/80 px-2.5 py-1 rounded border border-zinc-800 text-[11px] flex items-center gap-2">
          <Thermometer className="w-3.5 h-3.5 text-amber-400" />
          <span>FOCAL PEAK: <strong className="text-amber-300">{focalTemp}°C</strong></span>
        </div>
      </div>

      {/* Target Registry List */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {detectedTargets.map((t) => (
          <div key={t.id} className="p-2 bg-zinc-900/80 rounded border border-zinc-800 flex justify-between items-center">
            <div>
              <div className="font-bold text-amber-400">{t.id} • {t.type}</div>
              <div className="text-[10px] text-zinc-500">Confidence {t.confidence}</div>
            </div>
            <span className="text-xs font-bold text-white bg-zinc-950 px-2 py-1 rounded border border-zinc-800">
              {t.temp}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}`;

    return {
      prompt: userPrompt,
      timestamp,
      targetFileName: fileName,
      targetPath: path,
      actionType: "CREATE_FILE",
      summary: "Created high-fidelity FLIR Radiometric Target Tracker with ironbow heat signature mapping & automated hotspot detection.",
      tags: ["radiometric", "flir-thermal", "hotspot-ai", "target-tracking"],
      suggestedImports: ["import { ThermalTargetTracker } from './components/monitoring/ThermalTargetTracker';"],
      files: [
        {
          id: "thermal-tracker",
          name: fileName,
          path,
          language: "tsx",
          category: "components",
          status: "new",
          description: "Radiometric FLIR thermal target detection panel",
          content: code,
        },
      ],
      previewComponentType: "ThermalTargetTracker",
    };
  }

  // 2. Swarm Formation & Multi-UAV Orchestrator
  if (p.includes("swarm") || p.includes("formation") || p.includes("mesh") || p.includes("cooperative")) {
    const fileName = "SwarmMeshOrchestrator.tsx";
    const path = `/src/components/${fileName}`;
    const code = `import React, { useState } from "react";
import { Users, Radio, Navigation, Shield, Play, RotateCcw, Zap, Layers } from "lucide-react";

export function SwarmMeshOrchestrator() {
  const [formation, setFormation] = useState<"VEE" | "ECHELON" | "DELTA" | "PERIMETER_RING">("DELTA");
  const [meshSyncRate, setMeshSyncRate] = useState(99.4);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const swarmNodes = [
    { callsign: "DRN-01 LEAD", role: "Mesh Master", signal: "-42 dBm", ping: "8ms", state: "LOCKED" },
    { callsign: "DRN-02 WING-L", role: "Vector Follower", signal: "-48 dBm", ping: "12ms", state: "SYNCED" },
    { callsign: "DRN-03 WING-R", role: "Vector Follower", signal: "-45 dBm", ping: "11ms", state: "SYNCED" },
    { callsign: "DRN-04 SCOUT", role: "High Apex Relay", signal: "-51 dBm", ping: "15ms", state: "STANDBY" },
  ];

  const handleBroadcast = () => {
    setIsBroadcasting(true);
    setTimeout(() => setIsBroadcasting(false), 2000);
  };

  return (
    <div className="bg-zinc-950 border border-violet-500/30 rounded-xl p-5 text-zinc-100 font-mono shadow-2xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-violet-500/20 text-violet-400 border border-violet-500/40">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white tracking-wider">SWARM MESH FORMATION ORCHESTRATOR</h3>
            <p className="text-[10px] text-zinc-500">IEEE 802.11ah Sub-GHz Autonomous Inter-Drone Relay</p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded bg-violet-950/80 border border-violet-500/40 text-[10px] text-violet-300 font-bold">
          {meshSyncRate}% MESH INTEGRITY
        </span>
      </div>

      {/* Formation Selectors */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-zinc-400">FORMATION:</span>
        {(["DELTA", "VEE", "ECHELON", "PERIMETER_RING"] as const).map((fmt) => (
          <button
            key={fmt}
            onClick={() => setFormation(fmt)}
            className={\`px-3 py-1.5 rounded-lg text-xs font-bold transition-all \${
              formation === fmt
                ? "bg-violet-600 text-white shadow-[0_0_12px_rgba(139,92,246,0.6)]"
                : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
            }\`}
          >
            {fmt.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Swarm Nodes List */}
      <div className="space-y-2">
        {swarmNodes.map((node) => (
          <div key={node.callsign} className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-ping" />
              <div>
                <div className="font-bold text-xs text-white">{node.callsign}</div>
                <div className="text-[10px] text-zinc-500">{node.role}</div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-zinc-400">{node.signal}</span>
              <span className="text-violet-400 font-bold">{node.ping}</span>
              <span className="px-2 py-0.5 rounded bg-violet-950 border border-violet-500/30 text-[10px] text-violet-300 font-bold">
                {node.state}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Action Dispatch */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleBroadcast}
          disabled={isBroadcasting}
          className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(139,92,246,0.4)]"
        >
          <Zap className="w-4 h-4" />
          <span>{isBroadcasting ? "TRANSMITTING MESH SYNC..." : "BROADCAST SWARM VECTOR"}</span>
        </button>
      </div>
    </div>
  );
}`;

    return {
      prompt: userPrompt,
      timestamp,
      targetFileName: fileName,
      targetPath: path,
      actionType: "CREATE_FILE",
      summary: "Generated Swarm Mesh Orchestrator with multi-node dynamic vector formation routing (Delta, Vee, Echelon, Perimeter Ring).",
      tags: ["swarm-ai", "mesh-network", "formation-flight", "mavlink-swarm"],
      suggestedImports: ["import { SwarmMeshOrchestrator } from './components/SwarmMeshOrchestrator';"],
      files: [
        {
          id: "swarm-orchestrator",
          name: fileName,
          path,
          language: "tsx",
          category: "components",
          status: "new",
          description: "Multi-UAV cooperative swarm mesh orchestrator component",
          content: code,
        },
      ],
      previewComponentType: "SwarmMeshOrchestrator",
    };
  }

  // 3. Battery Degradation & Power Forecast Widget
  if (p.includes("battery") || p.includes("power") || p.includes("degradation") || p.includes("charging") || p.includes("energy")) {
    const fileName = "FleetPowerForecast.tsx";
    const path = `/src/components/${fileName}`;
    const code = `import React, { useState } from "react";
import { BatteryCharging, Zap, Gauge, AlertTriangle, ShieldCheck, RefreshCw, Cpu } from "lucide-react";

export function FleetPowerForecast() {
  const [selectedCell, setSelectedCell] = useState<number | null>(null);

  const cells = [
    { cell: "C1", voltage: 4.18, temp: "31.2°C", health: "98%" },
    { cell: "C2", voltage: 4.19, temp: "31.4°C", health: "97%" },
    { cell: "C3", voltage: 4.17, temp: "32.0°C", health: "98%" },
    { cell: "C4", voltage: 4.18, temp: "31.8°C", health: "99%" },
    { cell: "C5", voltage: 4.16, temp: "32.5°C", health: "96%" },
    { cell: "C6", voltage: 4.19, temp: "31.1°C", health: "98%" },
  ];

  return (
    <div className="bg-zinc-950 border border-emerald-500/30 rounded-xl p-5 text-zinc-100 font-mono shadow-2xl space-y-4">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
            <BatteryCharging className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white tracking-wider">LIPO 6S DISCHARGE & CYCLE HEALTH FORECAST</h3>
            <p className="text-[10px] text-zinc-500">Solid-State Smart BMS • 22.2V Nominal • 16000mAh</p>
          </div>
        </div>
        <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-500/40 rounded text-[10px] font-bold">
          EST. ENDURANCE: 34m 18s
        </span>
      </div>

      {/* 6S Cell Telemetry Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {cells.map((c, idx) => (
          <div
            key={c.cell}
            onClick={() => setSelectedCell(idx)}
            className="p-2.5 bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 rounded-lg cursor-pointer transition-all flex flex-col items-center text-center"
          >
            <span className="text-[10px] font-bold text-zinc-400">{c.cell}</span>
            <span className="text-base font-extrabold text-emerald-400 mt-1">{c.voltage}V</span>
            <span className="text-[9px] text-zinc-500 mt-0.5">{c.temp}</span>
            <span className="text-[9px] font-bold text-emerald-300 bg-emerald-950/60 px-1.5 py-0.2 rounded mt-1">
              {c.health}
            </span>
          </div>
        ))}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="p-3 bg-zinc-900/60 rounded-lg border border-zinc-800">
          <span className="text-[10px] text-zinc-500 uppercase">Draw Current</span>
          <div className="text-lg font-extrabold text-white mt-0.5">24.6 A</div>
          <span className="text-[10px] text-zinc-400">@ 65% Throttle</span>
        </div>
        <div className="p-3 bg-zinc-900/60 rounded-lg border border-zinc-800">
          <span className="text-[10px] text-zinc-500 uppercase">Internal Resistance</span>
          <div className="text-lg font-extrabold text-emerald-400 mt-0.5">1.8 mΩ</div>
          <span className="text-[10px] text-emerald-400">Balanced State</span>
        </div>
        <div className="p-3 bg-zinc-900/60 rounded-lg border border-zinc-800">
          <span className="text-[10px] text-zinc-500 uppercase">Cycle Count</span>
          <div className="text-lg font-extrabold text-white mt-0.5">84 / 500</div>
          <span className="text-[10px] text-zinc-400">83.2% Lifetime Left</span>
        </div>
      </div>
    </div>
  );
}`;

    return {
      prompt: userPrompt,
      timestamp,
      targetFileName: fileName,
      targetPath: path,
      actionType: "CREATE_FILE",
      summary: "Generated 6S Solid-State Smart BMS battery telemetry monitor with per-cell voltages and discharge endurance forecast.",
      tags: ["bms-telemetry", "lipo-6s", "power-budget", "battery-degradation"],
      suggestedImports: ["import { FleetPowerForecast } from './components/FleetPowerForecast';"],
      files: [
        {
          id: "fleet-power-forecast",
          name: fileName,
          path,
          language: "tsx",
          category: "components",
          status: "new",
          description: "Smart battery cell degradation and flight endurance forecast module",
          content: code,
        },
      ],
      previewComponentType: "FleetPowerForecast",
    };
  }

  // 4. Default / Custom Vibe Component Generation
  const compName = p
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("") || "CustomTacticalWidget";

  const fileName = `${compName}.tsx`;
  const path = `/src/components/${fileName}`;
  const code = `import React, { useState } from "react";
import { Crosshair, Activity, Radio, Cpu, ShieldCheck, Zap } from "lucide-react";

export function ${compName}() {
  const [isActive, setIsActive] = useState(true);
  const [metricValue, setMetricValue] = useState(98.4);

  return (
    <div className="bg-zinc-950 border border-cyan-500/30 rounded-xl p-5 text-zinc-100 font-mono shadow-2xl space-y-4">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
            <Crosshair className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white tracking-wider uppercase">${userPrompt.slice(0, 36)}</h3>
            <p className="text-[10px] text-zinc-500">Autonomous VibeCoding Synthesized Module</p>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold">
          LIVE ENGINE
        </span>
      </div>

      <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-lg space-y-3">
        <div className="flex justify-between items-center text-xs">
          <span className="text-zinc-400">Processing Stream</span>
          <span className="font-bold text-emerald-400">{metricValue}% Synced</span>
        </div>
        <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-800">
          <div className="h-full bg-cyan-400 rounded-full transition-all duration-500" style={{ width: \`\${metricValue}%\` }} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          onClick={() => setMetricValue((prev) => +(Math.min(100, prev + 1.2)).toFixed(1))}
          className="flex-1 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>EXECUTE RE-SYNC</span>
        </button>
      </div>
    </div>
  );
}`;

  return {
    prompt: userPrompt,
    timestamp,
    targetFileName: fileName,
    targetPath: path,
    actionType: "CREATE_FILE",
    summary: `Synthesized custom tactical component [${compName}] tailored to prompt specifications.`,
    tags: ["vibecoded", "custom-module", "react-tsx", "tactical-hud"],
    suggestedImports: [`import { ${compName} } from './components/${compName}';`],
    files: [
      {
        id: fileName.toLowerCase().replace(/[^a-z0-9]/g, "-"),
        name: fileName,
        path,
        language: "tsx",
        category: "components",
        status: "new",
        description: `Vibe-generated module for: "${userPrompt}"`,
        content: code,
      },
    ],
    previewComponentType: compName,
  };
}
