import { useCurrencyStore } from '../store/currency.store';

export function useCurrencyFormatter() {
  const { currencies, rates, activeCurrencyCode } = useCurrencyStore();

  const localCurrency = currencies.find(c => c.isLocal);
  const activeCurrency =
    currencies.find(c => c.currencyCode === activeCurrencyCode) ?? localCurrency;

  const convert = (amountInLocal: number): number => {
    if (!activeCurrency || !localCurrency) return amountInLocal;
    if (activeCurrency.currencyCode === localCurrency.currencyCode) return amountInLocal;
    const rate = rates[activeCurrency.currencyCode];
    if (!rate || rate === 0) return amountInLocal;
    return amountInLocal / rate;
  };

  const fmt = (amountInLocal: number): string => {
    const converted = convert(amountInLocal);
    const symbol = activeCurrency?.symbol ?? '$';
    const locale = activeCurrency?.locale ?? 'es-CU';
    return `${symbol}${new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(converted)}`;
  };

  const fmtWithCode = (amountInLocal: number): string => {
    return `${fmt(amountInLocal)} ${activeCurrency?.currencyCode ?? ''}`.trim();
  };

  return {
    fmt,
    fmtWithCode,
    convert,
    activeCurrency,
    localCurrency,
    symbol: activeCurrency?.symbol ?? '$',
  };
}
