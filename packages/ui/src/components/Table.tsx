import React from 'react';
import { cn } from '../utils/cn';

interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string | number;
  isLoading?: boolean;
  emptyMessage?: string;
  emptyContent?: React.ReactNode;
  className?: string;
  /** Called when the user hovers over a row — useful for prefetching */
  onRowHover?: (item: T) => void;
  /** Render a full-width row below the main row (Master-Detail) */
  renderExpandedRow?: (item: T) => React.ReactNode;
}

export function Table<T>({ 
  columns, 
  data, 
  keyExtractor, 
  isLoading, 
  emptyMessage = 'Nenhum registo encontrado',
  emptyContent,
  className,
  onRowHover,
  renderExpandedRow
}: TableProps<T>) {
  return (
    <div className={cn("overflow-x-auto border", className)} style={{ backgroundColor: 'var(--table-bg)', borderColor: 'var(--table-border)' }}>
      <table className="w-full text-sm border-collapse">
        <thead className="border-b" style={{ backgroundColor: 'var(--table-header-bg)', borderColor: 'var(--table-border)' }}>
          <tr>
            {columns.map((col, idx) => (
              <th 
                key={idx}
                className={cn(
                  "px-4 py-3 text-[10px] font-bold uppercase tracking-[0.15em] text-left font-mono",
                  col.className
                )}
                style={{ color: 'var(--table-text-muted)' }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y" style={{ borderColor: 'var(--table-border)' }}>
          {isLoading ? (
            // Skeletons
            Array.from({ length: 4 }).map((_, i) => (
              <tr key={i} className="animate-pulse" style={{ backgroundColor: 'var(--table-bg)' }}>
                {columns.map((_, j) => (
                  <td key={j} className="px-5 py-4">
                    <div className="h-4 w-full" style={{ backgroundColor: 'var(--table-header-bg)' }} />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-5 py-12 text-center font-medium" style={{ color: 'var(--table-text-muted)' }}>
                {emptyContent || emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item) => (
              <React.Fragment key={keyExtractor(item)}>
                <tr 
                  className="transition-colors duration-200"
                  style={{ backgroundColor: 'var(--table-bg)' }}
                  onMouseEnter={onRowHover ? () => onRowHover(item) : undefined}
                >
                  {columns.map((col, idx) => (
                    <td key={idx} className={cn("px-5 py-4 font-medium", col.className)} style={{ color: 'var(--table-text)' }}>
                      {typeof col.accessor === 'function' 
                        ? col.accessor(item) 
                        : (item[col.accessor] as React.ReactNode)}
                    </td>
                  ))}
                </tr>
                {renderExpandedRow && (
                  <tr>
                    <td colSpan={columns.length} className="p-0 border-none">
                      {renderExpandedRow(item)}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
