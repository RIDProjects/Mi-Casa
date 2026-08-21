import React from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

/**
 * Compact inline banner used inside dashboard/section cards when a query
 * fails, so the failure is visible instead of the section silently
 * disappearing.
 */
export function ErrorState({ message = 'No se pudo cargar esta sección', onRetry }: ErrorStateProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 px-4 py-3">
      <div className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="w-4 h-4 text-danger shrink-0" />
        <p className="text-sm text-danger truncate">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 text-xs font-medium text-danger hover:opacity-80 shrink-0"
        >
          <RotateCw className="w-3.5 h-3.5" /> Reintentar
        </button>
      )}
    </div>
  );
}
