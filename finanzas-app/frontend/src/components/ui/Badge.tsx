import React from 'react';

export type BadgeVariant = 'green' | 'red' | 'amber' | 'blue' | 'gray' | 'purple' | 'yellow';

const variants: Record<BadgeVariant, string> = {
  green:  'bg-green-100  text-green-800  dark:bg-green-900/30  dark:text-green-300',
  red:    'bg-red-100    text-red-800    dark:bg-red-900/30    dark:text-red-300',
  amber:  'bg-amber-100  text-amber-800  dark:bg-amber-900/30  dark:text-amber-300',
  yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  blue:   'bg-blue-100   text-blue-800   dark:bg-blue-900/30   dark:text-blue-300',
  gray:   'bg-gray-100   text-gray-700   dark:bg-gray-700       dark:text-gray-300',
  purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'gray', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
