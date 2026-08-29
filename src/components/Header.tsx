import { useDRS } from "../store";
import { 
  Clock, MapPin, Loader2, PanelRight, PanelRightClose, 
  Home
} from "lucide-react";
import { useEffect, useState } from "react";

export function Header({
  onLogout,
}: {
  userRole?: "admin" | "operator";
  onLogout?: () => void;
  onOpenAdminPanel?: () => void;
}) {
  const {
    systemStatus,
    drones,
    userLocation,
    isLocatingUser,
    requestUserLocation,
    isStatusPanelVisible,
    toggleStatusPanel,
  } = useDRS();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const onlineDrones = drones.filter(d => d.status === 'Online').length;
  const activeMissions = drones.filter(d => d.missionActive).length;

  return (
    <header className="h-16 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-xl flex items-center justify-between px-6 shrink-0 z-20">
      <div className="flex items-center gap-6">
        <div className="flex flex-col">
          <span className="text-sm font-bold tracking-widest text-zinc-100">DRS COMMAND CENTER</span>
          <span className="text-[10px] text-zinc-500 tracking-wider">Drone Response & Surveillance</span>
        </div>
        
        <div className="h-6 w-px bg-zinc-800 mx-2" />
        
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            systemStatus === 'ALL SYSTEMS OPERATIONAL' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
            systemStatus === 'WARNINGS DETECTED' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' :
            'bg-rose-500 shadow-[0_0_8px_rgba(225,29,72,0.5)]'
          } animate-pulse`} />
          <span className={`text-xs font-medium tracking-widest ${
            systemStatus === 'ALL SYSTEMS OPERATIONAL' ? 'text-emerald-400' :
            systemStatus === 'WARNINGS DETECTED' ? 'text-amber-400' :
            'text-rose-400'
          }`}>
            {systemStatus}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-5">
        {/* User GPS Quick Status */}
        <button
          onClick={() => requestUserLocation(false)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border transition-all ${
            userLocation
              ? 'bg-blue-950/60 border-blue-500/40 text-blue-300 hover:bg-blue-900/60'
              : 'bg-zinc-900 border-zinc-700/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
          title="Click to detect or center on your real-time location"
        >
          {isLocatingUser ? (
            <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
          ) : (
            <MapPin className={`w-3 h-3 ${userLocation ? 'text-blue-400' : 'text-zinc-500'}`} />
          )}
          <span>
            {isLocatingUser
              ? 'Locating...'
              : userLocation
              ? `GPS: ${userLocation.lat.toFixed(3)}, ${userLocation.lng.toFixed(3)}`
              : 'Detect Location'}
          </span>
        </button>

        <div className="hidden lg:flex items-center gap-4 text-xs font-medium tracking-widest text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="text-zinc-600">ONLINE:</span>
            <span className="text-cyan-400">{onlineDrones}/{drones.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-600">MISSIONS:</span>
            <span className="text-emerald-400">{activeMissions}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-zinc-300 font-mono text-sm">
          <Clock className="w-4 h-4 text-zinc-500" />
          {time.toLocaleTimeString('en-US', { hour12: false })} UTC
        </div>

        {/* Direct Home Navigation Button */}
        {onLogout && (
          <button
            id="header-logout-button"
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900/80 hover:bg-cyan-500/10 border border-zinc-800 hover:border-cyan-500/40 text-zinc-300 hover:text-cyan-300 text-xs font-mono font-semibold transition-all group shadow-sm active:scale-95"
            title="Return to Home Page"
          >
            <Home className="w-3.5 h-3.5 text-zinc-400 group-hover:text-cyan-400 transition-colors" />
            <span>HOME</span>
          </button>
        )}

        {/* Side Panel Toggle */}
        <button
          onClick={toggleStatusPanel}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono border transition-all ${
            isStatusPanelVisible
              ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
              : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200"
          }`}
          title={isStatusPanelVisible ? "Hide Status Panel (Side Drawer)" : "Show Status Panel (Side Drawer)"}
        >
          {isStatusPanelVisible ? (
            <PanelRightClose className="w-3.5 h-3.5" />
          ) : (
            <PanelRight className="w-3.5 h-3.5 text-cyan-400" />
          )}
          <span className="hidden md:inline font-semibold">
            {isStatusPanelVisible ? "HIDE PANEL" : "STATUS PANEL"}
          </span>
        </button>
      </div>
    </header>
  );
}
