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
        <label htmlFor={id} className="block font-label-upper text-label-upper text-on-surface-variant uppercase mb-1.5">
          {label}
        </label>
      )}
      <input
        id={id}
        className={[
          'w-full px-4 py-3 bg-surface-container-lowest border rounded-xl',
          'font-body-default text-body-default text-on-surface',
          'focus:ring-1 outline-none transition-all',
          'placeholder:text-outline',
          error
            ? 'border-danger focus:border-danger focus:ring-danger'
            : 'border-outline-variant focus:border-primary focus:ring-primary',
          className ?? '',
        ].join(' ')}
        {...props}
      />
      {error && <p className="font-body-small text-body-small text-danger">{error}</p>}
      {hint && !error && <p className="font-body-small text-body-small text-outline">{hint}</p>}
    </div>
  );
}
