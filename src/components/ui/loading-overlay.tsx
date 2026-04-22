import { Loader2 } from 'lucide-react';

interface LoadingOverlayProps {
  isVisible: boolean;
  title?: string;
  subtitle?: string;
  blur?: 'sm' | 'md' | 'lg';
}

export const LoadingOverlay = ({ isVisible, title = 'Loading...', subtitle, blur = 'md' }: LoadingOverlayProps) => {
  if (!isVisible) return null;

  const blurLevels = {
    sm: 'backdrop-blur-[2px]',
    md: 'backdrop-blur-[4px]',
    lg: 'backdrop-blur-[8px]',
  };

  return (
    <div className={`absolute inset-0 bg-drac-bg-secondary/10 ${blurLevels[blur]} z-[60] flex items-center justify-center animate-fade-in pointer-events-none`}>
      <div className="bg-drac-bg-primary/70 p-8 rounded-3xl border border-drac-accent/40 shadow-2xl backdrop-blur-2xl flex flex-col items-center gap-4">
        <div className="relative">
          <Loader2 className="text-drac-accent animate-spin" size={32} />
          <div className="absolute inset-0 bg-drac-accent/20 blur-xl animate-pulse"></div>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black tracking-[0.5em] text-drac-accent animate-pulse uppercase">
            {title}
          </span>
          {subtitle && (
            <span className="text-[8px] font-bold text-drac-text-secondary/50 tracking-widest uppercase mt-1">
              {subtitle}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
