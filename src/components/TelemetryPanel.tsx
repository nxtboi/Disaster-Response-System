import { Drone } from "../types";
import { Activity } from "lucide-react";

function DataPoint({ label, value, unit }: { label: string, value: string | number, unit?: string }) {
  return (
    <div className="flex flex-col border-l border-zinc-800/60 pl-3">
      <span className="text-[10px] tracking-widest text-zinc-500 uppercase">{label}</span>
      <div className="flex items-baseline gap-1 mt-0.5">
        <span className="text-sm font-mono text-zinc-200">{value}</span>
        {unit && <span className="text-[10px] text-zinc-600">{unit}</span>}
      </div>
    </div>
  );
}

export function TelemetryPanel({ drone }: { drone: Drone }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <h2 className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">Live Telemetry</h2>
        <Activity className="w-3 h-3 text-cyan-500/50" />
      </div>
      
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded p-3">
        <div className="grid grid-cols-2 gap-y-4 gap-x-2">
          <DataPoint label="Altitude" value={drone.telemetry.altitude} unit="m" />
          <DataPoint label="Speed" value={drone.telemetry.speed} unit="km/h" />
          <DataPoint label="Heading" value={drone.telemetry.heading} unit="°" />
          <DataPoint label="Distance" value={drone.telemetry.distanceFromOperator.toFixed(2)} unit="km" />
          <DataPoint label="V. Speed" value={drone.telemetry.verticalSpeed > 0 ? `+${drone.telemetry.verticalSpeed}` : drone.telemetry.verticalSpeed} unit="m/s" />
          <DataPoint label="Satellites" value={drone.telemetry.satelliteCount} />
        </div>
        
        <div className="mt-4 pt-4 border-t border-zinc-800/60 flex justify-between items-center">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">Flight Mode</span>
          <span className="text-xs font-bold tracking-widest text-cyan-400">{drone.flightMode}</span>
        </div>
      </div>
    </div>
  );
}
