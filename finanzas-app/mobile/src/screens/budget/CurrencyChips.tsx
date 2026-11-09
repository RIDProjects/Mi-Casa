import React from 'react';
import ChipSelector from './ChipSelector';

interface Props {
  currencies?: { code: string; symbol: string }[];
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
}

/** Currency picker for budget lines; hidden when the house has a single currency. */
export default function CurrencyChips({ currencies, value, onChange, disabled }: Props) {
  if (!currencies || currencies.length < 2) return null;
  return (
    <ChipSelector
      label="Moneda"
      options={currencies.map((c) => ({ value: c.code, label: c.code }))}
      value={value}
      onChange={onChange}
      disabled={disabled}
    />
  );
}
