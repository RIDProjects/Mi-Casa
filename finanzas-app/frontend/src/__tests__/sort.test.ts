import { sortRows } from '../lib/sort';

const ids = (rows: { id: string }[]) => rows.map(r => r.id);

describe('sortRows', () => {
  it('orders numbers from largest to smallest and back', () => {
    const rows = [{ id: 'a', v: 10 }, { id: 'b', v: 300 }, { id: 'c', v: 45 }];
    expect(ids(sortRows(rows, r => r.v, 'desc'))).toEqual(['b', 'c', 'a']);
    expect(ids(sortRows(rows, r => r.v, 'asc'))).toEqual(['a', 'c', 'b']);
  });

  it('does not mutate the original array', () => {
    const rows = [{ v: 1 }, { v: 2 }];
    sortRows(rows, r => r.v, 'desc');
    expect(rows.map(r => r.v)).toEqual([1, 2]);
  });

  it('reads decimal strings as numbers (API decimals arrive as strings)', () => {
    const rows = [{ id: 'a', v: '9.50' }, { id: 'b', v: '100.00' }, { id: 'c', v: '1000' }];
    expect(ids(sortRows(rows, r => r.v, 'desc'))).toEqual(['c', 'b', 'a']);
  });

  it('orders text ignoring case and accents', () => {
    const rows = [{ id: 'a', v: 'zapato' }, { id: 'b', v: 'Árbol' }, { id: 'c', v: 'banco' }];
    expect(ids(sortRows(rows, r => r.v, 'asc'))).toEqual(['b', 'c', 'a']);
    expect(ids(sortRows(rows, r => r.v, 'desc'))).toEqual(['a', 'c', 'b']);
  });

  it('orders ISO dates chronologically', () => {
    const rows = [{ id: 'a', v: '2026-03-01' }, { id: 'b', v: '2025-12-31T10:00:00Z' }, { id: 'c', v: '2026-01-15' }];
    expect(ids(sortRows(rows, r => r.v, 'desc'))).toEqual(['a', 'c', 'b']);
    expect(ids(sortRows(rows, r => r.v, 'asc'))).toEqual(['b', 'c', 'a']);
  });

  it('keeps the original order of equal values (stable)', () => {
    const rows = [{ id: 'a', v: 5 }, { id: 'b', v: 5 }, { id: 'c', v: 5 }];
    expect(ids(sortRows(rows, r => r.v, 'desc'))).toEqual(['a', 'b', 'c']);
  });

  it('sends missing or invalid numbers to the end in both directions', () => {
    const rows = [{ id: 'a', v: null }, { id: 'b', v: 3 }, { id: 'c', v: undefined }, { id: 'd', v: 7 }];
    expect(ids(sortRows(rows, r => r.v as any, 'desc'))).toEqual(['d', 'b', 'a', 'c']);
    expect(ids(sortRows(rows, r => r.v as any, 'asc'))).toEqual(['b', 'd', 'a', 'c']);
  });

  it('handles empty and undefined input', () => {
    expect(sortRows([], () => 0, 'desc')).toEqual([]);
    expect(sortRows(undefined as any, () => 0, 'desc')).toEqual([]);
  });
});
