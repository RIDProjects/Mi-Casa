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

const colorMap: Record<NonNullable<StatCardProps['color']>, string> = {
  blue:   'bg-blue-50   dark:bg-blue-900/30   text-blue-600   dark:text-blue-400',
  green:  'bg-green-50  dark:bg-green-900/30  text-green-600  dark:text-green-400',
  red:    'bg-red-50    dark:bg-red-900/30    text-red-600    dark:text-red-400',
  yellow: 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
  purple: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  gray:   'bg-gray-100  dark:bg-gray-700      text-gray-600   dark:text-gray-300',
};

export default function StatCard({
  title,
  value,
  icon,
  color = 'blue',
  subtitle,
  trend,
  loading = false,
  onClick,
}: StatCardProps) {
  const isClickable = !!onClick;

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-3">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
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
        'bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex items-start gap-4 transition-all duration-150',
        isClickable && 'cursor-pointer hover:shadow-md hover:border-gray-200 dark:hover:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500',
      )}
    >
      {icon && (
        <div className={clsx('p-3 rounded-xl text-2xl shrink-0', colorMap[color])}>
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{title}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1 truncate">{value}</p>
        {subtitle && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtitle}</p>
        )}
        {trend && (
          <div className={clsx(
            'flex items-center gap-1 mt-1.5 text-xs font-medium',
            trend.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
          )}>
            {trend.isPositive
              ? <TrendingUp size={12} />
              : <TrendingDown size={12} />}
            <span>{Math.abs(trend.value).toFixed(1)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
