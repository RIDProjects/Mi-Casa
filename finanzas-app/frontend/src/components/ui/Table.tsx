import React from 'react';
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
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
          {loading ? (
            Array.from({ length: skeletonRows }).map((_, i) => (
              <TableRowSkeleton key={i} cols={headers.length} />
            ))
          ) : isEmpty ? (
            <tr>
              <td
                colSpan={headers.length}
                className="px-4 py-10 text-center text-sm text-gray-400 dark:text-gray-500"
              >
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
