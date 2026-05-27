interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'rect' | 'circle';
}
/**
 * Skeleton component for smooth loading states.
 */
export declare function Skeleton({ className, variant }: SkeletonProps): import("react/jsx-runtime").JSX.Element;
/**
 * Skeleton row for tables.
 */
export declare function SkeletonRow({ cols }: {
    cols: number;
}): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=Skeleton.d.ts.map