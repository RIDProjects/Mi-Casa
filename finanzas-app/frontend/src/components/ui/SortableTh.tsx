import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import type { TableSort } from '../../hooks/useTableSort';

interface Props {
  label: string;
  sortKey: string;
  sort: TableSort | null;
  onSort: (key: string) => void;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

const ALIGN = { left: 'text-left justify-start', center: 'text-center justify-center', right: 'text-right justify-end' };

/** Column header that sorts its table when clicked; announces the direction through aria-sort. */
export function SortableTh({ label, sortKey, sort, onSort, align = 'left', className = 'px-4 py-3' }: Props) {
  const active = sort?.key === sortKey;
  const ariaSort = active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : 'none';
  const Icon = active ? (sort!.dir === 'asc' ? ArrowUp : ArrowDown) : ChevronsUpDown;

  return (
    <th scope="col" aria-sort={ariaSort} className={`${className} ${ALIGN[align].split(' ')[0]}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex w-full items-center gap-1 uppercase hover:text-primary transition-colors ${ALIGN[align].split(' ')[1]}`}
      >
        <span>{label}</span>
        <Icon size={12} aria-hidden="true" className={active ? 'text-primary' : 'opacity-40'} />
      </button>
    </th>
  );
}
