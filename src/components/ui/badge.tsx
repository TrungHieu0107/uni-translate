import React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'accent' | 'info' | 'success' | 'danger' | 'outline';
}

export const Badge = ({ className = '', variant = 'default', ...props }: BadgeProps) => {
  const variants = {
    default: 'bg-drac-bg-tertiary text-drac-text-primary border-transparent',
    accent: 'bg-drac-accent/20 text-drac-accent border-drac-accent/30',
    info: 'bg-drac-text-secondary/20 text-drac-text-secondary border-drac-text-secondary/30',
    success: 'bg-drac-success-bg text-drac-success border-drac-success/30',
    danger: 'bg-drac-danger-bg text-drac-danger border-drac-danger/30',
    outline: 'bg-transparent text-drac-text-primary border-drac-border',
  };

  return (
    <div
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-drac-accent ${variants[variant]} ${className}`}
      {...props}
    />
  );
};
