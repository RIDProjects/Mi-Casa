import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, id, className, ...props }: InputProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={id} className="block text-[11px] font-semibold tracking-wide text-on-surface-variant uppercase mb-1.5">
          {label}
        </label>
      )}
      <input
        id={id}
        className={[
          'w-full min-h-[42px] px-3.5 py-2.5 bg-surface-container-lowest dark:bg-surface-container border rounded-[10px] shadow-soft hover:border-outline',
          'font-body-default text-body-default text-on-surface',
          'focus:ring-[3px] focus:ring-primary-container/20 outline-none transition-all',
          'placeholder:text-outline',
          error
            ? 'border-danger focus:border-danger focus:ring-danger/20'
            : 'border-outline-variant focus:border-primary-container',
          className ?? '',
        ].join(' ')}
        {...props}
      />
      {error && <p className="font-body-small text-body-small text-danger">{error}</p>}
      {hint && !error && <p className="font-body-small text-body-small text-outline">{hint}</p>}
    </div>
  );
}
