import { Loader2, Database, Shield, Zap } from "lucide-react";

export function SplashLoading() {
  return (
    <div className="fixed inset-0 z-[100] bg-drac-bg-primary flex flex-col items-center justify-center overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-drac-accent/10 blur-[120px] rounded-full animate-pulse-glow"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-drac-text-secondary/10 blur-[120px] rounded-full animate-pulse-glow" style={{ animationDelay: '1.5s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100%] h-[100%] border border-drac-accent/5 rounded-full animate-rotate-slow opacity-20"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[70%] border border-drac-accent/5 rounded-full animate-rotate-slow opacity-10" style={{ animationDirection: 'reverse', animationDuration: '20s' }}></div>
      </div>
      
      <div className="relative z-10 flex flex-col items-center">
        {/* Central Logo Animation */}
        <div className="relative mb-12">
          {/* Outer Ring */}
          <div className="absolute inset-[-20px] border border-drac-accent/30 rounded-full animate-ping opacity-20"></div>
          
          {/* Hexagon/Circle Container */}
          <div className="relative w-32 h-32 flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-drac-accent/20 to-transparent rounded-3xl rotate-45 animate-pulse-glow"></div>
            <div className="absolute inset-2 bg-drac-bg-secondary border border-drac-border/50 rounded-2xl rotate-12 backdrop-blur-xl"></div>
            <div className="relative z-20 w-20 h-20 bg-drac-bg-primary rounded-xl border border-drac-accent/30 shadow-[0_0_30px_rgba(189,147,249,0.3)] flex items-center justify-center group overflow-hidden">
              <Database className="text-drac-accent animate-bounce" size={40} style={{ animationDuration: '3s' }} />
              <div className="absolute inset-0 bg-gradient-to-tr from-drac-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
          </div>
          
          {/* Orbiting Icons */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 animate-rotate-slow pointer-events-none">
             <div className="absolute top-0 left-1/2 -translate-x-1/2 p-2 bg-drac-bg-secondary border border-drac-border rounded-lg text-drac-text-secondary shadow-lg">
                <Shield size={16} />
             </div>
             <div className="absolute bottom-0 left-1/2 -translate-x-1/2 p-2 bg-drac-bg-secondary border border-drac-border rounded-lg text-drac-success shadow-lg">
                <Zap size={16} />
             </div>
          </div>
        </div>
        
        {/* Text Animation */}
        <div className="flex flex-col items-center gap-6 animate-slide-up">
          <div className="relative overflow-hidden">
            <h1 className="text-4xl font-bold tracking-[0.15em] text-drac-text-primary animate-letter-glow flex items-center">
              UNI-TRANSLATE
              <span className="ml-3 px-3 py-1 bg-drac-accent text-drac-bg-primary rounded-lg text-2xl font-black skew-x-[-12deg] shadow-[4px_4px_0px_#6272A4]">
                SQL
              </span>
            </h1>
          </div>
          
          {/* Progress Section */}
          <div className="flex flex-col items-center gap-3 w-64">
            <div className="w-full h-1 bg-drac-bg-tertiary/50 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-drac-accent via-drac-accent-hover to-drac-accent animate-loading-bar shadow-[0_0_10px_rgba(189,147,249,0.8)]"></div>
            </div>
            <div className="flex items-center gap-2">
              <Loader2 className="text-drac-accent animate-spin" size={14} />
              <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-drac-text-secondary/80 mix-blend-screen">
                Initializing Neural Core
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Particles/Glow Footer */}
      <div className="absolute bottom-12 flex flex-col items-center gap-2 animate-slide-up" style={{ animationDelay: '0.4s' }}>
        <div className="flex gap-4 opacity-30">
            <div className="w-1 h-1 bg-drac-accent rounded-full animate-ping"></div>
            <div className="w-1 h-1 bg-drac-accent rounded-full animate-ping" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-1 h-1 bg-drac-accent rounded-full animate-ping" style={{ animationDelay: '0.4s' }}></div>
        </div>
        <div className="text-[9px] font-mono font-bold tracking-[0.5em] text-drac-text-secondary/40">
          ANTIGRAVITY ENGINE 2.0 • PRODUCTION READY
        </div>
      </div>
    </div>
  );
}
