import React from 'react';

export type BadgeVariant = 'green' | 'red' | 'amber' | 'blue' | 'gray' | 'purple' | 'yellow';

const variants: Record<BadgeVariant, string> = {
  green:  'bg-success/10 text-ok-ink',
  red:    'bg-danger/10 text-danger-ink',
  amber:  'bg-warning/10 text-warn-ink',
  yellow: 'bg-warning/10 text-warn-ink',
  blue:   'bg-primary-container/10 text-info-ink',
  gray:   'bg-surface-variant text-on-surface-variant',
  purple: 'bg-primary-container/10 text-info-ink',
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'gray', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-label-upper text-label-upper px-2.5 py-1 rounded-full whitespace-nowrap before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-current ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
