import { useDRS } from "../store";
import { ShieldCheck, ShieldAlert, Shield } from "lucide-react";
import { cn } from "../lib/utils";

export function ReadyToProtect() {
  const { drones } = useDRS();
  
  const readyDrones = drones.filter(d => 
    d.status === "Online" && 
    d.battery > 20 && 
    d.gpsStatus === "Connected" && 
    d.cameraStatus === "Active"
  );

  return (
    <div className="flex flex-col gap-3 mb-2">
      <h2 className="text-xs font-bold tracking-widest text-zinc-500 uppercase">Status</h2>
      <div className={cn(
        "p-3 rounded border flex items-start gap-3",
        readyDrones.length > 0 ? "bg-emerald-500/10 border-emerald-500/30" : "bg-rose-500/10 border-rose-500/30"
      )}>
        {readyDrones.length > 0 ? (
          <ShieldCheck className="w-5 h-5 text-emerald-400 mt-0.5" />
        ) : (
          <ShieldAlert className="w-5 h-5 text-rose-400 mt-0.5" />
        )}
        <div className="flex flex-col">
          <span className={cn(
            "text-sm font-bold tracking-wide uppercase",
            readyDrones.length > 0 ? "text-emerald-400" : "text-rose-400"
          )}>
            {readyDrones.length > 0 ? "Ready to Protect" : "Protection Offline"}
          </span>
          <span className="text-xs text-zinc-400 mt-1">
            {readyDrones.length} of {drones.length} drones available for immediate deployment.
          </span>
        </div>
      </div>
    </div>
  );
}
