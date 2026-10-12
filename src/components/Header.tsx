import { useDRS } from "../store";
import { usePixhawk } from "../lib/PixhawkContext";
import { 
  Clock, MapPin, Loader2, PanelRight, PanelRightClose, 
  Home, Cpu, Compass, Satellite, Laptop, ChevronDown
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
    setActiveView,
    gpsSourceMode,
    setGpsSourceMode,
    setCenterMapTarget,
  } = useDRS();
  const { pixhawk, syncSystemGpsToPixhawk } = usePixhawk();
  const [time, setTime] = useState(new Date());
  const [showGpsMenu, setShowGpsMenu] = useState(false);

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
        {/* Pixhawk Hardware Telemetry Indicator */}
        <button
          onClick={() => setActiveView("Hardware")}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border transition-all ${
            pixhawk.serial.connected
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
              : 'bg-zinc-900 border-zinc-700/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
          title="Click to view Pixhawk Primary Flight Display, GPS & Compass station"
        >
          <Cpu className={`w-3 h-3 ${pixhawk.serial.connected ? 'text-emerald-400' : 'text-zinc-500'}`} />
          <span>
            {pixhawk.serial.connected
              ? `Pixhawk: ${pixhawk.telemetry.flightMode} • ${Math.round(pixhawk.compass.headingDeg)}°`
              : 'Pixhawk Serial'}
          </span>
          {pixhawk.serial.connected && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          )}
        </button>

        {/* GPS Source & Quick Location Control */}
        <div className="relative">
          <div className="flex items-center">
            <button
              onClick={() => {
                if (gpsSourceMode === "pixhawk") {
                  syncSystemGpsToPixhawk(true);
                } else {
                  requestUserLocation(false, true);
                }
              }}
              className={`flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-l-full text-[11px] font-mono border transition-all ${
                gpsSourceMode === "pixhawk"
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                  : userLocation
                  ? 'bg-blue-950/60 border-blue-500/40 text-blue-300 hover:bg-blue-900/60'
                  : 'bg-zinc-900 border-zinc-700/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
              title={
                gpsSourceMode === "pixhawk"
                  ? "Sourced from Pixhawk Flight GPS (Laptop location bypassed). Click to center map."
                  : "Sourced from Laptop Geolocation. Click to update."
              }
            >
              {isLocatingUser ? (
                <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />
              ) : gpsSourceMode === "pixhawk" ? (
                <Satellite className="w-3 h-3 text-emerald-400 animate-pulse" />
              ) : (
                <Laptop className={`w-3 h-3 ${userLocation ? 'text-blue-400' : 'text-zinc-500'}`} />
              )}
              <span>
                {isLocatingUser
                  ? 'Acquiring Fix...'
                  : gpsSourceMode === "pixhawk"
                  ? `Pixhawk GPS: ${(userLocation?.lat || pixhawk.gps.lat).toFixed(3)}, ${(userLocation?.lng || pixhawk.gps.lng).toFixed(3)}`
                  : userLocation
                  ? `Laptop GPS: ${userLocation.lat.toFixed(3)}, ${userLocation.lng.toFixed(3)}`
                  : 'Detect Location'}
              </span>
              {gpsSourceMode === "pixhawk" && (
                <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {pixhawk.gps.fixType || "3D FIX"}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowGpsMenu(!showGpsMenu)}
              className={`p-1 rounded-r-full text-[11px] font-mono border-y border-r transition-all ${
                gpsSourceMode === "pixhawk"
                  ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900'
                  : 'bg-zinc-900 border-zinc-700/60 text-zinc-400 hover:text-zinc-200'
              }`}
              title="Change GPS Location Source"
            >
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>

          {/* GPS Source Selector Dropdown */}
          {showGpsMenu && (
            <div className="absolute right-0 top-full mt-1.5 w-64 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-2 z-50 flex flex-col gap-1.5 font-mono text-xs backdrop-blur-xl">
              <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider px-2 py-1 border-b border-zinc-800 flex items-center justify-between">
                <span>System GPS Source</span>
                <span className="text-[9px] text-emerald-400">HARDWARE PRIORITY</span>
              </div>

              {/* Option 1: Pixhawk Hardware GPS */}
              <button
                onClick={() => {
                  setGpsSourceMode("pixhawk");
                  syncSystemGpsToPixhawk(true);
                  setShowGpsMenu(false);
                }}
                className={`flex items-start gap-2.5 p-2 rounded-lg text-left transition-all ${
                  gpsSourceMode === "pixhawk"
                    ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-200'
                    : 'hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-transparent'
                }`}
              >
                <Satellite className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="font-bold flex items-center gap-1.5">
                    <span>Pixhawk Flight GPS</span>
                    {gpsSourceMode === "pixhawk" && (
                      <span className="text-[9px] px-1 rounded bg-emerald-400/20 text-emerald-300">ACTIVE</span>
                    )}
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    Bypasses laptop. Uses live GPS coordinates from Pixhawk telemetry.
                  </div>
                </div>
              </button>

              {/* Option 2: Laptop Geolocation */}
              <button
                onClick={() => {
                  setGpsSourceMode("laptop");
                  requestUserLocation(false, true);
                  setShowGpsMenu(false);
                }}
                className={`flex items-start gap-2.5 p-2 rounded-lg text-left transition-all ${
                  gpsSourceMode === "laptop"
                    ? 'bg-blue-500/15 border border-blue-500/40 text-blue-200'
                    : 'hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-transparent'
                }`}
              >
                <Laptop className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="font-bold flex items-center gap-1.5">
                    <span>Laptop Geolocation</span>
                    {gpsSourceMode === "laptop" && (
                      <span className="text-[9px] px-1 rounded bg-blue-400/20 text-blue-300">ACTIVE</span>
                    )}
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    Browser navigator.geolocation API from your laptop.
                  </div>
                </div>
              </button>

              <div className="border-t border-zinc-800/80 pt-1.5 px-1 flex justify-between items-center text-[10px] text-zinc-500">
                <span>Fix: {pixhawk.gps.fixType}</span>
                <span>Sats: {pixhawk.gps.satCount}</span>
                <button
                  onClick={() => {
                    syncSystemGpsToPixhawk(true);
                    setShowGpsMenu(false);
                  }}
                  className="text-cyan-400 hover:underline font-bold"
                >
                  Re-center Map
                </button>
              </div>
            </div>
          )}
        </div>

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
