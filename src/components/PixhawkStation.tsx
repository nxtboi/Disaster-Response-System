import React, { useState } from "react";
import {
  Cpu,
  Compass,
  Navigation,
  Activity,
  Zap,
  Terminal,
  Radio,
  Gauge,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Link as LinkIcon,
  Unlink,
  Maximize2,
  RefreshCw,
  Sliders,
  Send,
  Trash2,
  ShieldAlert,
  ArrowUpRight,
  ShieldCheck,
  BatteryCharging,
  Locate,
  Share2,
  Satellite,
  Laptop,
  PlaneTakeoff,
  MapPin,
} from "lucide-react";
import { usePixhawk } from "../lib/PixhawkContext";
import { useDRS } from "../store";
import { cn } from "../lib/utils";

const PRESET_BAUDS = [
  { rate: 115200, label: "115,200 BAUD (Pixhawk MicroUSB / TELEM1)" },
  { rate: 57600, label: "57,600 BAUD (SiK / 433/915 MHz Telemetry Radio)" },
  { rate: 921600, label: "921,600 BAUD (High-Speed FTDI / Companion)" },
  { rate: 460800, label: "460,800 BAUD (High Baud)" },
  { rate: 230400, label: "230,400 BAUD" },
  { rate: 38400, label: "38,400 BAUD" },
  { rate: 19200, label: "19,200 BAUD" },
  { rate: 9600, label: "9,600 BAUD (Standard GPS / NMEA)" },
];

