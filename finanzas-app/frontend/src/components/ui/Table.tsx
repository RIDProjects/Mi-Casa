import React from 'react';
import { Inbox } from 'lucide-react';
import { TableRowSkeleton } from './Skeleton';

interface TableProps {
  headers: string[];
  children?: React.ReactNode;
  emptyMessage?: string;
  loading?: boolean;
  skeletonRows?: number;
}

export function Table({
  headers,
  children,
  emptyMessage = 'Sin datos',
  loading = false,
  skeletonRows = 4,
}: TableProps) {
  const isEmpty =
    !loading &&
    React.Children.count(children) === 0;

  return (
    <div className="overflow-x-auto rounded-[14px] border border-border-light bg-surface-container-lowest dark:bg-surface-container-low shadow-soft">
      <table className="w-full text-sm">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h} scope="col" className="text-left">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: skeletonRows }).map((_, i) => (
              <TableRowSkeleton key={i} cols={headers.length} />
            ))
          ) : isEmpty ? (
            <tr>
              <td colSpan={headers.length} className="!py-14 text-center text-sm text-outline">
                <Inbox className="mx-auto mb-2 h-6 w-6 text-outline-variant" aria-hidden="true" />
                {emptyMessage}
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}
