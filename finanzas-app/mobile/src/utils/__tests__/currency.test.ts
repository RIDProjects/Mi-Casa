import { formatMoney } from '../currency';

describe('formatMoney', () => {
  describe('USD (default currency)', () => {
    it('formats a positive amount with thousands separator and 2 decimals', () => {
      expect(formatMoney(1234.5)).toBe('US$ 1,234.50');
    });

    it('formats a whole number with .00 decimals', () => {
      expect(formatMoney(100)).toBe('US$ 100.00');
    });

    it('formats zero as US$ 0.00', () => {
      expect(formatMoney(0)).toBe('US$ 0.00');
    });

    it('formats a negative amount', () => {
      expect(formatMoney(-50)).toBe('US$ -50.00');
    });

    it('rounds to 2 decimal places', () => {
      expect(formatMoney(1234.567)).toBe('US$ 1,234.57');
    });

    it('uses USD when currency is omitted', () => {
      expect(formatMoney(10)).toBe('US$ 10.00');
    });
  });

  describe('CUP', () => {
    it('formats a positive amount with the CUP suffix', () => {
      expect(formatMoney(1234.5, 'CUP')).toBe('1,234.50 CUP');
    });

    it('formats zero with the CUP suffix', () => {
      expect(formatMoney(0, 'CUP')).toBe('0.00 CUP');
    });

    it('formats a negative amount with the CUP suffix', () => {
      expect(formatMoney(-50, 'CUP')).toBe('-50.00 CUP');
    });
  });

  describe('guard against non-number input (Number(amount) || 0)', () => {
    // TypeORM/pg drivers return Postgres `decimal` columns as strings, not
    // numbers, at runtime -- even though the TS signature says `number`.
    // These tests confirm the helper never crashes or renders "NaN" in that
    // real-world scenario.
    it('parses a numeric string amount correctly (Postgres decimal column)', () => {
      expect(formatMoney('1234.56' as unknown as number)).toBe('US$ 1,234.56');
    });

    it('parses a numeric string with CUP currency', () => {
      expect(formatMoney('99.9' as unknown as number, 'CUP')).toBe('99.90 CUP');
    });

    it('falls back to 0 for a non-numeric string instead of NaN', () => {
      expect(formatMoney('abc' as unknown as number)).toBe('US$ 0.00');
    });

    it('falls back to 0 for undefined instead of NaN', () => {
      expect(formatMoney(undefined as unknown as number)).toBe('US$ 0.00');
    });

    it('falls back to 0 for null instead of NaN', () => {
      expect(formatMoney(null as unknown as number)).toBe('US$ 0.00');
    });

    it('falls back to 0 for an empty string instead of NaN', () => {
      // Number('') === 0, so this is falsy-safe by design, not by the || 0 guard.
      expect(formatMoney('' as unknown as number)).toBe('US$ 0.00');
    });

    it('never returns a string containing "NaN"', () => {
      const result = formatMoney('not-a-number' as unknown as number);
      expect(result).not.toContain('NaN');
    });
  });
});
