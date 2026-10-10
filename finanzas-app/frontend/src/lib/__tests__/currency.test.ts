import { renderHook } from '@testing-library/react';
import { useCurrencyFormatter } from '../currency';
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
