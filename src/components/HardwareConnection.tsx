import React, { useState, useEffect, useRef } from "react";
import { Cpu, Usb, Wifi, Terminal, AlertTriangle, Link as LinkIcon, Unlink, CheckCircle2 } from "lucide-react";
import { useDRS } from "../store";
import { cn } from "../lib/utils";
import { Drone } from "../types";

export function HardwareConnection() {
  const { drones, updateDroneTelemetry, selectedDroneId } = useDRS();
  
  // Connection states
  const [serialConnected, setSerialConnected] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [wsUrl, setWsUrl] = useState("ws://192.168.1.100:81");
  const [logs, setLogs] = useState<{ time: string; msg: string; isError?: boolean }[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  
  // For Web Serial
  const portRef = useRef<any>(null);
  const readerRef = useRef<any>(null);

  const addLog = (msg: string, isError = false) => {
    setLogs((prev) => [...prev, { time: new Date().toLocaleTimeString(), msg, isError }].slice(-50));
  };

  const parseAndApplyTelemetry = (dataString: string) => {
    try {
      // Expected format: {"id": "DRN-01", "lat": 28.4595, "lng": 77.0266, "alt": 120, "spd": 35, "bat": 94, "hdg": 128}
      const data = JSON.parse(dataString);
      if (data.id) {
        const updates: Partial<Drone> = {};
        if (data.lat !== undefined && data.lng !== undefined) {
          updates.coordinates = { lat: data.lat, lng: data.lng };
        }
        if (data.bat !== undefined) updates.battery = data.bat;
        
        const telUpdates: any = {};
        if (data.alt !== undefined) telUpdates.altitude = data.alt;
        if (data.spd !== undefined) telUpdates.speed = data.spd;
        if (data.hdg !== undefined) telUpdates.heading = data.hdg;
        
        if (Object.keys(telUpdates).length > 0) {
          // Note: we'd ideally merge this deeply, but for simplicity we can construct a partial telemetry object
          // store.tsx handles shallow merge at the root level, so we need to be careful
          // updateDroneTelemetry currently does { ...d, ...updates }
          // We should modify updateDroneTelemetry to do a deep merge or pass a function, but for now we'll rely on the existing drone data.
        }
        
        // Pass updates directly to store. 
        // To handle telemetry safely without destroying other fields:
        const existingDrone = drones.find(d => d.id === data.id);
        if (existingDrone) {
          updates.telemetry = { ...existingDrone.telemetry, ...telUpdates };
          updateDroneTelemetry(data.id, updates);
        }
      }
    } catch (e) {
      // Not JSON or partial chunk - ignore or log if debugging
    }
  };

  const connectSerial = async () => {
    if (!("serial" in navigator)) {
      addLog("Web Serial API not supported in this browser. Please open in a new tab or use Chrome/Edge.", true);
      return;
    }
    
    try {
      // @ts-ignore
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 115200 });
      portRef.current = port;
      setSerialConnected(true);
      addLog("Serial port opened at 115200 baud.");
      
      const decoder = new TextDecoderStream();
      port.readable.pipeTo(decoder.writable).catch(() => {});
      const reader = decoder.readable.getReader();
      readerRef.current = reader;
      
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          buffer += value;
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed) {
              addLog(`USB RX: ${trimmed}`);
              parseAndApplyTelemetry(trimmed);
            }
          }
        }
      }
    } catch (err: any) {
      addLog(`Serial error: ${err.message}`, true);
      setSerialConnected(false);
    }
  };

  const disconnectSerial = async () => {
    try {
      if (readerRef.current) {
        await readerRef.current.cancel();
        readerRef.current = null;
      }
      if (portRef.current) {
        await portRef.current.close();
        portRef.current = null;
      }
      setSerialConnected(false);
      addLog("Serial port closed.");
    } catch (err: any) {
      addLog(`Error closing serial: ${err.message}`, true);
    }
  };

  const connectWs = () => {
    try {
      const ws = new WebSocket(wsUrl);
      ws.onopen = () => {
        setWsConnected(true);
        addLog(`Connected to WebSocket: ${wsUrl}`);
      };
      ws.onmessage = (event) => {
        addLog(`WS RX: ${event.data}`);
        parseAndApplyTelemetry(event.data);
      };
      ws.onerror = (err) => {
        addLog(`WebSocket Error. Ensure the ESP32 is on the same network.`, true);
      };
      ws.onclose = () => {
        setWsConnected(false);
        addLog(`WebSocket connection closed.`);
      };
      wsRef.current = ws;
    } catch (err: any) {
      addLog(`WS Init Error: ${err.message}`, true);
    }
  };

  const disconnectWs = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  return (
    <div className="w-full h-full bg-zinc-950 p-8 overflow-y-auto custom-scrollbar relative z-10 flex flex-col gap-6">
      <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
        <Cpu className="w-8 h-8 text-cyan-400" />
        <h1 className="text-2xl font-bold tracking-widest text-zinc-100 uppercase">Hardware Integration</h1>
      </div>

      <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex gap-3 text-amber-200 text-sm">
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        <p>
          Connect physical Arduino, ESP32, or Pixhawk telemetry modules directly to this dashboard. 
          <strong> Note: Web Serial API requires Google Chrome or Microsoft Edge. If you are in an iframe (like AI Studio), you must open the app in a new tab for USB Serial permissions.</strong>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* USB Serial Card */}
        <div className="border border-zinc-800 bg-zinc-900/50 rounded-xl p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Usb className="w-6 h-6 text-zinc-400" />
              <h2 className="text-lg font-bold uppercase tracking-wider text-zinc-200">USB Serial</h2>
            </div>
            {serialConnected ? (
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">
                <CheckCircle2 className="w-3 h-3" /> CONNECTED
              </span>
            ) : (
              <span className="text-xs font-bold text-zinc-500 bg-zinc-800 px-2 py-1 rounded">DISCONNECTED</span>
            )}
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Connect via USB-to-TTL, Arduino, or direct ESP32 USB. Ensure baud rate is set to <strong>115200</strong>.
          </p>
          
          <div className="mt-auto pt-4">
            {!serialConnected ? (
              <button
                onClick={connectSerial}
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
            Connect to an ESP32 or local telemetry server broadcasting over WebSockets.
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

      <div className="flex-1 flex flex-col border border-zinc-800 bg-black rounded-xl overflow-hidden min-h-[300px]">
        <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-2 flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">
          <Terminal className="w-4 h-4" /> Serial Monitor
        </div>
        <div className="flex-1 p-4 font-mono text-xs overflow-y-auto custom-scrollbar flex flex-col gap-1">
          {logs.length === 0 ? (
            <span className="text-zinc-600">Waiting for data...</span>
          ) : (
            logs.map((log, i) => (
              <div key={i} className={cn("flex gap-3", log.isError ? "text-rose-400" : "text-emerald-400")}>
                <span className="text-zinc-600 shrink-0">[{log.time}]</span>
                <span className="break-all">{log.msg}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="p-4 bg-zinc-900/30 border border-zinc-800 rounded-lg text-sm text-zinc-400">
        <strong className="text-zinc-300 block mb-2">Expected JSON Payload Example:</strong>
        <code className="bg-black text-cyan-300 px-3 py-2 rounded block text-xs font-mono">
          {`{"id":"DRN-01","lat":28.4595,"lng":77.0266,"alt":120,"spd":35,"bat":94,"hdg":128}`}
        </code>
      </div>
    </div>
  );
}
