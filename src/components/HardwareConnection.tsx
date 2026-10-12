import React, { useState } from "react";
import { Cpu, Usb, Wifi, Terminal, AlertTriangle, Link as LinkIcon, Unlink, CheckCircle2, Zap, Trash2, Activity, Radio, Compass } from "lucide-react";
import { useDRS } from "../store";
import { usePixhawk } from "../lib/PixhawkContext";
import { PixhawkStation } from "./PixhawkStation";
import { cn } from "../lib/utils";

export function HardwareConnection() {
  const {
    serialConnected,
    serialBaudRate,
    setSerialBaudRate,
    serialRxCount,
    serialLogs,
    connectSerial,
    disconnectSerial,
    simulateSerialPacket,
    clearSerialLogs,
    wsConnected,
    wsUrl,
    setWsUrl,
    connectWs,
    disconnectWs,
  } = useDRS();

  const { pixhawk } = usePixhawk();
  const [activeTab, setActiveTab] = useState<"pixhawk" | "esp32_websocket">("pixhawk");
  const [customBaud, setCustomBaud] = useState<string>("");

  const handleConnectSerial = () => {
    const activeBaud = customBaud && !isNaN(Number(customBaud)) ? Number(customBaud) : serialBaudRate;
    connectSerial(activeBaud);
  };

  return (
    <div className="w-full h-full bg-zinc-950 flex flex-col overflow-hidden relative z-10">
      {/* Top Selector Navigation */}
      <div className="px-6 py-3 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab("pixhawk")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all",
              activeTab === "pixhawk"
                ? "bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent"
            )}
          >
            <Compass className="w-4 h-4 text-cyan-400" />
            <span>PIXHAWK FLIGHT STATION</span>
            {pixhawk.serial.connected && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-1" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("esp32_websocket")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all",
              activeTab === "esp32_websocket"
                ? "bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent"
            )}
          >
            <Wifi className="w-4 h-4 text-cyan-400" />
            <span>ESP32 & WEBSOCKET</span>
            {wsConnected && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-1" />
            )}
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-zinc-500">
          <span>Web Serial API:</span>
          <span className="text-emerald-400 font-bold">READY (Chrome / Edge)</span>
        </div>
      </div>

      {/* Body Content */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        {activeTab === "pixhawk" ? (
          <PixhawkStation />
        ) : (
          <div className="p-8 flex flex-col gap-6 max-w-6xl mx-auto">
            <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
              <Cpu className="w-8 h-8 text-cyan-400" />
              <div>
                <h1 className="text-2xl font-bold tracking-widest text-zinc-100 uppercase">Companion Microcontroller Link</h1>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">ESP32 / Arduino / Custom Sensor Bridge</p>
              </div>
            </div>

            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex gap-3 text-amber-200 text-sm">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <p>
                Connect ESP32 or custom wireless telemetry bridges over local Wi-Fi WebSockets or USB.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* USB Serial Card */}
              <div className="border border-zinc-800 bg-zinc-900/50 rounded-xl p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Usb className="w-6 h-6 text-zinc-400" />
                    <h2 className="text-lg font-bold uppercase tracking-wider text-zinc-200">USB Serial Bridge</h2>
                  </div>
                  {serialConnected ? (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">
                      <CheckCircle2 className="w-3 h-3" /> CONNECTED ({serialRxCount} pkts)
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-zinc-500 bg-zinc-800 px-2 py-1 rounded">DISCONNECTED</span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Connect via USB-to-TTL, Arduino, or direct ESP32 USB. Select baud rate below.
                </p>

                <div className="flex flex-col gap-2 bg-zinc-950/70 p-3 rounded-lg border border-zinc-800">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-mono text-zinc-400 uppercase font-semibold">Baud Rate:</label>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-bold">
                      {(customBaud ? customBaud : serialBaudRate).toLocaleString()} BAUD
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[256000, 115200, 921600, 460800, 57600, 9600].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        disabled={serialConnected}
                        onClick={() => {
                          setSerialBaudRate(rate);
                          setCustomBaud("");
                        }}
                        className={cn(
                          "px-2 py-1 text-[11px] font-mono rounded border transition-all text-center",
                          serialBaudRate === rate && !customBaud
                            ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold shadow-sm"
                            : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700",
                          serialConnected && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {rate === 256000 ? "256000 (Fast)" : rate}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-zinc-500 font-mono">Custom:</span>
                    <input
                      type="number"
                      placeholder="e.g. 256000"
                      value={customBaud}
                      disabled={serialConnected}
                      onChange={(e) => setCustomBaud(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 font-mono focus:outline-none focus:border-cyan-500 disabled:opacity-50"
                    />
                  </div>
                </div>
                
                <div className="mt-auto pt-2 flex flex-col gap-2">
                  {!serialConnected ? (
                    <button
                      onClick={handleConnectSerial}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 rounded transition-all font-bold tracking-wider text-sm"
                    >
                      <LinkIcon className="w-4 h-4" /> CONNECT USB DEVICE
                    </button>
                  ) : (
                    <button
                      onClick={disconnectSerial}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/50 rounded transition-all font-bold tracking-wider text-sm"
                    >
                      <Unlink className="w-4 h-4" /> DISCONNECT USB
                    </button>
                  )}

                  <button
                    onClick={simulateSerialPacket}
                    className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded text-xs font-mono transition-colors"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Simulate Telemetry Pulse</span>
                  </button>
                </div>
              </div>

              {/* WebSocket Card */}
              <div className="border border-zinc-800 bg-zinc-900/50 rounded-xl p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Wifi className="w-6 h-6 text-zinc-400" />
                    <h2 className="text-lg font-bold uppercase tracking-wider text-zinc-200">Wi-Fi (WebSocket)</h2>
                  </div>
                  {wsConnected ? (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">
                      <CheckCircle2 className="w-3 h-3" /> CONNECTED
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-zinc-500 bg-zinc-800 px-2 py-1 rounded">DISCONNECTED</span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Connect to an ESP32 broadcasting telemetry over local WebSockets.
                </p>
                
                <input
                  type="text"
                  value={wsUrl}
                  onChange={(e) => setWsUrl(e.target.value)}
                  disabled={wsConnected}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-cyan-500 transition-colors disabled:opacity-50"
                  placeholder="ws://192.168.1.x:81"
                />
                
                <div className="mt-auto pt-2">
                  {!wsConnected ? (
                    <button
                      onClick={connectWs}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 rounded transition-all font-bold tracking-wider text-sm"
                    >
                      <LinkIcon className="w-4 h-4" /> CONNECT SOCKET
                    </button>
                  ) : (
                    <button
                      onClick={disconnectWs}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/50 rounded transition-all font-bold tracking-wider text-sm"
                    >
                      <Unlink className="w-4 h-4" /> DISCONNECT SOCKET
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col border border-zinc-800 bg-black rounded-xl overflow-hidden min-h-[220px]">
              <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-2 flex items-center justify-between text-xs font-bold text-zinc-400 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <span>Serial Monitor ({serialLogs.length})</span>
                </div>
                {serialLogs.length > 0 && (
                  <button
                    onClick={clearSerialLogs}
                    className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 font-mono transition-colors"
                  >
                    <Trash2 className="w-3 h-3" /> Clear
                  </button>
                )}
              </div>
              <div className="flex-1 p-4 font-mono text-xs overflow-y-auto custom-scrollbar flex flex-col gap-1">
                {serialLogs.length === 0 ? (
                  <span className="text-zinc-600">Waiting for data...</span>
                ) : (
                  serialLogs.map((log, i) => (
                    <div key={i} className={cn("flex gap-3", log.isError ? "text-rose-400" : "text-emerald-400")}>
                      <span className="text-zinc-600 shrink-0">[{log.time}]</span>
                      <span className="break-all">{log.msg}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
