import React from 'react';
export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'outline';
interface BadgeProps {
    variant?: BadgeVariant;
    children: React.ReactNode;
    className?: string;
}
export declare function Badge({ variant, children, className }: BadgeProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=Badge.d.ts.map