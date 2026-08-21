import React from 'react';
import clsx from 'clsx';
import { Skeleton } from './Skeleton';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray';
  subtitle?: string;
  loading?: boolean;
}

const iconColorMap: Record<NonNullable<StatCardProps['color']>, string> = {
  blue:   'icon-blue',
  green:  'icon-emerald',
  red:    'icon-red',
  yellow: 'icon-amber',
  purple: 'icon-purple',
  gray:   'bg-surface-variant text-on-surface-variant p-3 rounded-xl',
};

const valueColorMap: Record<NonNullable<StatCardProps['color']>, string> = {
  blue:   'text-primary',
  green:  'text-success',
  red:    'text-danger',
  yellow: 'text-warning',
  purple: 'text-primary',
  gray:   'text-on-surface',
};

export default function StatCard({
  title, value, icon, color = 'gray', subtitle, loading = false,
}: StatCardProps) {
  if (loading) {
    return (
      <div className="rounded-[14px] p-5 space-y-3 bg-surface-container-lowest border border-outline-variant">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-7 w-1/2" />
        <Skeleton className="h-2.5 w-2/3" />
      </div>
    );
  }

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-[14px] p-5 flex items-start gap-4">
      {icon && (
        <div className={clsx('shrink-0 text-xl', iconColorMap[color])}>
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-label-upper text-label-upper text-on-surface-variant uppercase">{title}</p>
        <p className={clsx('text-[22px] font-bold mt-1 truncate fin-number', valueColorMap[color])}>{value}</p>
        {subtitle && (
          <p className="font-caption text-caption text-outline mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
