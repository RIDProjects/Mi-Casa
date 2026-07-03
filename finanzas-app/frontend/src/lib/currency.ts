import { useCurrencyStore } from '../store/currency.store';

const SYMBOLS: Record<string, string> = { CUP: '$', MLC: 'MLC$', USD: 'US$' };
const LOCALES: Record<string, string> = { CUP: 'es-CU', MLC: 'es-CU', USD: 'en-US' };

export function useCurrencyFormatter() {
  const { activeCurrency, rates } = useCurrencyStore();

  // amountCUP: value denominated in CUP (base currency)
  const convert = (amountCUP: number): number => {
    if (activeCurrency === 'CUP') return amountCUP;
    if (activeCurrency === 'MLC') return amountCUP / rates.MLC;
    if (activeCurrency === 'USD') return amountCUP / rates.USD;
    return amountCUP;
  };

  const fmt = (amountCUP: number): string => {
    const converted = convert(amountCUP);
    return `${SYMBOLS[activeCurrency]}${new Intl.NumberFormat(LOCALES[activeCurrency], { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(converted)}`;
  };

  return { fmt, convert, activeCurrency, symbol: SYMBOLS[activeCurrency] };
}
