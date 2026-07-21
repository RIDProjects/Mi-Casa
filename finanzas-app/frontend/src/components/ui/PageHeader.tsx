import React from 'react';

interface PageHeaderProps {
  title: React.ReactNode;
  description?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export default function PageHeader({ title, description, subtitle, action }: PageHeaderProps) {
  const body = subtitle ?? description;
  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="font-page-title text-page-title text-primary flex items-center gap-2">
          {title}
        </h1>
        {body && (
          <p className="font-body-default text-body-default text-on-surface-variant mt-1">{body}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
