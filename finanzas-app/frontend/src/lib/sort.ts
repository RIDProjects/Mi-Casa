export type SortDirection = 'asc' | 'desc';
export type SortKind = 'number' | 'date' | 'text';

const NUMERIC = /^-?\d+(\.\d+)?$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}/;

const isMissing = (v: unknown): boolean =>
  v === null || v === undefined || v === '' || (typeof v === 'number' && Number.isNaN(v));

/** What a column holds, from its non-empty values: API decimals arrive as strings, dates as ISO text. */
export function detectKind(values: unknown[]): SortKind {
  const present = values.filter(v => !isMissing(v));
  if (present.length === 0) return 'text';
  if (present.every(v => typeof v === 'number' || (typeof v === 'string' && NUMERIC.test(v.trim())))) return 'number';
  if (present.every(v => typeof v === 'string' && ISO_DATE.test(v) && !Number.isNaN(Date.parse(v)))) return 'date';
  return 'text';
}

/** Numbers and dates start from the largest/latest; text starts A to Z. */
export const defaultDirection = (kind: SortKind): SortDirection => (kind === 'text' ? 'asc' : 'desc');

const collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true });

function compare(a: unknown, b: unknown, kind: SortKind): number {
  if (kind === 'number') return Number(a) - Number(b);
  if (kind === 'date') return Date.parse(String(a)) - Date.parse(String(b));
  return collator.compare(String(a), String(b));
}

/**
 * Returns a sorted copy. Empty values always go last (in both directions) and
 * equal values keep their original order.
 */
export function sortRows<T>(rows: T[] | undefined | null, accessor: (row: T) => unknown, dir: SortDirection): T[] {
  if (!rows || rows.length === 0) return [];
  const keyed = rows.map((row, index) => ({ row, index, value: accessor(row) }));
  const kind = detectKind(keyed.map(k => k.value));
  const sign = dir === 'asc' ? 1 : -1;
  keyed.sort((x, y) => {
    const xm = isMissing(x.value);
    const ym = isMissing(y.value);
    if (xm || ym) return xm && ym ? x.index - y.index : xm ? 1 : -1;
    return compare(x.value, y.value, kind) * sign || x.index - y.index;
  });
  return keyed.map(k => k.row);
}
