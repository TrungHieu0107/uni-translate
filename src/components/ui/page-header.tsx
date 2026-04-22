import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon: React.ReactNode;
  actions?: React.ReactNode;
}

export const PageHeader = ({ title, description, icon, actions }: PageHeaderProps) => {
  return (
    <div className="p-6 pb-2 border-b border-drac-border flex justify-between items-end bg-drac-bg-secondary/30">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-drac-accent">
          {icon}
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        </div>
        {description && (
          <p className="text-xs text-drac-text-secondary">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex gap-2">
          {actions}
        </div>
      )}
    </div>
  );
};
