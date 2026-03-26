import React from 'react';
import clsx from 'clsx';

interface Props {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'blue' | 'green' | 'red' | 'yellow';
  subtitle?: string;
}

const colors = {
  blue: 'bg-primary-50 text-primary-600',
  green: 'bg-success-50 text-success-600',
  red: 'bg-danger-50 text-danger-600',
  yellow: 'bg-warning-50 text-warning-600',
};

export default function StatCard({ title, value, icon, color = 'blue', subtitle }: Props) {
  return (
    <div className="card flex items-start gap-4">
      {icon && (
        <div className={clsx('p-3 rounded-xl text-2xl', colors[color])}>
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}