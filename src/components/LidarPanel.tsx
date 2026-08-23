import { Radar } from "lucide-react";

export function LidarPanel() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <h2 className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">LiDAR Scan</h2>
        <Radar className="w-3 h-3 text-cyan-500/50" />
      </div>
      
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded p-3 flex flex-col items-center justify-center relative overflow-hidden h-32">
        <div className="absolute inset-0 flex items-center justify-center">
           <div className="w-24 h-24 rounded-full border border-cyan-500/20"></div>
           <div className="absolute w-16 h-16 rounded-full border border-cyan-500/30"></div>
           <div className="absolute w-8 h-8 rounded-full border border-cyan-500/40"></div>
           <div className="absolute w-1 h-1 rounded-full bg-cyan-400"></div>
           
           {/* Radar Sweep */}
           <div className="absolute w-24 h-24 rounded-full origin-center animate-[spin_3s_linear_infinite]" style={{
             background: 'conic-gradient(from 0deg, transparent 70%, rgba(6, 182, 212, 0.4) 100%)',
             borderRadius: '50%'
           }}></div>
           
           {/* Mock Obstacles */}
           <div className="absolute w-1 h-1 bg-rose-500 rounded-full top-6 left-6 shadow-[0_0_5px_#e11d48] animate-pulse"></div>
           <div className="absolute w-1 h-1 bg-amber-500 rounded-full bottom-8 right-10 shadow-[0_0_5px_#f59e0b]"></div>
        </div>
        
        <div className="absolute bottom-2 left-2 text-[8px] font-mono text-cyan-500 uppercase tracking-widest">
          Active Scan
        </div>
        <div className="absolute top-2 right-2 text-[8px] font-mono text-rose-500 uppercase tracking-widest">
          Obs: 4.2m
        </div>
      </div>
    </div>
  );
}
