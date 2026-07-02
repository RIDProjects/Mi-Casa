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
    <div className="text-center py-16">
      <div className="text-5xl mb-4">{emoji}</div>
      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
