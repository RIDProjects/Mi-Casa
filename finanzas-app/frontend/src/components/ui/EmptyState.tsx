import React from 'react';

interface EmptyStateProps {
  emoji: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ emoji, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-up">
      {/* Gradient icon container */}
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 dark:from-white/[0.06] dark:to-white/[0.02] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center text-3xl mb-5"
        style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)' }}>
        {emoji}
      </div>

      <h3 className="text-base font-semibold text-gray-900 dark:text-white tracking-tight">{title}</h3>

      {description && (
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-2 max-w-xs leading-relaxed">{description}</p>
      )}

      {action && (
        <button
          onClick={action.onClick}
          className="btn-primary mt-6 text-sm"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
