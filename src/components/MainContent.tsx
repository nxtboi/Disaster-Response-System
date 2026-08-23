import { useDRS } from "../store";
import { LiveMap } from "./LiveMap";
import { CameraFeed } from "./CameraFeed";
import { LiveMonitoring } from "./LiveMonitoring";
import { HardwareConnection } from "./HardwareConnection";
import { VoiceDetectionPage } from "./VoiceDetectionPage";
import { MissionPlanner } from "./MissionPlanner";
import { ShieldAlert, AlertTriangle, Info } from "lucide-react";
import { cn } from "../lib/utils";

export function MainContent() {
  const { activeView, drones } = useDRS();
  
  const allAlerts = drones.flatMap(d => d.alerts.map(a => ({ droneId: d.id, droneName: d.name, message: a })));

  return (
    <main className="flex-1 flex flex-col min-w-0 relative h-full">
      <div className="absolute inset-0 z-0">
        {activeView === "Live Monitoring" ? (
          <LiveMonitoring />
        ) : activeView === "Voice Detection" ? (
          <VoiceDetectionPage />
        ) : activeView === "Alerts" ? (
           <div className="w-full h-full bg-zinc-950 p-8 overflow-y-auto custom-scrollbar relative z-10 flex flex-col gap-6">
              <h1 className="text-2xl font-bold tracking-widest text-zinc-100 uppercase border-b border-zinc-800 pb-4">System Alerts & Logs</h1>
              <div className="flex flex-col gap-3 max-w-4xl">
                 {allAlerts.length === 0 ? (
                    <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-lg flex items-center gap-3 text-zinc-400">
                      <Info className="w-5 h-5" />
                      <span>All systems operational. No active alerts.</span>
                    </div>
                 ) : (
                    allAlerts.map((alert, i) => {
                      const isCritical = alert.message.toLowerCase().includes('critical') || alert.message.toLowerCase().includes('battery below');
                      return (
                        <div key={i} className={cn(
                          "p-4 rounded-lg border flex items-center justify-between",
                          isCritical ? "bg-rose-500/10 border-rose-500/30" : "bg-amber-500/10 border-amber-500/30"
                        )}>
                          <div className="flex items-center gap-4">
                            {isCritical ? (
                              <ShieldAlert className="w-6 h-6 text-rose-400" />
                            ) : (
                              <AlertTriangle className="w-6 h-6 text-amber-400" />
                            )}
                            <div className="flex flex-col">
                               <span className={cn(
                                 "text-sm font-bold uppercase tracking-wider",
                                 isCritical ? "text-rose-400" : "text-amber-400"
                               )}>
                                 {alert.droneName}
                               </span>
                               <span className="text-zinc-300 font-medium">{alert.message}</span>
                            </div>
                          </div>
                          <div className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                            {new Date().toLocaleTimeString()}
                          </div>
                        </div>
                      );
                    })
                 )}
              </div>
           </div>
        ) : activeView === "Hardware" ? (
          <HardwareConnection />
        ) : (
          <LiveMap />
        )}
      </div>

      {/* Floating Autonomous Mission Planner HUD when in Missions view */}
      {activeView === "Missions" && (
        <div className="absolute top-4 right-4 z-20 w-84 sm:w-96 max-h-[calc(100vh-100px)] overflow-y-auto custom-scrollbar bg-zinc-950/90 backdrop-blur-xl border border-cyan-500/40 rounded-xl p-4 shadow-2xl pointer-events-auto">
          <MissionPlanner />
        </div>
      )}
      
      {/* Floating Draggable Camera Feed in Dashboard or Missions mode */}
      {(activeView === "Dashboard" || activeView === "Missions") && (
        <div className="absolute bottom-6 left-6 z-20 pointer-events-auto">
          <CameraFeed isFloating={true} />
        </div>
      )}
      
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-zinc-950/30 pointer-events-none z-[5]" />
    </main>
  );
}

