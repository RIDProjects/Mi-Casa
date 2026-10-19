import React from 'react';
import { useCurrencyFormatter } from '../../lib/currency';

interface CurrencyInputProps {
  label?: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  error?: string;
}

export function CurrencyInput({ label, value, onChange, placeholder = '0.00', id, error }: CurrencyInputProps) {
  const { symbol } = useCurrencyFormatter();
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={id} className="block text-[11px] font-semibold tracking-wide text-on-surface-variant uppercase mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-sm font-medium pointer-events-none">{symbol}</span>
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          aria-invalid={!!error}
          className={`input fin-number !pl-9 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${error ? '!border-danger' : ''}`}
        />
      </div>
      {error && <p className="text-xs text-danger-ink">{error}</p>}
    </div>
  );
}
