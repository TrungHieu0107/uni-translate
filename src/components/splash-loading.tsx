import { Database, Cpu, Sparkles } from "lucide-react";

export function SplashLoading() {
  return (
    <div className="fixed inset-0 z-[100] bg-drac-bg-primary flex flex-col items-center justify-center overflow-hidden">
      {/* Premium Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-drac-accent/15 blur-[160px] rounded-full animate-pulse-glow"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-drac-purple/15 blur-[160px] rounded-full animate-pulse-glow" style={{ animationDelay: '2s' }}></div>
        
        {/* Animated Grid Lines */}
        <div className="absolute inset-0 opacity-[0.03]" 
             style={{ backgroundImage: 'linear-gradient(to right, #6272A4 1px, transparent 1px), linear-gradient(to bottom, #6272A4 1px, transparent 1px)', backgroundSize: '60px 60px' }}></div>
        
        {/* Rotating Geometric Shapes */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] border border-drac-accent/10 rounded-full animate-rotate-slow opacity-20"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] border border-drac-purple/10 rounded-full animate-rotate-slow opacity-15" style={{ animationDirection: 'reverse', animationDuration: '30s' }}></div>
      </div>
      
      <div className="relative z-10 flex flex-col items-center">
        {/* Central Component with Glassmorphism */}
        <div className="relative mb-16">
          {/* Ambient Glows */}
          <div className="absolute inset-[-40px] bg-drac-accent/20 blur-[60px] rounded-full animate-pulse opacity-40"></div>
          
          {/* Floating Ring */}
          <div className="absolute inset-[-30px] border border-drac-accent/20 rounded-[40px] animate-rotate-slow" style={{ borderRadius: '45% 55% 70% 30% / 30% 40% 60% 70%' }}></div>
          
          {/* Main Logo Container */}
          <div className="relative w-40 h-40 flex items-center justify-center">
            {/* Morphing Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-drac-accent/30 via-drac-purple/30 to-transparent rounded-[35%] animate-blob shadow-[0_0_50px_rgba(189,147,249,0.2)]"></div>
            
            {/* Inner Glass Layer */}
            <div className="absolute inset-3 bg-drac-bg-secondary/40 backdrop-blur-2xl border border-drac-border/50 rounded-3xl rotate-6 shadow-2xl"></div>
            <div className="absolute inset-3 bg-drac-bg-secondary/40 backdrop-blur-2xl border border-drac-border/30 rounded-3xl -rotate-3"></div>
            
            {/* Core Icon */}
            <div className="relative z-20 w-24 h-24 bg-drac-bg-primary rounded-2xl border border-drac-accent/40 shadow-inner flex items-center justify-center group overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-drac-accent/20 via-transparent to-transparent animate-pulse"></div>
              <Database className="text-drac-accent drop-shadow-[0_0_15px_rgba(189,147,249,0.8)]" size={48} />
              
              {/* Scanline Effect */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-drac-accent/10 to-transparent h-1/2 w-full animate-scanline pointer-events-none"></div>
            </div>
          </div>
          
          {/* Status Dots */}
          <div className="absolute -top-4 -right-4 flex gap-1">
             <div className="w-2 h-2 bg-drac-success rounded-full shadow-[0_0_8px_rgba(80,250,123,0.8)] animate-pulse"></div>
             <div className="w-2 h-2 bg-drac-accent rounded-full shadow-[0_0_8px_rgba(189,147,249,0.8)] animate-pulse" style={{ animationDelay: '0.3s' }}></div>
          </div>
        </div>
        
        {/* Branding Section */}
        <div className="flex flex-col items-center gap-8 animate-slide-up">
          <div className="relative group">
            <h1 className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-drac-text-primary to-drac-text-primary/40 flex items-center gap-1">
              UNI-TRANSLATE
              <div className="flex flex-col">
                <span className="text-xs tracking-[0.6em] text-drac-accent ml-2 font-bold mb-[-8px]">SYSTEMS</span>
                <span className="text-3xl italic bg-drac-accent text-drac-bg-primary px-3 py-0 rounded-sm transform -skew-x-12 ml-2 shadow-[4px_4px_0_#44475a]">
                  SQL
                </span>
              </div>
            </h1>
          </div>
          
          {/* Progress Indicator */}
          <div className="flex flex-col items-center gap-4 w-72">
            <div className="relative w-full h-1.5 bg-drac-bg-tertiary rounded-full overflow-hidden shadow-inner">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-drac-accent/20 to-transparent animate-shimmer"></div>
              <div className="h-full bg-gradient-to-r from-drac-accent via-drac-purple to-drac-accent animate-loading-bar-smooth shadow-[0_0_15px_rgba(189,147,249,0.6)]"></div>
            </div>
            
            <div className="flex items-center gap-3 px-4 py-2 bg-drac-bg-secondary/50 rounded-full border border-drac-border/30 backdrop-blur-md">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-drac-accent rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-1.5 h-1.5 bg-drac-accent rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-1.5 h-1.5 bg-drac-accent rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-drac-text-secondary mix-blend-plus-lighter">
                Synchronizing Core Indices
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer System Info */}
      <div className="absolute bottom-12 flex flex-col items-center gap-4 animate-slide-up" style={{ animationDelay: '0.6s' }}>
        <div className="flex items-center gap-8 opacity-40">
           <div className="flex items-center gap-2">
              <Cpu size={14} className="text-drac-text-secondary" />
              <span className="text-[9px] font-bold tracking-widest uppercase">Multi-Threaded Parser</span>
           </div>
           <div className="w-1 h-1 bg-drac-border rounded-full"></div>
           <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-drac-accent" />
              <span className="text-[9px] font-bold tracking-widest uppercase">AI-Driven Detection</span>
           </div>
        </div>
        <div className="px-3 py-1 border border-drac-border/20 rounded text-[8px] font-mono font-black tracking-[0.4em] text-drac-text-secondary/30 uppercase">
          Build v0.1.0-beta.neural • Antigravity Engine
        </div>
      </div>
    </div>
  );
}
