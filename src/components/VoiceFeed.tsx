import { Mic, Volume2, Radio } from "lucide-react";
import { useDRS } from "../store";
import { cn } from "../lib/utils";

export function VoiceFeed() {
  const { selectedDrone } = useDRS();

  return (
    <div className="flex flex-col gap-3 mt-4">
      <h2 className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">Comm Link</h2>
      
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded p-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-500" />
            <span className="text-xs font-mono text-zinc-300">UHF 433.2 MHz</span>
          </div>
          <div className="flex gap-1">
             <div className="w-1 h-3 bg-cyan-500 rounded-sm"></div>
             <div className="w-1 h-3 bg-cyan-500 rounded-sm"></div>
             <div className="w-1 h-3 bg-cyan-500 rounded-sm"></div>
             <div className="w-1 h-3 bg-cyan-500/30 rounded-sm"></div>
          </div>
        </div>

        <div className="flex gap-2">
          <button className="flex-1 flex items-center justify-center gap-2 py-2 bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700 rounded transition-colors active:bg-cyan-500/20 active:border-cyan-500/50 group">
            <Mic className="w-4 h-4 text-zinc-400 group-active:text-cyan-400" />
            <span className="text-xs font-bold tracking-widest text-zinc-300 group-active:text-cyan-400 uppercase">PTT</span>
          </button>
          <button className="flex items-center justify-center w-10 bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700 rounded transition-colors">
            <Volume2 className="w-4 h-4 text-emerald-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
