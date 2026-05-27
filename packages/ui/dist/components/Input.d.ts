import React from 'react';
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string | undefined;
    error?: string | undefined;
    helperText?: string | undefined;
    required?: boolean;
}
export declare const Input: React.ForwardRefExoticComponent<InputProps & React.RefAttributes<HTMLInputElement>>;
export {};
//# sourceMappingURL=Input.d.ts.map