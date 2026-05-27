import React from 'react';
interface SelectionToggleProps {
    label: string;
    value: boolean | string | string[] | null;
    onChange: (value: any) => void;
    type: 'boolean' | 'text' | 'date' | 'multi_date' | 'select';
    comObservacao?: boolean | undefined;
    labelObservacao?: string | undefined;
    observacao?: string | undefined;
    onObservacaoChange?: ((obs: string) => void) | undefined;
    error?: string | undefined;
    disabled?: boolean | undefined;
}
export declare const SelectionToggle: React.FC<SelectionToggleProps>;
export {};
//# sourceMappingURL=SelectionToggle.d.ts.map