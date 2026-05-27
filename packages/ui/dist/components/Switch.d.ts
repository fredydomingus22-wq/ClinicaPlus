import React from 'react';
interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    label?: string;
    description?: string;
}
export declare const Switch: ({ checked, onCheckedChange, label, description, className, disabled, ...props }: SwitchProps) => import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=Switch.d.ts.map