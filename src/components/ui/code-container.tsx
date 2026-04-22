import React from 'react';
import { Terminal } from 'lucide-react';

interface CodeContainerProps {
  title: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  dotColor?: string;
}

export const CodeContainer = ({ 
  title, 
  icon = <Terminal size={12} />, 
  actions, 
  children, 
  className = '', 
  headerClassName = '',
  dotColor
}: CodeContainerProps) => {
  return (
    <div className={`flex flex-col bg-drac-bg-secondary rounded-xl border border-drac-border overflow-hidden shadow-lg group focus-within:border-drac-accent/50 transition-colors ${className}`}>
      <div className={`px-4 py-2 bg-drac-bg-tertiary/50 border-b border-drac-border flex items-center justify-between ${headerClassName}`}>
        <div className="flex items-center gap-2">
          {dotColor && <div className={`w-2 h-2 rounded-full ${dotColor}`} />}
          <span className="text-[10px] font-bold uppercase tracking-widest text-drac-text-secondary flex items-center gap-2">
            {icon}
            {title}
          </span>
        </div>
        {actions}
      </div>
      <div className="flex-1 flex flex-col min-h-0 relative">
        {children}
      </div>
    </div>
  );
};
