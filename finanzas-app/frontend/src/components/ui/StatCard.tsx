import React from 'react';
import clsx from 'clsx';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Skeleton } from './Skeleton';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray';
  subtitle?: string;
  trend?: { value: number; isPositive: boolean };
  loading?: boolean;
  onClick?: () => void;
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
  title, value, icon, color = 'gray', subtitle, trend, loading = false, onClick,
}: StatCardProps) {
  const isClickable = !!onClick;

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
    <div
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(); } : undefined}
      className={clsx(
        'bg-surface-container-lowest border border-outline-variant rounded-[14px] p-5 flex items-start gap-4',
        isClickable && 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary',
      )}
      style={{
        transition: 'transform 120ms ease-out, box-shadow 150ms ease-out',
      }}
      onMouseEnter={isClickable ? (e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'inset 0 0 0 1px rgba(37,99,235,0.18)';
      } : undefined}
      onMouseLeave={isClickable ? (e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
      } : undefined}
      onMouseDown={isClickable ? (e) => {
        (e.currentTarget as HTMLElement).style.transform = 'scale(0.98)';
      } : undefined}
      onMouseUp={isClickable ? (e) => {
        (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
      } : undefined}
    >
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
        {trend && (
          <div className={clsx(
            'flex items-center gap-1 mt-2 font-body-small text-body-small font-semibold',
            trend.isPositive ? 'text-success' : 'text-danger',
          )}>
            {trend.isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            <span>{Math.abs(trend.value).toFixed(1)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
