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
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-fade-up rounded-[14px] border border-dashed border-outline-variant bg-surface-container-lowest/60 dark:bg-surface-container-low/60">
      <div className="w-16 h-16 rounded-2xl bg-surface-container-low dark:bg-surface-container border border-border-light shadow-premium flex items-center justify-center text-3xl mb-5">
        {emoji}
      </div>

      <h3 className="text-base font-semibold text-on-surface tracking-tight">{title}</h3>

      {description && (
        <p className="text-sm text-on-surface-variant mt-2 max-w-xs leading-relaxed">{description}</p>
      )}

      {action && (
        <button onClick={action.onClick} className="btn-primary mt-6">
          {action.label}
        </button>
      )}
    </div>
  );
}
