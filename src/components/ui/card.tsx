import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'outline';
}

export const Card = ({ className = '', variant = 'default', ...props }: CardProps) => {
  const variants = {
    default: 'bg-drac-bg-secondary border-drac-border',
    glass: 'bg-drac-bg-primary/80 backdrop-blur-md border-drac-border/50',
    outline: 'bg-transparent border-drac-border',
  };

  return (
    <div
      className={`rounded-xl border shadow-xl overflow-hidden transition-all duration-300 ${variants[variant]} ${className}`}
      {...props}
    />
  );
};

export const CardHeader = ({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props} />
);

export const CardTitle = ({ className = '', ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={`text-xl font-bold leading-none tracking-tight text-drac-text-primary ${className}`} {...props} />
);

export const CardContent = ({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`p-6 pt-0 ${className}`} {...props} />
);

export const CardFooter = ({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`flex items-center p-6 pt-0 ${className}`} {...props} />
);
