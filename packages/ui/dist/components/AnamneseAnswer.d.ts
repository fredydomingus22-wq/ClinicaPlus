import React from 'react';
import { SelectOption } from './Select';
export interface AnamneseAnswerProps {
    /** Question label shown to the doctor */
    label: string;
    /** Type of the answer – matches the backend `tipoResposta` */
    type: 'boolean' | 'select' | 'text' | 'date' | 'multi_date';
    /** Current value */
    value: any;
    /** Callback to update the value */
    onChange: (value: any) => void;
    /** Required when type is 'select' – list of selectable options */
    options?: SelectOption[];
    /** Show an optional observation textarea (only for boolean "Sim") */
    comObservacao?: boolean;
    /** Label for the observation field */
    labelObservacao?: string;
    /** Observation text */
    observacao?: string;
    /** Callback for observation change */
    onObservacaoChange?: (obs: string) => void;
    /** Validation error message */
    error?: string;
    /** Disable all inputs */
    disabled?: boolean;
}
/**
 * Unified answer component used by the dynamic anamnese form.
 * It re‑uses the existing UI building blocks (`SelectionToggle`, `Select`, `Input`, `Textarea`)
 * to avoid any duplicated markup or styling while keeping the premium glass‑morphic look.
 */
export declare const AnamneseAnswer: React.FC<AnamneseAnswerProps>;
//# sourceMappingURL=AnamneseAnswer.d.ts.map