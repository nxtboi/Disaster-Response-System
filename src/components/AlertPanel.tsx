import { useDRS } from "../store";
import { AlertTriangle, Info, ShieldAlert } from "lucide-react";
import { cn } from "../lib/utils";

export function AlertPanel() {
  const { drones } = useDRS();
  
  const allAlerts = drones.flatMap(d => d.alerts.map(a => ({ droneId: d.id, droneName: d.name, message: a })));

  return (
    <div className="flex flex-col gap-3 mt-2 flex-1">
      <div className="flex justify-between items-center">
        <h2 className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">System Alerts</h2>
        <span className="text-[10px] font-bold text-zinc-600 bg-zinc-900 px-1.5 py-0.5 rounded">{allAlerts.length}</span>
      </div>
      
      <div className="flex flex-col gap-2">
        {allAlerts.length === 0 ? (
          <div className="flex items-center gap-2 p-3 bg-zinc-900/30 border border-zinc-800/60 rounded">
            <Info className="w-4 h-4 text-zinc-500" />
            <span className="text-xs text-zinc-400">No active alerts.</span>
          </div>
        ) : (
          allAlerts.map((alert, i) => {
            const isCritical = alert.message.toLowerCase().includes('critical') || alert.message.toLowerCase().includes('battery below');
            return (
              <div key={i} className={cn(
                "p-2.5 rounded border flex flex-col gap-1",
                isCritical ? "bg-rose-500/10 border-rose-500/30" : "bg-amber-500/10 border-amber-500/30"
              )}>
                <div className="flex items-center gap-2">
                  {isCritical ? (
                    <ShieldAlert className="w-3 h-3 text-rose-400" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                  )}
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-wider",
                    isCritical ? "text-rose-400" : "text-amber-400"
                  )}>
                    {alert.droneName}
                  </span>
                </div>
                <span className="text-xs text-zinc-300 font-medium pl-5">{alert.message}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
