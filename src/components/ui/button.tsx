import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', isLoading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-all duration-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-drac-accent disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]';
    
    const variants = {
      primary: 'bg-drac-bg-secondary text-drac-text-primary border border-drac-border hover:bg-drac-bg-tertiary hover:border-drac-accent/50 shadow-sm',
      secondary: 'bg-drac-bg-tertiary text-drac-text-primary hover:bg-[#6272A4] border border-transparent',
      ghost: 'bg-transparent text-drac-text-secondary hover:bg-drac-accent/10 hover:text-drac-accent',
      danger: 'bg-drac-danger-bg text-drac-danger border border-drac-danger/30 hover:bg-drac-danger/20',
      accent: 'bg-drac-accent text-drac-bg-primary hover:bg-drac-accent-hover shadow-[0_0_15px_rgba(189,147,249,0.3)] hover:shadow-[0_0_20px_rgba(189,147,249,0.5)]',
      success: 'bg-drac-success/20 text-drac-success border border-drac-success/30 hover:bg-drac-success/30',
    };

    const sizes = {
      xs: 'h-7 px-2 text-[10px] uppercase tracking-wider font-bold',
      sm: 'h-8 px-3 text-xs',
      md: 'h-10 px-4 text-sm',
      lg: 'h-12 px-6 text-base',
      icon: 'h-10 w-10',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : leftIcon ? (
          <span className="mr-2">{leftIcon}</span>
        ) : null}
        {children}
        {!isLoading && rightIcon ? <span className="ml-2">{rightIcon}</span> : null}
      </button>
    );
  }
);

Button.displayName = 'Button';
