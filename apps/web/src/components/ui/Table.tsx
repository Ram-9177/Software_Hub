import React, { type KeyboardEvent, type ReactNode } from 'react';
import { EmptyState } from './EmptyState';
import { Skeleton } from './Skeleton';
import { useMediaQuery } from './hooks';
import { cn } from './utils';

export interface TableColumn<T> {
  key: string;
  header: ReactNode;
  render?(row: T, index: number): ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
  headerClassName?: string;
  primary?: boolean;
  hideOnMobile?: boolean;
}

export interface TableProps<T> {
  columns: readonly TableColumn<T>[];
  rows: readonly T[];
  rowKey(row: T): string;
  caption?: string;
  onRowClick?(row: T): void;
  rowClassName?(row: T): string | undefined;
  loading?: boolean;
  empty?: ReactNode;
  stackBelow?: 'sm' | 'md' | 'lg';
  className?: string;
}

const STACK_QUERY = { sm: '(min-width: 640px)', md: '(min-width: 768px)', lg: '(min-width: 1024px)' } as const;
const ALIGN = { left: 'text-left', center: 'text-center', right: 'text-right' } as const;

function cellValue<T>(col: TableColumn<T>, row: T, index: number): ReactNode {
  if (col.render) return col.render(row, index);
  const value = (row as Record<string, unknown>)[col.key];
  return value === null || value === undefined ? '—' : String(value);
}

export function Table<T>({
  columns,
  rows,
  rowKey,
  caption = 'Data table',
  onRowClick,
  rowClassName,
  loading = false,
  empty,
  stackBelow = 'md',
  className,
}: TableProps<T>) {
  const wide = useMediaQuery(STACK_QUERY[stackBelow], true);

  const clickable = (row: T) =>
    onRowClick
      ? {
          tabIndex: 0,
          onClick: () => onRowClick(row),
          onKeyDown: (e: KeyboardEvent) => {
            if (e.target !== e.currentTarget) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onRowClick(row);
            }
          },
        }
      : {};

  if (!loading && rows.length === 0) {
    return (
      <div className={cn('rounded-card border border-line/70 bg-surface', className)}>
        {empty ?? <EmptyState compact title="Nothing to show" />}
      </div>
    );
  }

  if (!wide) {
    const primary = columns.find((c) => c.primary);
    const rest = columns.filter((c) => c !== primary && !c.hideOnMobile);
    return (
      <ul aria-label={caption} aria-busy={loading || undefined} className={cn('flex flex-col gap-3', className)}>
        {loading
          ? Array.from({ length: 3 }, (_, i) => (
              <li key={i} className="rounded-card border border-line/70 bg-surface p-4 shadow-card">
                <Skeleton className="w-1/2" />
                <Skeleton className="mt-3 w-full" />
                <Skeleton className="mt-2 w-2/3" />
              </li>
            ))
          : rows.map((row, i) => (
              <li
                key={rowKey(row)}
                {...clickable(row)}
                className={cn(
                  'rounded-card border border-line/70 bg-surface p-4 shadow-card',
                  onRowClick && 'cursor-pointer transition-colors hover:border-navy-300 focus-visible:outline-2 focus-visible:outline-navy-500',
                  rowClassName?.(row)
                )}
              >
                {primary && <div className="mb-2 font-semibold text-ink">{cellValue(primary, row, i)}</div>}
                <dl className="grid grid-cols-[minmax(6rem,auto)_1fr] gap-x-3 gap-y-1.5 text-sm">
                  {rest.map((col) => (
                    <div key={col.key} className="contents">
                      <dt className="text-ink-faint text-xs font-medium">{col.header}</dt>
                      <dd className={cn('min-w-0 text-ink text-xs font-semibold', col.className)}>{cellValue(col, row, i)}</dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
      </ul>
    );
  }

  return (
    <div className={cn('overflow-x-auto rounded-card border border-line/70 bg-surface shadow-card', className)}>
      <table aria-busy={loading || undefined} className="w-full border-collapse text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-line bg-canvas/70">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={cn(
                  'px-4 py-3 text-xs font-semibold tracking-wide whitespace-nowrap text-ink-soft uppercase',
                  ALIGN[col.align ?? 'left'],
                  col.headerClassName
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {loading
            ? Array.from({ length: 4 }, (_, i) => (
                <tr key={i}>
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3.5">
                      <Skeleton className="w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            : rows.map((row, i) => (
                <tr
                  key={rowKey(row)}
                  {...clickable(row)}
                  className={cn(
                    'align-middle transition-colors',
                    onRowClick && 'cursor-pointer hover:bg-tint focus-visible:bg-tint focus-visible:outline-2 focus-visible:outline-navy-500',
                    rowClassName?.(row)
                  )}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn('px-4 py-3 text-ink', ALIGN[col.align ?? 'left'], col.className)}>
                      {cellValue(col, row, i)}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}

export default Table;
