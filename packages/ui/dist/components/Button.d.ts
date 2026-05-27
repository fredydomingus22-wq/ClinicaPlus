import React from 'react';
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    fullWidth?: boolean;
}
export declare function Button({ variant, size, loading, fullWidth, children, className, disabled, ...props }: ButtonProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=Button.d.ts.map