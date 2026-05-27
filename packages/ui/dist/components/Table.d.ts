import React from 'react';
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
    /** Called when the user clicks a row */
    onRowClick?: (item: T) => void;
    /** Render a full-width row below the main row (Master-Detail) */
    renderExpandedRow?: (item: T) => React.ReactNode;
    tableTestId?: string;
    itemTestId?: string | ((item: T) => string);
}
export declare function Table<T>({ columns, data, keyExtractor, isLoading, emptyMessage, emptyContent, className, onRowHover, onRowClick, renderExpandedRow, tableTestId, itemTestId }: TableProps<T>): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=Table.d.ts.map