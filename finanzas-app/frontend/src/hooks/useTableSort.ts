import { useCallback, useMemo, useState } from 'react';
import { defaultDirection, detectKind, SortDirection, sortRows } from '../lib/sort';

export interface TableSort {
  key: string;
  dir: SortDirection;
}

type Accessors<T> = Record<string, (row: T) => unknown>;

/**
 * Client-side column sorting. Without an `initial` sort the rows keep the
 * order they came in; clicking a column sorts by it, clicking it again flips
 * the direction. A newly chosen column starts largest/latest first for
 * amounts and dates, and A to Z for text.
 */
export function useTableSort<T>(rows: T[] | undefined | null, accessors: Accessors<T>, initial?: TableSort) {
  const [sort, setSort] = useState<TableSort | null>(initial ?? null);

  const sorted = useMemo(() => {
    const list = rows ?? [];
    if (!sort || !accessors[sort.key]) return list;
    return sortRows(list, accessors[sort.key], sort.dir);
    // accessors are recreated each render by callers; the key + data decide the order
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sort]);

  const toggle = useCallback((key: string) => {
    setSort(prev => {
      if (prev && prev.key === key) return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
      const accessor = accessors[key];
      const kind = detectKind((rows ?? []).map(r => (accessor ? accessor(r) : undefined)));
      return { key, dir: defaultDirection(kind) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  return { sorted, sort, toggle };
}
