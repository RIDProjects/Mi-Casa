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
        <label htmlFor={id} className="block text-sm font-medium text-on-surface-variant">
          {label}
        </label>
      )}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-sm">{symbol}</span>
        <input
          id={id}
          type="number"
          step="0.01"
          min="0"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full pl-10 pr-3 py-2 border rounded-lg text-sm bg-panel border-outline-variant text-on-surface placeholder-outline focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors ${error ? 'border-danger' : ''}`}
        />
      </div>
      {error && <p className="text-xs text-danger-ink">{error}</p>}
    </div>
  );
}
