import { useCurrencyStore } from '../store/currency.store';

const SYMBOLS: Record<string, string> = { ARS: '$', USD: 'US$', CUP: 'CUP$' };
const LOCALES: Record<string, string> = { ARS: 'es-AR', USD: 'en-US', CUP: 'es-CU' };

export function useCurrencyFormatter() {
  const { activeCurrency, rates } = useCurrencyStore();

  const convert = (amountARS: number): number => {
    if (activeCurrency === 'ARS') return amountARS;
    if (activeCurrency === 'USD') return amountARS / rates.USD;
    if (activeCurrency === 'CUP') return amountARS / rates.CUP;
    return amountARS;
  };

  const fmt = (amountARS: number): string => {
    const converted = convert(amountARS);
    return `${SYMBOLS[activeCurrency]}${new Intl.NumberFormat(LOCALES[activeCurrency], { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(converted)}`;
  };

  return { fmt, convert, activeCurrency, symbol: SYMBOLS[activeCurrency] };
}
