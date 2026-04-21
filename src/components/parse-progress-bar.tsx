import { ParseProgress } from "../hooks/use-parse-progress";
import { Database } from "lucide-react";

interface ParseProgressBarProps {
  progress: ParseProgress | null;
}

export function ParseProgressBar({ progress }: ParseProgressBarProps) {
  if (!progress) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-drac-bg-primary/20 backdrop-blur-[6px] animate-fade-in">
      <div className="w-[500px] bg-drac-bg-secondary/70 border border-drac-accent/30 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-8 flex flex-col gap-6 overflow-hidden relative backdrop-blur-2xl">
        {/* Decorative elements */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-drac-accent/10 rounded-full blur-3xl animate-pulse" />
        
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-drac-bg-primary border border-drac-accent/30 flex items-center justify-center shadow-lg">
              <Database size={24} className="text-drac-accent drop-shadow-[0_0_8px_rgba(189,147,249,0.5)]" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-drac-accent uppercase tracking-[0.3em] mb-1">System Parsing</span>
              <span className="text-lg font-bold text-drac-text-primary truncate max-w-[280px] tracking-tight">
                {progress.file_name}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-3xl font-black text-drac-accent tabular-nums drop-shadow-[0_0_10px_rgba(189,147,249,0.3)]">
              {Math.round(progress.percent)}%
            </span>
            <span className="text-[10px] font-bold text-drac-text-secondary/70 uppercase tracking-widest mt-1">
              {progress.sheets_done} / {progress.sheets_total} Sheets
            </span>
          </div>
        </div>

        <div className="relative h-2 w-full bg-drac-bg-primary/50 rounded-full overflow-hidden border border-drac-border/30 p-[2px]">
          <div 
            className="h-full bg-gradient-to-r from-drac-accent via-drac-purple to-drac-accent rounded-full transition-all duration-500 ease-out relative shadow-[0_0_15px_rgba(189,147,249,0.4)]"
            style={{ width: `${progress.percent}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          </div>
        </div>

        <div className="flex items-center justify-between px-1 relative z-10">
          <div className="flex items-center gap-2 group">
             <div className="w-1.5 h-1.5 bg-drac-success rounded-full animate-pulse shadow-[0_0_5px_rgba(80,250,123,0.5)]"></div>
             <span className="text-xs text-drac-text-secondary/80 font-medium italic">
               Active: <span className="text-drac-text-primary not-italic font-bold">{progress.current_sheet}</span>
             </span>
          </div>
          <span className="text-[9px] font-mono font-bold text-drac-text-secondary/40 tracking-widest uppercase">
            Optimization Mode Active
          </span>
        </div>

        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-drac-accent to-transparent opacity-20 animate-scanline" />
      </div>

      <style>{`
        @keyframes progress-indefinite {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
        .animate-progress-indefinite {
          animation: progress-indefinite 2s linear infinite;
        }
      `}</style>
    </div>
  );
}
