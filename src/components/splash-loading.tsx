import { Loader2 } from "lucide-react";

export function SplashLoading() {
  return (
    <div className="fixed inset-0 z-[100] bg-drac-bg-primary flex flex-col items-center justify-center animate-fade-in">
      <div className="relative flex flex-col items-center">
        {/* Decorative background glow */}
        <div className="absolute inset-0 bg-drac-accent/20 blur-[100px] rounded-full animate-pulse"></div>
        
        <div className="relative z-10 flex flex-col items-center gap-8">
          {/* Logo/Icon animation */}
          <div className="relative">
            <div className="absolute inset-0 border-2 border-drac-accent rounded-full animate-ping opacity-25"></div>
            <div className="w-24 h-24 rounded-full bg-drac-bg-secondary border-2 border-drac-border flex items-center justify-center shadow-2xl">
              <Loader2 className="text-drac-accent animate-spin" size={48} />
            </div>
          </div>
          
          <div className="flex flex-col items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tighter text-drac-text-primary">
              UNI-TRANSLATE <span className="text-drac-accent">SQL</span>
            </h1>
            <div className="flex items-center gap-3">
              <div className="h-1 w-12 bg-drac-accent/20 rounded-full overflow-hidden">
                <div className="h-full bg-drac-accent animate-loading-bar"></div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-drac-text-secondary animate-pulse">
                Initializing System
              </span>
              <div className="h-1 w-12 bg-drac-accent/20 rounded-full overflow-hidden">
                <div className="h-full bg-drac-accent animate-loading-bar"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Version or credit footer */}
      <div className="absolute bottom-10 text-[10px] font-mono text-drac-text-secondary/50">
        POWERED BY ANTIGRAVITY ENGINE v2.0
      </div>
    </div>
  );
}
