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
  gray:   'bg-surface-variant text-on-surface-variant p-2.5 rounded-[10px]',
};

const valueColorMap: Record<NonNullable<StatCardProps['color']>, string> = {
  blue:   'text-info-ink',
  green:  'text-ok-ink',
  red:    'text-danger-ink',
  yellow: 'text-warn-ink',
  purple: 'text-info-ink',
  gray:   'text-on-surface',
};

export default function StatCard({
  title, value, icon, color = 'gray', subtitle, loading = false,
}: StatCardProps) {
  if (loading) {
    return (
      <div className="rounded-[14px] p-5 space-y-3 bg-surface-container-lowest border border-border-light shadow-soft">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-7 w-1/2" />
        <Skeleton className="h-2.5 w-2/3" />
      </div>
    );
  }

  return (
    <div className="animate-stat group bg-surface-container-lowest dark:bg-surface-container-low border border-border-light rounded-[14px] p-4 sm:p-5 flex flex-col sm:flex-row items-start gap-2.5 sm:gap-4 shadow-soft transition-all duration-200 hover:shadow-lift hover:-translate-y-0.5">
      {icon && (
        <div className={clsx('shrink-0 text-xl', iconColorMap[color])}>
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0 w-full">
        <p className="font-label-upper text-label-upper text-on-surface-variant uppercase">{title}</p>
        <p className={clsx('text-[20px] sm:text-[24px] leading-tight font-bold mt-1 sm:mt-1.5 truncate fin-number', valueColorMap[color])}>{value}</p>
        {subtitle && (
          <p className="font-caption text-caption text-outline mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
