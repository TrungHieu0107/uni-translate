import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  leftIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', error, leftIcon, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        <div className="relative group">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-drac-text-secondary transition-colors group-focus-within:text-drac-accent">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            className={`
              flex h-10 w-full rounded-md border bg-drac-bg-primary px-3 py-2 text-sm transition-all
              placeholder:text-drac-text-secondary/50
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-drac-accent/50 focus-visible:border-drac-accent
              disabled:cursor-not-allowed disabled:opacity-50
              ${leftIcon ? 'pl-10' : ''}
              ${error ? 'border-drac-danger ring-drac-danger/20' : 'border-drac-border'}
              ${className}
            `}
            {...props}
          />
        </div>
        {error && <span className="text-[10px] font-medium text-drac-danger px-1">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
