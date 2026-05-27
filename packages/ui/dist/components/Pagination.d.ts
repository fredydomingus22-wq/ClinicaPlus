interface PaginationProps {
    currentPage: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
    className?: string;
}
export declare function Pagination({ currentPage, totalItems, itemsPerPage, onPageChange, className, }: PaginationProps): import("react/jsx-runtime").JSX.Element | null;
export {};
//# sourceMappingURL=Pagination.d.ts.map