import { renderHook } from '@testing-library/react';
import { useCurrencyFormatter, formatNumber, resolveRate, toLocalAmount } from '../currency';
import { useCurrencyStore } from '../../store/currency.store';

const cup = { id: '1', currencyCode: 'CUP', currencyName: 'Peso', symbol: 'CUP$', locale: 'en-US', isLocal: true, isActive: true };
const usd = { id: '2', currencyCode: 'USD', currencyName: 'Dollar', symbol: 'US$', locale: 'en-US', isLocal: false, isActive: true };

const setup = (rates: Record<string, number | null>, activeCurrencyCode = 'USD') => {
  useCurrencyStore.setState({ currencies: [cup, usd], rates, activeCurrencyCode });
  return renderHook(() => useCurrencyFormatter()).result.current;
};

describe('useCurrencyFormatter', () => {
  it('converts local amounts using the active currency rate', () => {
    const f = setup({ CUP: 1, USD: 400 });
    expect(f.convert(800)).toBe(2);
    expect(f.fmt(800)).toBe('US$2');
  });

  it('shows the original local amount when the active currency has a null rate', () => {
    const f = setup({ CUP: 1, USD: null });
    expect(f.convert(800)).toBe(800);
    expect(f.fmt(800)).toBe('CUP$800');
    expect(f.fmtWithCode(800)).toBe('CUP$800 CUP');
    expect(f.symbol).toBe('CUP$');
  });

  it('shows the original local amount when the active currency has no rate entry', () => {
    const f = setup({ CUP: 1 });
    expect(f.fmt(800)).toBe('CUP$800');
  });

  it('keeps the local currency at rate 1', () => {
    const f = setup({ CUP: 1, USD: 400 }, 'CUP');
    expect(f.fmt(800)).toBe('CUP$800');
  });
});

describe('invalid locales', () => {
  it('formatNumber does not throw on a malformed locale and falls back', () => {
    expect(() => formatNumber(1234.5, 'es_CU')).not.toThrow();
    expect(formatNumber(1234.5, 'es_CU')).toBe(formatNumber(1234.5, 'es-ES'));
    expect(() => formatNumber(1, '')).not.toThrow();
  });

  it('fmt does not crash when the currency locale is invalid', () => {
    useCurrencyStore.setState({
      currencies: [{ ...cup, locale: 'es_CU' }], rates: {}, activeCurrencyCode: 'CUP',
    });
    const f = renderHook(() => useCurrencyFormatter()).result.current;
    expect(() => f.fmt(10)).not.toThrow();
    expect(f.fmt(10)).toBe('CUP$10');
  });
});

describe('default currency follows the local currency', () => {
  it('uses the local currency when no active currency is set', () => {
    const f = setup({ CUP: 1, USD: 400 }, '');
    expect(f.activeCurrency?.currencyCode).toBe('CUP');
    expect(f.fmt(5)).toBe('CUP$5');
  });

  it('the store no longer hardcodes CUP as the initial active currency', () => {
    expect(useCurrencyStore.getInitialState().activeCurrencyCode).toBe('');
  });
});

describe('resolveRate', () => {
  const rates = { USD: 125, EUR: null as number | null };
  it('is 1 for the local currency or no active code', () => {
    expect(resolveRate('CUP', 'CUP', rates)).toBe(1);
    expect(resolveRate('', 'CUP', rates)).toBe(1);
  });
  it('returns the configured rate', () => {
    expect(resolveRate('USD', 'CUP', rates)).toBe(125);
  });
  it('prefers a valid manual override', () => {
    expect(resolveRate('USD', 'CUP', rates, 200)).toBe(200);
  });
  it('returns null (no fake rate) when missing or null', () => {
    expect(resolveRate('EUR', 'CUP', rates)).toBeNull();
    expect(resolveRate('GBP', 'CUP', rates)).toBeNull();
    expect(resolveRate('USD', 'CUP', {})).toBeNull();
  });
});

describe('toLocalAmount', () => {
  it('multiplies by the rate and coerces decimal strings', () => {
    expect(toLocalAmount('10.50', 'USD', 'CUP', { USD: 100 })).toBe(1050);
  });
  it('leaves local and unknown-currency amounts unconverted', () => {
    expect(toLocalAmount(5, 'CUP', 'CUP', { USD: 100 })).toBe(5);
    expect(toLocalAmount(5, null, 'CUP', { USD: 100 })).toBe(5);
    expect(toLocalAmount(5, 'EUR', 'CUP', { EUR: null })).toBe(5);
  });
});
