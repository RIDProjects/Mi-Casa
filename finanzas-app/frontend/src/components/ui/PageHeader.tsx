import React from 'react';

interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: string;
  action?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="font-page-title text-page-title text-primary flex items-center gap-2">
          {title}
        </h1>
        {subtitle && (
          <p className="font-body-default text-body-default text-on-surface-variant mt-1">{subtitle}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
