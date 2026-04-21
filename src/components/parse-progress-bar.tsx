import { ParseProgress } from "../hooks/use-parse-progress";
import { FileText, Database } from "lucide-react";

interface ParseProgressBarProps {
  progress: ParseProgress | null;
}

export function ParseProgressBar({ progress }: ParseProgressBarProps) {
  if (!progress) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-[450px] bg-drac-bg-secondary border border-drac-accent/30 rounded-xl shadow-2xl p-6 flex flex-col gap-5 overflow-hidden relative">
        {/* Animated background glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-drac-accent/10 rounded-full blur-3xl animate-pulse" />
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-drac-accent/20 text-drac-accent">
              <FileText size={20} className="animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-drac-text-primary truncate max-w-[250px]">
                {progress.file_name}
              </span>
              <span className="text-[10px] text-drac-text-secondary uppercase tracking-widest font-medium">
                Parsing Sheets...
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xl font-black text-drac-accent tabular-nums">
              {Math.round(progress.percent)}%
            </span>
            <span className="text-[10px] text-drac-text-secondary font-mono">
              {progress.sheets_done} / {progress.sheets_total}
            </span>
          </div>
        </div>

        <div className="relative h-3 w-full bg-drac-bg-primary rounded-full overflow-hidden border border-drac-border">
          <div 
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-drac-accent to-drac-accent-hover transition-all duration-300 ease-out flex items-center justify-end px-1"
            style={{ width: `${progress.percent}%` }}
          >
            <div className="w-1 h-1 bg-white rounded-full animate-ping" />
          </div>
          
          {/* Subtle striped pattern on top */}
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-[length:20px_20px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>

        <div className="flex items-center gap-2 px-1">
          <Database size={12} className="text-drac-accent/70" />
          <span className="text-xs text-drac-text-secondary truncate italic">
            Current: <span className="text-drac-text-primary not-italic font-medium">{progress.current_sheet}</span>
          </span>
        </div>

        <div className="absolute bottom-0 left-0 h-1 bg-drac-accent animate-progress-indefinite w-1/3 opacity-30" />
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
