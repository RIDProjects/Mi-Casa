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
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          {title}
        </h1>
        {body && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{body}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
