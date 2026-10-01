import React, { useState } from "react";
import {
  Usb,
  Link as LinkIcon,
  Unlink,
  Terminal,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Cpu,
  Radio,
  Activity,
  Layers,
  Gauge,
} from "lucide-react";
import { useDRS } from "../store";
import { cn } from "../lib/utils";

const PRESET_BAUDS = [
  { rate: 256000, label: "256,000 BAUD (Pixhawk / Fast)" },
  { rate: 115200, label: "115,200 BAUD (ESP32 / Arduino)" },
  { rate: 921600, label: "921,600 BAUD (Ultra High)" },
  { rate: 460800, label: "460,800 BAUD (High Speed)" },
  { rate: 57600, label: "57,600 BAUD (Telemetry Radio)" },
  { rate: 38400, label: "38,400 BAUD" },
  { rate: 19200, label: "19,200 BAUD" },
  { rate: 9600, label: "9,600 BAUD (Standard)" },
];

export function UsbSerialPanel() {
  const {
    serialConnected,
    serialBaudRate,
    setSerialBaudRate,
    serialRxCount,
    lastSerialPacket,
    serialLogs,
    connectSerial,
    disconnectSerial,
    simulateSerialPacket,
    selectedDroneId,
    setSelectedDroneId,
    drones,
    setActiveView,
  } = useDRS();

  const [customBaud, setCustomBaud] = useState<string>("");
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const activeBaud = isCustomMode && customBaud && !isNaN(Number(customBaud))
    ? Number(customBaud)
    : serialBaudRate;

  const handleConnect = async () => {
    setIsConnecting(true);
    setConnectError(null);
    try {
      const res = await connectSerial(activeBaud);
      if (!res.success && res.error) {
        setConnectError(res.error);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnectSerial();
    setConnectError(null);
  };

  return (
    <div className="flex flex-col gap-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3.5 shadow-lg backdrop-blur-md transition-all">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn(
            "p-1.5 rounded-lg border transition-all",
            serialConnected
              ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
              : "bg-zinc-800/60 border-zinc-700/60 text-zinc-400"
          )}>
            <Usb className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold font-mono tracking-wider text-zinc-100 uppercase">
                USB Serial Link
              </span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono block">
              Hardware Telemetry Feed
            </span>
          </div>
        </div>

        {serialConnected ? (
          <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full animate-pulse shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            CONNECTED
          </span>
        ) : (
          <span className="text-[10px] font-mono text-zinc-500 bg-zinc-950/80 border border-zinc-800 px-2 py-0.5 rounded-full">
            STANDBY
          </span>
        )}
      </div>

      {/* Target Drone Selection */}
      <div className="flex items-center justify-between bg-zinc-950/70 border border-zinc-800/80 rounded-lg px-2.5 py-1.5">
        <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] font-mono">
          <Layers className="w-3 h-3 text-cyan-400" />
          <span>Bind Stream:</span>
        </div>
        <select
          value={selectedDroneId || (drones[0]?.id ?? "DRN-01")}
          onChange={(e) => setSelectedDroneId(e.target.value)}
          className="bg-zinc-900 border border-zinc-700/80 text-cyan-300 text-[11px] font-mono font-semibold rounded px-2 py-0.5 focus:outline-none focus:border-cyan-500"
        >
          {drones.map((d) => (
            <option key={d.id} value={d.id}>
              {d.id} ({d.name})
            </option>
          ))}
        </select>
      </div>

      {/* Connected State Display */}
      {serialConnected ? (
        <div className="flex flex-col gap-2 pt-1">
          <div className="grid grid-cols-2 gap-1.5 bg-zinc-950/80 border border-zinc-800 rounded-lg p-2 font-mono text-[11px]">
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-zinc-500">Baud Rate</span>
              <span className="text-zinc-200 font-bold text-xs">{serialBaudRate.toLocaleString()}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-zinc-500">Packets RX</span>
              <span className="text-emerald-400 font-bold text-xs flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                {serialRxCount} pkts
              </span>
            </div>
          </div>

          {/* Quick Realtime Snapshot if available */}
          {lastSerialPacket && (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-2 flex flex-col gap-1 font-mono text-[10px]">
              <div className="flex justify-between text-zinc-400 text-[9px] uppercase">
                <span>Latest Telemetry RX</span>
                <span className="text-emerald-400 font-bold">{new Date(lastSerialPacket.timestamp).toLocaleTimeString()}</span>
              </div>
              <div className="grid grid-cols-3 gap-1 text-center pt-0.5">
                <div className="bg-zinc-900/60 rounded px-1 py-0.5">
                  <span className="text-zinc-500 block text-[8px]">ALT</span>
                  <span className="text-zinc-200 font-bold">{lastSerialPacket.alt ?? "--"}m</span>
                </div>
                <div className="bg-zinc-900/60 rounded px-1 py-0.5">
                  <span className="text-zinc-500 block text-[8px]">SPD</span>
                  <span className="text-zinc-200 font-bold">{lastSerialPacket.spd ?? "--"}km/h</span>
                </div>
                <div className="bg-zinc-900/60 rounded px-1 py-0.5">
                  <span className="text-zinc-500 block text-[8px]">BAT</span>
                  <span className="text-emerald-400 font-bold">{lastSerialPacket.bat ?? "--"}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="flex items-center gap-1.5 pt-1">
            <button
              onClick={simulateSerialPacket}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded text-[11px] font-mono font-semibold transition-all"
              title="Inject test telemetry packet"
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Sim Pulse</span>
            </button>

            <button
              onClick={handleDisconnect}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/40 text-rose-300 rounded text-[11px] font-mono font-bold transition-all"
            >
              <Unlink className="w-3 h-3" />
              <span>Disconnect</span>
            </button>
          </div>
        </div>
      ) : (
        /* Disconnected State - Configuration & Connect */
        <div className="flex flex-col gap-2 pt-1">
          {/* Baud Rate Dropdown List */}
          <div className="flex flex-col gap-1.5 bg-zinc-950/70 border border-zinc-800/80 rounded-lg p-2.5">
            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
              <span className="uppercase font-semibold flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                Baud Rate:
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-bold">
                {activeBaud.toLocaleString()} BAUD
              </span>
            </div>

            <div className="relative">
              <select
                value={isCustomMode ? "custom" : serialBaudRate}
                onChange={(e) => {
                  if (e.target.value === "custom") {
                    setIsCustomMode(true);
                  } else {
                    setIsCustomMode(false);
                    const val = Number(e.target.value);
                    setSerialBaudRate(val);
                    setCustomBaud("");
                  }
                }}
                className="w-full bg-zinc-900 border border-zinc-700/80 hover:border-zinc-600 text-zinc-100 text-xs font-mono rounded-lg px-2.5 py-2 focus:outline-none focus:border-cyan-500 transition-colors cursor-pointer appearance-none pr-8"
              >
                {PRESET_BAUDS.map((b) => (
                  <option key={b.rate} value={b.rate} className="bg-zinc-950 text-zinc-200">
                    {b.label}
                  </option>
                ))}
                <option value="custom" className="bg-zinc-950 text-amber-300">
                  ⚡ Custom Baud Rate...
                </option>
              </select>
              <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>

            {isCustomMode && (
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="number"
                  placeholder="Enter custom baud (e.g. 500000)"
                  value={customBaud}
                  onChange={(e) => setCustomBaud(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700/80 text-xs text-cyan-300 font-mono rounded px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 placeholder:text-zinc-600"
                  autoFocus
                />
              </div>
            )}
          </div>

          {/* Connect Button */}
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/50 hover:border-cyan-400 text-cyan-300 hover:text-cyan-100 rounded-lg text-xs font-mono font-bold tracking-wider transition-all shadow-[0_0_12px_rgba(6,182,212,0.15)] disabled:opacity-50"
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>{isConnecting ? "CONNECTING..." : "CONNECT USB DEVICE"}</span>
          </button>

          {/* Test Simulation Button */}
          <button
            onClick={simulateSerialPacket}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 rounded text-[11px] font-mono transition-colors"
            title="Test USB telemetry parsing without physical hardware plugged in"
          >
            <Zap className="w-3 h-3 text-amber-400" />
            <span>Test Telemetry Stream</span>
          </button>

          {/* Error Message if any */}
          {connectError && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-2 text-[10px] text-rose-300 font-mono flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-snug">
                <span>{connectError}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mini Terminal Toggle */}
      <div className="border-t border-zinc-800/80 pt-2 flex flex-col gap-1.5">
        <button
          onClick={() => setShowTerminal((prev) => !prev)}
          className="flex items-center justify-between text-[10px] font-mono text-zinc-400 hover:text-zinc-200 transition-colors py-0.5"
        >
          <div className="flex items-center gap-1.5">
            <Terminal className="w-3 h-3 text-cyan-500" />
            <span>USB RX Serial Monitor ({serialLogs.length})</span>
          </div>
          {showTerminal ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {showTerminal && (
          <div className="bg-black/90 border border-zinc-800 rounded-lg p-2 h-28 overflow-y-auto custom-scrollbar font-mono text-[10px] flex flex-col gap-0.5">
            {serialLogs.length === 0 ? (
              <span className="text-zinc-600 italic">No serial data received yet. Click "Connect USB Device" or "Test Telemetry Stream".</span>
            ) : (
              serialLogs.slice(-15).map((log, idx) => (
                <div key={idx} className={cn("leading-tight break-all", log.isError ? "text-rose-400" : "text-emerald-400")}>
                  <span className="text-zinc-600 mr-1.5">[{log.time}]</span>
                  <span>{log.msg}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Footer Quick Link to Hardware Studio */}
      <div className="pt-0.5 flex items-center justify-between text-[10px] font-mono text-zinc-500 border-t border-zinc-800/60">
        <span>Web Serial API</span>
        <button
          onClick={() => setActiveView("Hardware Link")}
          className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 hover:underline font-semibold"
        >
          <span>Hardware Page</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </button>
      </div>
    </div>
  );
}
