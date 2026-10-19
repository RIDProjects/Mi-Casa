import React from 'react';

interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: string;
  action?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between pb-6 mb-8 border-b border-border-light">
      <div className="min-w-0">
        <h1 className="font-page-title text-page-title text-on-surface tracking-tight flex items-center gap-3">
          {title}
        </h1>
        {subtitle && (
          <p className="font-body-default text-body-default text-on-surface-variant mt-1.5 max-w-2xl">{subtitle}</p>
        )}
      </div>
      {action && <div className="flex flex-wrap items-center gap-3 sm:shrink-0">{action}</div>}
    </div>
  );
}