export function PixhawkStation() {
  const {
    pixhawk,
    connectSerial,
    disconnectSerial,
    startSimulation,
    stopSimulation,
    toggleSimulation,
    sendCommand,
    clearLogs,
    selectedBaud,
    setSelectedBaud,
    syncSystemGpsToPixhawk,
  } = usePixhawk();

  const {
    selectedDrone,
    drones,
    setSelectedDroneId,
    setActiveView,
    gpsSourceMode,
    setGpsSourceMode,
    setCenterMapTarget,
    deployFleetToLocation,
    userLocation,
  } = useDRS();

  const [activeTab, setActiveTab] = useState<"cockpit" | "gps_compass" | "serial_inspector" | "commands">("cockpit");
  const [filterMsg, setFilterMsg] = useState<string>("ALL");
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [customBaudInput, setCustomBaudInput] = useState<string>("");

  const { serial, gps, compass, telemetry, statusLogs, recentPackets } = pixhawk;

  const handleConnect = async () => {
    setIsConnecting(true);
    setConnectError(null);
    try {
      const baud = customBaudInput && !isNaN(Number(customBaudInput)) ? Number(customBaudInput) : selectedBaud;
      const res = await connectSerial(baud);
      if (!res.success && res.error) {
        setConnectError(res.error);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const filteredPackets = filterMsg === "ALL"
    ? recentPackets
    : recentPackets.filter((p) => p.name === filterMsg);

  // Compass cardinal string helper
  const getHeadingCardinal = (deg: number) => {
    const d = ((deg % 360) + 360) % 360;
    if (d >= 337.5 || d < 22.5) return "N";
    if (d >= 22.5 && d < 67.5) return "NE";
    if (d >= 67.5 && d < 112.5) return "E";
    if (d >= 112.5 && d < 157.5) return "SE";
    if (d >= 157.5 && d < 202.5) return "S";
    if (d >= 202.5 && d < 247.5) return "SW";
    if (d >= 247.5 && d < 292.5) return "W";
    return "NW";
  };

  return (
    <div className="w-full h-full bg-zinc-950 p-4 lg:p-6 overflow-y-auto custom-scrollbar flex flex-col gap-5 text-zinc-100">
      {/* Top Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-wider uppercase font-mono">
                Pixhawk Autopilot & Serial Telemetry
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                MAVLink v1 / v2
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Direct Web Serial API • Hardware GPS • 3-Axis Magnetometer Compass • Primary Flight Display (PFD)
            </p>
          </div>
        </div>

        {/* Global Connection Status Pill */}
        <div className="flex items-center gap-3">
          {serial.connected ? (
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-xs font-bold",
              serial.isSimulated
                ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
            )}>
              <span className={cn(
                "w-2 h-2 rounded-full",
                serial.isSimulated ? "bg-amber-400 animate-pulse" : "bg-emerald-400 animate-ping"
              )} />
              <span>
                {serial.isSimulated ? "PIXHAWK SITL SIMULATOR ACTIVE" : "PIXHAWK HARDWARE CONNECTED"}
              </span>
              <span className="text-[10px] text-zinc-400 font-normal">
                ({serial.baudRate.toLocaleString()} BAUD • {telemetry.packetRateHz} Hz)
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 font-mono text-xs">
              <span className="w-2 h-2 rounded-full bg-zinc-600" />
              <span>HARDWARE STANDBY</span>
            </div>
          )}

          {/* Quick Map View Button */}
          <button
            onClick={() => setActiveView("Dashboard")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 hover:text-white rounded-lg text-xs font-mono transition-colors"
          >
            <Navigation className="w-3.5 h-3.5 text-cyan-400" />
            <span>View on Map</span>
          </button>
        </div>
      </div>

      {/* Connection & Port Control Banner */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-mono uppercase text-zinc-400 flex items-center gap-1.5 font-bold">
              <Gauge className="w-4 h-4 text-cyan-400" />
              Baud Rate:
            </label>
            <select
              value={selectedBaud}
              disabled={serial.connected}
              onChange={(e) => setSelectedBaud(Number(e.target.value))}
              className="bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
            >
              {PRESET_BAUDS.map((b) => (
                <option key={b.rate} value={b.rate}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-500">
            <span>Target:</span>
            <select
              value={selectedDrone?.id || drones[0]?.id || "DRN-01"}
              onChange={(e) => setSelectedDroneId(e.target.value)}
              className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs font-mono text-zinc-200"
            >
              {drones.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.id})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {!serial.connected ? (
            <>
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/50 hover:border-cyan-400 text-cyan-300 hover:text-cyan-100 rounded-lg text-xs font-mono font-bold tracking-wider transition-all shadow-[0_0_12px_rgba(6,182,212,0.15)] disabled:opacity-50"
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>{isConnecting ? "CONNECTING..." : "CONNECT PIXHAWK USB / RADIO"}</span>
              </button>

              <button
                onClick={startSimulation}
                className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-lg text-xs font-mono font-bold transition-all"
                title="Test full Pixhawk flight telemetry, compass & GPS without physical hardware"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>RUN SIMULATION TEST</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={disconnectSerial}
                className="flex items-center gap-2 px-4 py-2 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 rounded-lg text-xs font-mono font-bold transition-all"
              >
                <Unlink className="w-3.5 h-3.5" />
                <span>DISCONNECT SERIAL</span>
              </button>

              {serial.isSimulated && (
                <button
                  onClick={stopSimulation}
                  className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-mono transition-colors"
                >
                  <span>Stop Simulation</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {connectError && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-center gap-2.5 text-rose-300 text-xs font-mono">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{connectError}</span>
        </div>
      )}

      {/* Nav Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab("cockpit")}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all",
            activeTab === "cockpit"
              ? "bg-cyan-500/15 border border-cyan-500/40 text-cyan-300"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
          )}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Cockpit & Horizon PFD</span>
        </button>

        <button
          onClick={() => setActiveTab("gps_compass")}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all",
            activeTab === "gps_compass"
              ? "bg-cyan-500/15 border border-cyan-500/40 text-cyan-300"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
          )}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>GPS & Compass Magnetometer</span>
        </button>

        <button
          onClick={() => setActiveTab("serial_inspector")}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all",
            activeTab === "serial_inspector"
              ? "bg-cyan-500/15 border border-cyan-500/40 text-cyan-300"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
          )}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Serial MAVLink Terminal ({serial.rxPackets})</span>
        </button>

        <button
          onClick={() => setActiveTab("commands")}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all",
            activeTab === "commands"
              ? "bg-cyan-500/15 border border-cyan-500/40 text-cyan-300"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
          )}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Autopilot Modes & Commands</span>
        </button>
      </div>

      {/* TAB 1: COCKPIT & HORIZON PFD */}
      {activeTab === "cockpit" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Artificial Horizon / Attitude Indicator Instrument (Left, 6 cols) */}
          <div className="lg:col-span-6 bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="text-xs font-mono font-bold tracking-wider uppercase text-zinc-300 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                Attitude Gyro & Artificial Horizon (PFD)
              </span>
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="text-zinc-400">ROLL: <strong className="text-cyan-300">{compass.rollDeg > 0 ? `+${compass.rollDeg}` : compass.rollDeg}°</strong></span>
                <span className="text-zinc-400">PITCH: <strong className="text-cyan-300">{compass.pitchDeg > 0 ? `+${compass.pitchDeg}` : compass.pitchDeg}°</strong></span>
              </div>
            </div>

            {/* Artificial Horizon Canvas / Instrument Visualizer */}
            <div className="relative w-full h-64 rounded-xl overflow-hidden border border-zinc-700 bg-black flex items-center justify-center shadow-inner">
              {/* Pitch & Roll Rotating Plane */}
              <div
                className="absolute w-[200%] h-[200%] transition-transform duration-100 ease-linear pointer-events-none"
                style={{
                  transform: `rotate(${-compass.rollDeg}deg) translateY(${compass.pitchDeg * 2.4}px)`,
                }}
              >
                {/* Sky (Top Half) */}
                <div className="w-full h-1/2 bg-gradient-to-t from-sky-600 to-sky-800 border-b-2 border-white/90 relative flex items-end justify-center">
                  {/* Pitch ladder sky lines */}
                  <div className="w-full h-full flex flex-col justify-end items-center gap-6 pb-2 text-[10px] font-mono text-white/80 font-bold">
                    <div className="flex items-center gap-2"><div className="w-12 h-0.5 bg-white/70"></div><span>+20°</span><div className="w-12 h-0.5 bg-white/70"></div></div>
                    <div className="flex items-center gap-2"><div className="w-16 h-0.5 bg-white/80"></div><span>+10°</span><div className="w-16 h-0.5 bg-white/80"></div></div>
                  </div>
                </div>
                {/* Ground (Bottom Half) */}
                <div className="w-full h-1/2 bg-gradient-to-b from-amber-800 to-amber-950 relative flex items-start justify-center">
                  {/* Pitch ladder ground lines */}
                  <div className="w-full h-full flex flex-col justify-start items-center gap-6 pt-2 text-[10px] font-mono text-amber-200/80 font-bold">
                    <div className="flex items-center gap-2"><div className="w-16 h-0.5 bg-amber-400/80"></div><span>-10°</span><div className="w-16 h-0.5 bg-amber-400/80"></div></div>
                    <div className="flex items-center gap-2"><div className="w-12 h-0.5 bg-amber-400/70"></div><span>-20°</span><div className="w-12 h-0.5 bg-amber-400/70"></div></div>
                  </div>
                </div>
              </div>

              {/* Fixed Waterline Aircraft Reference Symbol (Yellow Crosshair) */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative flex items-center justify-center">
                  {/* Center Dot */}
                  <div className="w-3 h-3 rounded-full border-2 border-amber-400 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                  {/* Left Wing */}
                  <div className="absolute right-3 w-16 h-1 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)] flex items-end">
                    <div className="w-1 h-3 bg-amber-400"></div>
                  </div>
                  {/* Right Wing */}
                  <div className="absolute left-3 w-16 h-1 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)] flex items-end justify-end">
                    <div className="w-1 h-3 bg-amber-400"></div>
                  </div>
                </div>
              </div>

              {/* Top Banking Scale Arc */}
              <div className="absolute top-2 inset-x-0 flex justify-center text-[9px] font-mono text-white/90 font-bold drop-shadow">
                <span>ROLL ANGLE: {compass.rollDeg > 0 ? `+${compass.rollDeg}` : compass.rollDeg}°</span>
              </div>

              {/* Speed Tape on Left */}
              <div className="absolute left-2 top-4 bottom-4 w-14 bg-black/75 border border-zinc-700/80 rounded flex flex-col justify-between items-center py-2 font-mono text-[10px] text-zinc-300">
                <span className="text-[8px] text-zinc-500 uppercase">SPD</span>
                <span className="text-emerald-400 font-bold text-xs">{telemetry.groundspeedKmh}</span>
                <span className="text-[8px] text-zinc-500">km/h</span>
              </div>

              {/* Altitude Tape on Right */}
              <div className="absolute right-2 top-4 bottom-4 w-14 bg-black/75 border border-zinc-700/80 rounded flex flex-col justify-between items-center py-2 font-mono text-[10px] text-zinc-300">
                <span className="text-[8px] text-zinc-500 uppercase">ALT</span>
                <span className="text-cyan-400 font-bold text-xs">{gps.altAGL}</span>
                <span className="text-[8px] text-zinc-500">m AGL</span>
              </div>
            </div>

            {/* Flight Mode & Armed Bar */}
            <div className="grid grid-cols-3 gap-2 font-mono text-xs pt-1">
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 flex flex-col">
                <span className="text-[9px] text-zinc-500 uppercase">Flight Mode</span>
                <span className="text-cyan-400 font-bold text-sm tracking-wide">{telemetry.flightMode}</span>
              </div>
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 flex flex-col">
                <span className="text-[9px] text-zinc-500 uppercase">Arm Status</span>
                <span className={cn("font-bold text-sm tracking-wide", telemetry.isArmed ? "text-emerald-400" : "text-amber-400")}>
                  {telemetry.isArmed ? "ARMED (LIVE)" : "DISARMED"}
                </span>
              </div>
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 flex flex-col">
                <span className="text-[9px] text-zinc-500 uppercase">Autopilot</span>
                <span className="text-zinc-200 font-bold text-xs truncate" title={telemetry.autopilot}>{telemetry.autopilot.split(" ")[0]}</span>
              </div>
            </div>
          </div>

          {/* Compass Rose & Heading Ribbon (Right, 6 cols) */}
          <div className="lg:col-span-6 bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="text-xs font-mono font-bold tracking-wider uppercase text-zinc-300 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-cyan-400" />
                360° Compass & Heading Tape
              </span>
              <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/40">
                {Math.round(compass.headingDeg)}° {getHeadingCardinal(compass.headingDeg)}
              </span>
            </div>

            {/* Compass Ribbon (Horizontal Tape) */}
            <div className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 flex flex-col items-center gap-1 overflow-hidden relative">
              <div className="w-full h-8 relative flex items-center justify-center font-mono text-xs">
                {/* Center Indicator Triangle */}
                <div className="absolute top-0 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-cyan-400 z-10" />

                {/* Sliding tape */}
                <div
                  className="flex items-center gap-6 font-bold text-zinc-400 transition-transform duration-100 ease-linear whitespace-nowrap"
                  style={{ transform: `translateX(${-((compass.headingDeg % 360) * 3)}px)` }}
                >
                  {/* Double compass loop so it scrolls seamlessly */}
                  {[-1, 0, 1].flatMap((loop) => [
                    { deg: 0, label: "N", color: "text-rose-400" },
                    { deg: 30, label: "030" },
                    { deg: 60, label: "060" },
                    { deg: 90, label: "E", color: "text-cyan-400" },
                    { deg: 120, label: "120" },
                    { deg: 150, label: "150" },
                    { deg: 180, label: "S", color: "text-amber-400" },
                    { deg: 210, label: "210" },
                    { deg: 240, label: "240" },
                    { deg: 270, label: "W", color: "text-cyan-400" },
                    { deg: 300, label: "300" },
                    { deg: 330, label: "330" },
                  ]).map((item, idx) => (
                    <div key={idx} className={cn("flex flex-col items-center", item.color || "text-zinc-400")}>
                      <span className="text-[10px]">{item.label}</span>
                      <div className="w-0.5 h-2 bg-zinc-600 mt-0.5"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Compass Rose Dial Visualizer */}
            <div className="relative w-full h-44 rounded-xl border border-zinc-800 bg-zinc-950/80 flex items-center justify-center">
              {/* Outer Dial Circle with tick marks */}
              <div className="relative w-36 h-36 rounded-full border-2 border-zinc-700/80 flex items-center justify-center">
                {/* Cardinal Markers */}
                <span className="absolute top-1 text-[11px] font-mono font-bold text-rose-400">N</span>
                <span className="absolute right-2 text-[11px] font-mono font-bold text-cyan-400">E</span>
                <span className="absolute bottom-1 text-[11px] font-mono font-bold text-amber-400">S</span>
                <span className="absolute left-2 text-[11px] font-mono font-bold text-cyan-400">W</span>

                {/* Rotating Needle pointing towards heading */}
                <div
                  className="w-full h-full flex items-center justify-center transition-transform duration-100 ease-linear pointer-events-none"
                  style={{ transform: `rotate(${compass.headingDeg}deg)` }}
                >
                  <div className="w-2.5 h-28 relative flex flex-col items-center justify-between">
                    {/* North pointer (Red) */}
                    <div className="w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-b-[24px] border-b-rose-500 filter drop-shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
                    <div className="w-2 h-2 rounded-full bg-white z-10" />
                    {/* South pointer (White/Silver) */}
                    <div className="w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-t-[24px] border-t-zinc-400" />
                  </div>
                </div>
              </div>

              {/* Digital readout badge */}
              <div className="absolute bottom-2 font-mono text-[11px] text-zinc-400 flex items-center gap-3 bg-zinc-900/90 px-3 py-1 rounded-full border border-zinc-800">
                <span>Mag Strength: <strong className="text-zinc-200">{compass.magMagnitude} mG</strong></span>
                <span>•</span>
                <span className="text-emerald-400 font-bold">EKF3 YAW ALIGNED</span>
              </div>
            </div>

            {/* 3-Axis Magnetometer Live Sensor Array */}
            <div className="grid grid-cols-3 gap-2 font-mono text-xs">
              <div className="bg-zinc-950 border border-zinc-800/80 rounded-lg p-2 text-center">
                <span className="text-[9px] text-zinc-500 uppercase block">Mag X</span>
                <span className="text-cyan-400 font-bold text-xs">{compass.xMag} mG</span>
              </div>
              <div className="bg-zinc-950 border border-zinc-800/80 rounded-lg p-2 text-center">
                <span className="text-[9px] text-zinc-500 uppercase block">Mag Y</span>
                <span className="text-cyan-400 font-bold text-xs">{compass.yMag} mG</span>
              </div>
              <div className="bg-zinc-950 border border-zinc-800/80 rounded-lg p-2 text-center">
                <span className="text-[9px] text-zinc-500 uppercase block">Mag Z</span>
                <span className="text-cyan-400 font-bold text-xs">{compass.zMag} mG</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GPS & COMPASS MAGNETOMETER */}
      {activeTab === "gps_compass" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* GPS Coordinates & Fix Card */}
          <div className="lg:col-span-7 bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Locate className="w-5 h-5 text-cyan-400" />
                <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-zinc-100">
                  Global Positioning System (GPS_RAW_INT & GLOBAL_POSITION_INT)
                </h2>
              </div>
              <span className={cn(
                "px-2.5 py-0.5 rounded text-xs font-mono font-bold border",
                gps.fixTypeCode >= 3
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                  : "bg-amber-500/15 border-amber-500/40 text-amber-400"
              )}>
                {gps.fixType} ({gps.satCount} SATELLITES)
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono">
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                <span className="text-[10px] text-zinc-500 uppercase block">Latitude</span>
                <span className="text-cyan-300 font-bold text-sm">{gps.lat.toFixed(6)}°</span>
              </div>
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                <span className="text-[10px] text-zinc-500 uppercase block">Longitude</span>
                <span className="text-cyan-300 font-bold text-sm">{gps.lng.toFixed(6)}°</span>
              </div>
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                <span className="text-[10px] text-zinc-500 uppercase block">Altitude (AGL)</span>
                <span className="text-zinc-100 font-bold text-sm">{gps.altAGL} m</span>
              </div>
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                <span className="text-[10px] text-zinc-500 uppercase block">Altitude (MSL)</span>
                <span className="text-zinc-100 font-bold text-sm">{gps.altMSL} m</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 font-mono text-xs">
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                <span className="text-[10px] text-zinc-500 uppercase block">Horizontal DOP (HDOP)</span>
                <span className="text-emerald-400 font-bold text-sm">{gps.hdop}</span>
                <span className="text-[9px] text-zinc-500 block mt-0.5">{gps.hdop < 1.0 ? "Ideal Precision" : "Acceptable"}</span>
              </div>
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                <span className="text-[10px] text-zinc-500 uppercase block">Vertical DOP (VDOP)</span>
                <span className="text-cyan-400 font-bold text-sm">{gps.vdop}</span>
                <span className="text-[9px] text-zinc-500 block mt-0.5">Vertical accuracy</span>
              </div>
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                <span className="text-[10px] text-zinc-500 uppercase block">Ground Velocity</span>
                <span className="text-zinc-100 font-bold text-sm">{gps.groundspeedKmh} km/h</span>
                <span className="text-[9px] text-zinc-500 block mt-0.5">{(gps.groundspeedKmh / 3.6).toFixed(1)} m/s</span>
              </div>
            </div>

            {/* Satellite Signal Constellation Bar */}
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-lg p-3 flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-zinc-400">Satellite Signal Constellation (GPS + GLONASS + Galileo)</span>
                <span className="text-emerald-400 font-bold">{gps.satCount} Tracked</span>
              </div>
              <div className="flex gap-1.5 h-8 items-end">
                {Array.from({ length: 18 }).map((_, i) => {
                  const isLocked = i < gps.satCount;
                  const height = isLocked ? Math.min(100, 40 + (i % 6) * 12) : 15;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className={cn(
                          "w-full rounded-t transition-all",
                          isLocked ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" : "bg-zinc-800"
                        )}
                        style={{ height: `${height}%` }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* System GPS Source Control: Explicit Pixhawk vs Laptop selector & Map Sync */}
            <div className="bg-zinc-950/90 border border-emerald-500/40 rounded-xl p-4 flex flex-col gap-3 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Satellite className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-mono font-bold text-zinc-100 uppercase tracking-wider">
                    System Location Authority
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-zinc-400">Current Source:</span>
                  <span className={cn(
                    "text-[10px] font-mono font-bold px-2 py-0.5 rounded border flex items-center gap-1",
                    gpsSourceMode === "pixhawk"
                      ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                      : "bg-blue-500/20 border-blue-500/50 text-blue-300"
                  )}>
                    {gpsSourceMode === "pixhawk" ? "🛰️ PIXHAWK HARDWARE GPS" : "💻 LAPTOP GEOLOCATION"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                {/* Pixhawk GPS Option */}
                <button
                  onClick={() => {
                    setGpsSourceMode("pixhawk");
                    syncSystemGpsToPixhawk(true);
                  }}
                  className={cn(
                    "p-3 rounded-lg border text-left flex flex-col gap-1 transition-all",
                    gpsSourceMode === "pixhawk"
                      ? "bg-emerald-950/50 border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                      : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 opacity-75 hover:opacity-100"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <Satellite className="w-3.5 h-3.5" />
                      Pixhawk Flight GPS
                    </span>
                    {gpsSourceMode === "pixhawk" && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-snug">
                    Use high-accuracy GPS fix from Pixhawk flight controller. Laptop location is completely bypassed.
                  </p>
                </button>

                {/* Laptop Geolocation Option */}
                <button
                  onClick={() => setGpsSourceMode("laptop")}
                  className={cn(
                    "p-3 rounded-lg border text-left flex flex-col gap-1 transition-all",
                    gpsSourceMode === "laptop"
                      ? "bg-blue-950/50 border-blue-500/60 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                      : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 opacity-75 hover:opacity-100"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-400 flex items-center gap-1.5">
                      <Laptop className="w-3.5 h-3.5" />
                      Laptop Geolocation
                    </span>
                    {gpsSourceMode === "laptop" && (
                      <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-snug">
                    Fallback to browser geolocation API from your laptop or PC.
                  </p>
                </button>
              </div>

              {/* Action Buttons: Sync & Center Map */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-zinc-800/80">
                <button
                  onClick={() => syncSystemGpsToPixhawk(true)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 font-mono text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Locate className="w-3.5 h-3.5" />
                  <span>Sync & Center Map on Pixhawk GPS</span>
                </button>
                <button
                  onClick={() => {
                    syncSystemGpsToPixhawk(false);
                    deployFleetToLocation(gps.lat, gps.lng);
                    setActiveView("Dashboard");
                  }}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-300 font-mono text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <PlaneTakeoff className="w-3.5 h-3.5" />
                  <span>Deploy Fleet to Pixhawk GPS</span>
                </button>
                <button
                  onClick={() => {
                    setActiveView("Dashboard");
                    setCenterMapTarget({ lat: gps.lat, lng: gps.lng, zoom: 17, timestamp: Date.now() });
                  }}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>View on Tactical Map</span>
                </button>
              </div>
            </div>
          </div>

          {/* Compass & Sensor Health Details (Right, 5 cols) */}
          <div className="lg:col-span-5 bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-cyan-400" />
                <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-zinc-100">
                  Magnetometer Health & EKF3
                </h2>
              </div>
              <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                CALIBRATED
              </span>
            </div>

            <div className="flex flex-col gap-3 font-mono text-xs">
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex justify-between items-center">
                <span className="text-zinc-400">Compass Heading:</span>
                <span className="text-cyan-300 font-bold text-sm">
                  {Math.round(compass.headingDeg)}° ({getHeadingCardinal(compass.headingDeg)})
                </span>
              </div>
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex justify-between items-center">
                <span className="text-zinc-400">Total Magnetic Field:</span>
                <span className="text-zinc-200 font-bold">{compass.magMagnitude} mGauss</span>
              </div>
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex justify-between items-center">
                <span className="text-zinc-400">Earth Magnetic Declination:</span>
                <span className="text-zinc-200 font-bold">+0.4° E (Automatic WMM)</span>
              </div>
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex justify-between items-center">
                <span className="text-zinc-400">Attitude Pitch / Roll:</span>
                <span className="text-zinc-200 font-bold">P: {compass.pitchDeg}° | R: {compass.rollDeg}°</span>
              </div>
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex justify-between items-center">
                <span className="text-zinc-400">EKF3 Heading Innovation:</span>
                <span className="text-emerald-400 font-bold">0.02 (Nominal)</span>
              </div>
            </div>

            {/* Battery Power Telemetry */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex flex-col gap-2 mt-auto">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-zinc-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  LiPo Battery & Power Module
                </span>
                <span className="text-emerald-400 font-bold">{telemetry.batteryPercent}%</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                <div className="bg-zinc-900 rounded p-2">
                  <span className="text-[9px] text-zinc-500 uppercase block">Pack Voltage</span>
                  <span className="text-zinc-100 font-bold">{telemetry.batteryVolts} V (4S)</span>
                </div>
                <div className="bg-zinc-900 rounded p-2">
                  <span className="text-[9px] text-zinc-500 uppercase block">Current Draw</span>
                  <span className="text-amber-300 font-bold">{telemetry.batteryAmps} A</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SERIAL MAVLINK TERMINAL */}
      {activeTab === "serial_inspector" && (
        <div className="flex flex-col gap-4 bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-400">
                <FilterIcon />
                <span>Filter Message:</span>
              </div>
              <select
                value={filterMsg}
                onChange={(e) => setFilterMsg(e.target.value)}
                className="bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1 text-xs font-mono text-cyan-300 focus:outline-none"
              >
                <option value="ALL">All MAVLink Messages ({recentPackets.length})</option>
                <option value="GLOBAL_POSITION_INT">GLOBAL_POSITION_INT (#33 - GPS)</option>
                <option value="ATTITUDE">ATTITUDE (#30 - Gyro/Roll/Pitch)</option>
                <option value="GPS_RAW_INT">GPS_RAW_INT (#24 - Satellites)</option>
                <option value="VFR_HUD">VFR_HUD (#74 - Airspeed/Altitude)</option>
                <option value="HEARTBEAT">HEARTBEAT (#0 - Mode/Status)</option>
                <option value="SYS_STATUS">SYS_STATUS (#1 - Battery)</option>
                <option value="RAW_IMU">RAW_IMU (#27 - Compass Magnetometer)</option>
                <option value="STATUSTEXT">STATUSTEXT (#253 - Firmware Logs)</option>
              </select>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="text-zinc-500">Bytes RX: <strong className="text-zinc-300">{serial.rxBytes.toLocaleString()}</strong></span>
              <span>•</span>
              <span className="text-zinc-500">Packets RX: <strong className="text-emerald-400">{serial.rxPackets.toLocaleString()}</strong></span>
              <button
                onClick={clearLogs}
                className="ml-2 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 rounded text-[11px] transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear Buffer</span>
              </button>
            </div>
          </div>

          {/* Terminal Window */}
          <div className="h-80 bg-black/90 border border-zinc-800 rounded-xl p-3 overflow-y-auto custom-scrollbar font-mono text-xs flex flex-col gap-1 shadow-inner">
            {filteredPackets.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-2">
                <Terminal className="w-8 h-8 opacity-40" />
                <span>Waiting for MAVLink telemetry packets on serial port...</span>
                <span className="text-[11px]">Click "Connect Pixhawk USB" or "Run Simulation Test" above.</span>
              </div>
            ) : (
              filteredPackets.map((pkt) => (
                <div
                  key={pkt.id}
                  className="leading-relaxed hover:bg-zinc-900/60 p-1 rounded flex items-start gap-2 border-b border-zinc-900/80"
                >
                  <span className="text-zinc-600 shrink-0">[{pkt.time}]</span>
                  <span className={cn(
                    "font-bold shrink-0 px-1.5 py-0.2 rounded text-[10px]",
                    pkt.name === "GLOBAL_POSITION_INT" ? "bg-cyan-950 text-cyan-300 border border-cyan-800" :
                    pkt.name === "ATTITUDE" ? "bg-purple-950 text-purple-300 border border-purple-800" :
                    pkt.name === "GPS_RAW_INT" ? "bg-emerald-950 text-emerald-300 border border-emerald-800" :
                    pkt.name === "STATUSTEXT" ? "bg-amber-950 text-amber-300 border border-amber-800" :
                    "bg-zinc-800 text-zinc-300"
                  )}>
                    {pkt.name}
                  </span>
                  <span className="text-zinc-300 flex-1">{pkt.summary}</span>
                  <span className="text-zinc-600 text-[10px] hidden md:inline shrink-0 font-mono">
                    HEX: {pkt.hex}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: AUTOPILOT MODES & COMMANDS */}
      {activeTab === "commands" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Flight Mode Switcher */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 flex flex-col gap-4">
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              Flight Mode Controller
            </h2>
            <p className="text-xs text-zinc-400 font-mono">
              Switch ArduPilot / PX4 autopilot operational flight modes over MAVLink serial commands.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-xs">
              {["LOITER", "GUIDED", "RTL", "AUTO", "STABILIZE", "ALT_HOLD", "POSHOLD", "LAND", "BRAKE"].map((mode) => (
                <button
                  key={mode}
                  onClick={() => sendCommand("SET_MODE", mode)}
                  className={cn(
                    "p-2.5 rounded-lg border text-center font-bold transition-all",
                    telemetry.flightMode === mode
                      ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                      : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Safety Arm / Disarm & Stream Rate */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 flex flex-col gap-4">
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              Safety Interlocks & Stream Control
            </h2>

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
                <div>
                  <span className="text-xs font-mono font-bold text-zinc-200 block">Motor Arming Interlock</span>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {telemetry.isArmed ? "Autopilot motors armed and ready." : "Pre-arm safety checks passing."}
                  </span>
                </div>
                {telemetry.isArmed ? (
                  <button
                    onClick={() => sendCommand("DISARM")}
                    className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50 text-rose-300 rounded font-mono text-xs font-bold transition-colors"
                  >
                    DISARM MOTORS
                  </button>
                ) : (
                  <button
                    onClick={() => sendCommand("ARM")}
                    className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 rounded font-mono text-xs font-bold transition-colors"
                  >
                    ARM MOTORS
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
                <div>
                  <span className="text-xs font-mono font-bold text-zinc-200 block">High-Frequency Telemetry Stream</span>
                  <span className="text-[10px] font-mono text-zinc-500">
                    Request 10Hz GPS, ATTITUDE & VFR_HUD streams.
                  </span>
                </div>
                <button
                  onClick={() => sendCommand("REQUEST_STREAMS")}
                  className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-300 rounded font-mono text-xs font-bold transition-colors"
                >
                  REQUEST 10HZ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  );
}
