import React from 'react';

export type BadgeVariant = 'green' | 'red' | 'amber' | 'blue' | 'gray' | 'purple' | 'yellow';

const variants: Record<BadgeVariant, string> = {
  green:  'bg-success/10 text-success',
  red:    'bg-danger/10 text-danger',
  amber:  'bg-warning/10 text-warning',
  yellow: 'bg-warning/10 text-warning',
  blue:   'bg-primary/10 text-primary',
  gray:   'bg-surface-variant text-on-surface-variant',
  purple: 'bg-primary/10 text-primary',
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'gray', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center font-label-upper text-label-upper px-2.5 py-1 rounded-full ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
