import React from 'react';
export interface SelectOption {
    value: string;
    label: string;
}
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string | undefined;
    error?: string | undefined;
    helperText?: string | undefined;
    options: SelectOption[];
    placeholder?: string;
    required?: boolean;
}
export declare const Select: React.ForwardRefExoticComponent<SelectProps & React.RefAttributes<HTMLSelectElement>>;
//# sourceMappingURL=Select.d.ts.map