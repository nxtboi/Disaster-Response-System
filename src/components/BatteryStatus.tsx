import { Drone } from "../types";
import { Battery, BatteryCharging, BatteryWarning } from "lucide-react";
import { cn } from "../lib/utils";

export function BatteryStatus({ drone }: { drone: Drone }) {
  const isCritical = drone.battery <= 20;
  const isCharging = drone.status === "Charging";

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">Power Subsystem</h2>
      
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isCharging ? (
            <BatteryCharging className="w-5 h-5 text-amber-400" />
          ) : isCritical ? (
            <BatteryWarning className="w-5 h-5 text-rose-500 animate-pulse" />
          ) : (
            <Battery className="w-5 h-5 text-emerald-400" />
          )}
          <div className="flex flex-col">
            <span className="text-xl font-mono text-zinc-100">{drone.battery}%</span>
            <span className="text-[10px] uppercase tracking-wider text-zinc-500">
              {isCharging ? "Charging" : isCritical ? "Critical Low" : "Discharging"}
            </span>
          </div>
        </div>
        
        <div className="flex flex-col items-end">
          <span className="text-sm font-mono text-zinc-300">
            {isCharging ? "--:--" : Math.max(0, Math.floor(drone.battery * 0.35))} min
          </span>
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">Est. Flight Time</span>
        </div>
      </div>
    </div>
  );
}
