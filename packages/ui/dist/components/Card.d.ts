import React from 'react';
interface CardProps {
    children: React.ReactNode;
    className?: string;
    id?: string;
    onClick?: () => void;
}
export declare function Card({ children, className, id, onClick }: CardProps): import("react/jsx-runtime").JSX.Element;
export declare function CardHeader({ children, className }: CardProps): import("react/jsx-runtime").JSX.Element;
export declare function CardTitle({ children, className }: CardProps): import("react/jsx-runtime").JSX.Element;
export declare function CardContent({ children, className }: CardProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=Card.d.ts.map