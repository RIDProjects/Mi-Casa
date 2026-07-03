import { useCurrencyStore } from '../store/currency.store';

export function useCurrencyFormatter() {
  const { currencies, rates, activeCurrencyCode } = useCurrencyStore();

  const baseCurrency = currencies.find(c => c.isBase);
  const activeCurrency =
    currencies.find(c => c.currencyCode === activeCurrencyCode) ?? baseCurrency;

  const convert = (amountInBase: number): number => {
    if (!activeCurrency || !baseCurrency) return amountInBase;
    if (activeCurrency.currencyCode === baseCurrency.currencyCode) return amountInBase;
    const rate = rates[activeCurrency.currencyCode];
    if (!rate || rate === 0) return amountInBase;
    return amountInBase / rate;
  };

  const fmt = (amountInBase: number): string => {
    const converted = convert(amountInBase);
    const symbol = activeCurrency?.symbol ?? '$';
    const locale = activeCurrency?.locale ?? 'es-CU';
    return `${symbol}${new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(converted)}`;
  };

  const fmtWithCode = (amountInBase: number): string => {
    return `${fmt(amountInBase)} ${activeCurrency?.currencyCode ?? ''}`.trim();
  };

  return {
    fmt,
    fmtWithCode,
    convert,
    activeCurrency,
    baseCurrency,
    symbol: activeCurrency?.symbol ?? '$',
  };
}
