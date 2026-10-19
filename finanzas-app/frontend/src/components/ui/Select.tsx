import React from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  placeholder?: string;
}

export function Select({ label, error, hint, placeholder, id, className, children, ...props }: SelectProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={id} className="block text-[11px] font-semibold tracking-wide text-on-surface-variant uppercase mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={id}
          className={[
            'w-full min-h-[42px] px-3.5 py-2.5 bg-surface-container-lowest dark:bg-surface-container border rounded-[10px] shadow-soft hover:border-outline appearance-none',
            'font-body-default text-body-default text-on-surface',
            'focus:ring-[3px] focus:ring-primary-container/20 outline-none transition-all',
            error
              ? 'border-danger focus:border-danger focus:ring-danger/20'
              : 'border-outline-variant focus:border-primary-container',
            className ?? '',
          ].join(' ')}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {children}
        </select>
        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-outline"
        />
      </div>
      {error && <p className="font-body-small text-body-small text-danger">{error}</p>}
      {hint && !error && <p className="font-body-small text-body-small text-outline">{hint}</p>}
    </div>
  );
}
