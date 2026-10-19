import { fmt, fmtInt } from '../format';

describe('fmt', () => {
  it('drops the meaningless ",00" on large whole amounts', () => {
    expect(fmt(1254300)).toBe('1.254.300');
    expect(fmt(-2548900)).toBe('-2.548.900');
  });

  it('keeps two decimals on small or fractional amounts so cents stay aligned', () => {
    expect(fmt(20)).toBe('20,00');
    expect(fmt(17.94)).toBe('17,94');
    expect(fmt(1500.5)).toBe('1500,50');
  });

  it('treats empty values as zero', () => {
    expect(fmt(null)).toBe('0,00');
    expect(fmt(undefined)).toBe('0,00');
    expect(fmt('abc')).toBe('0,00');
  });
});

describe('fmtInt', () => {
  it('formats counters without decimals', () => {
    expect(fmtInt(128)).toBe('128');
  });
});
