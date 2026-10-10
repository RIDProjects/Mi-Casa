import { useCurrencyStore } from '../store/currency.store';

export function useCurrencyFormatter() {
  const { currencies, rates, activeCurrencyCode } = useCurrencyStore();

  const localCurrency = currencies.find(c => c.isLocal);
  const activeCurrency =
    currencies.find(c => c.currencyCode === activeCurrencyCode) ?? localCurrency;

  // A missing/zero rate means we cannot convert: fall back to showing the
  // amount in the local currency rather than a wrong conversion.
  const activeRate =
    activeCurrency && localCurrency && activeCurrency.currencyCode !== localCurrency.currencyCode
      ? rates[activeCurrency.currencyCode]
      : 1;
  const canConvert = !!activeRate;
  const displayCurrency = canConvert ? activeCurrency : localCurrency ?? activeCurrency;

  const convert = (amountInLocal: number): number => {
    if (!canConvert || !activeRate) return amountInLocal;
    return amountInLocal / activeRate;
  };

  const fmt = (amountInLocal: number): string => {
    const converted = convert(amountInLocal);
    const symbol = displayCurrency?.symbol ?? '$';
    const locale = displayCurrency?.locale ?? 'es-CU';
    return `${symbol}${new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(converted)}`;
  };

  const fmtWithCode = (amountInLocal: number): string => {
    return `${fmt(amountInLocal)} ${displayCurrency?.currencyCode ?? ''}`.trim();
  };

  return {
    fmt,
    fmtWithCode,
    convert,
    activeCurrency,
    localCurrency,
    symbol: displayCurrency?.symbol ?? '$',
  };
}
