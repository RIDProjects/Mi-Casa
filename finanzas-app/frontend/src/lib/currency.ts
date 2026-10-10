import { useCurrencyStore } from '../store/currency.store';

const FALLBACK_LOCALE = 'es-ES';
const FORMAT_OPTIONS: Intl.NumberFormatOptions = {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
};
const formatterCache = new Map<string, Intl.NumberFormat>();

// Locales are free text in the currency settings; an invalid tag (e.g. "es_CU")
// makes Intl throw a RangeError, so fall back instead of crashing the page.
function getFormatter(locale: string | undefined | null): Intl.NumberFormat {
  const key = locale || FALLBACK_LOCALE;
  const cached = formatterCache.get(key);
  if (cached) return cached;
  let formatter: Intl.NumberFormat;
  try {
    formatter = new Intl.NumberFormat(key, FORMAT_OPTIONS);
  } catch {
    formatter = formatterCache.get(FALLBACK_LOCALE) ?? new Intl.NumberFormat(FALLBACK_LOCALE, FORMAT_OPTIONS);
    formatterCache.set(FALLBACK_LOCALE, formatter);
  }
  formatterCache.set(key, formatter);
  return formatter;
}

export function formatNumber(value: number, locale?: string | null): string {
  return getFormatter(locale).format(value);
}

type Rates = Record<string, number | null>;

/**
 * Units of local currency per 1 unit of `activeCode`. Returns 1 for the local
 * currency, and null when no usable rate exists (never invents one).
 */
export function resolveRate(
  activeCode: string | undefined | null,
  localCode: string | undefined | null,
  rates: Rates,
  override?: number | null,
): number | null {
  if (!activeCode || !localCode || activeCode === localCode) return 1;
  const valid = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;
  if (valid(override)) return override;
  const rate = rates[activeCode];
  return valid(rate) ? rate : null;
}

/** Converts an amount in `currencyCode` to local; unconverted when no rate exists. */
export function toLocalAmount(
  amount: number | string | null | undefined,
  currencyCode: string | null | undefined,
  localCode: string | undefined | null,
  rates: Rates,
): number {
  const value = Number(amount) || 0;
  if (!currencyCode || currencyCode === localCode) return value;
  const rate = rates[currencyCode];
  return typeof rate === 'number' && Number.isFinite(rate) && rate > 0 ? value * rate : value;
}

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
    return `${symbol}${formatNumber(converted, displayCurrency?.locale)}`;
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
