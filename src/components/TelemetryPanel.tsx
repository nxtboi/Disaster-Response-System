import { Drone } from "../types";
import { Activity, Usb, Compass } from "lucide-react";
import { useDRS } from "../store";
import { usePixhawk } from "../lib/PixhawkContext";

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
  const { serialConnected } = useDRS();
  const { pixhawk } = usePixhawk();
  const isPixhawkLinked = pixhawk.serial.connected;
  const isHwLinked = Boolean(drone.isHardwareLinked || serialConnected || isPixhawkLinked);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h2 className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">Live Telemetry</h2>
          {isPixhawkLinked ? (
            <span className="flex items-center gap-1 text-[9px] font-mono font-bold text-cyan-400 bg-cyan-500/15 border border-cyan-500/40 px-1.5 py-0.5 rounded">
              <Compass className="w-2.5 h-2.5" /> PIXHAWK LINKED
            </span>
          ) : isHwLinked ? (
            <span className="flex items-center gap-1 text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/40 px-1.5 py-0.5 rounded">
              <Usb className="w-2.5 h-2.5" /> HW LINKED
            </span>
          ) : null}
        </div>
        <Activity className="w-3 h-3 text-cyan-500/50" />
      </div>
      
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded p-3">
        <div className="grid grid-cols-2 gap-y-4 gap-x-2">
          <DataPoint label="Altitude" value={isPixhawkLinked ? pixhawk.gps.altAGL : drone.telemetry.altitude} unit="m" />
          <DataPoint label="Speed" value={isPixhawkLinked ? pixhawk.telemetry.groundspeedKmh : drone.telemetry.speed} unit="km/h" />
          <DataPoint label="Heading" value={isPixhawkLinked ? Math.round(pixhawk.compass.headingDeg) : drone.telemetry.heading} unit="°" />
          <DataPoint label="Distance" value={drone.telemetry.distanceFromOperator.toFixed(2)} unit="km" />
          <DataPoint label="V. Speed" value={isPixhawkLinked ? `${pixhawk.telemetry.climbRateMs > 0 ? `+${pixhawk.telemetry.climbRateMs}` : pixhawk.telemetry.climbRateMs}` : (drone.telemetry.verticalSpeed > 0 ? `+${drone.telemetry.verticalSpeed}` : drone.telemetry.verticalSpeed)} unit="m/s" />
          <DataPoint label="Satellites" value={isPixhawkLinked ? `${pixhawk.gps.satCount} (${pixhawk.gps.fixType})` : drone.telemetry.satelliteCount} />
        </div>
        
        <div className="mt-4 pt-4 border-t border-zinc-800/60 flex justify-between items-center">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">Flight Mode</span>
          <span className="text-xs font-bold tracking-widest text-cyan-400">{isPixhawkLinked ? pixhawk.telemetry.flightMode : drone.flightMode}</span>
        </div>
      </div>
    </div>
  );
}
