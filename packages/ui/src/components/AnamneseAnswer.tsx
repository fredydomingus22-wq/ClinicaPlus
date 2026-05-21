import React from 'react';
import { Select, SelectOption } from './Select';
import { SelectionToggle } from './SelectionToggle';
import { Input } from './Input';
import { Textarea } from './Textarea';
import { cn } from '../utils/cn';

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
export const AnamneseAnswer: React.FC<AnamneseAnswerProps> = ({
  label,
  type,
  value,
  onChange,
  options,
  comObservacao,
  labelObservacao,
  observacao,
  onObservacaoChange,
  error,
  disabled,
}) => {
  // Helper to render the appropriate control based on `type`
  const renderControl = () => {
    switch (type) {
      case 'boolean':
        return (
          <SelectionToggle
            label={label}
            value={value as boolean | null}
            onChange={onChange}
            type="boolean"
            comObservacao={comObservacao}
            labelObservacao={labelObservacao}
            observacao={observacao}
            onObservacaoChange={onObservacaoChange}
            error={error}
            disabled={disabled}
          />
        );
      case 'select':
        return (
          <Select
            label={label}
            value={value ?? ''}
            onChange={onChange}
            options={options ?? []}
            error={error}
            disabled={disabled}
          />
        );
      case 'text':
        return (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">{label}</label>
            <Input
              value={value ?? ''}
              onChange={e => onChange(e.target.value)}
              placeholder="Descreva aqui..."
              disabled={disabled}
              className="md:max-w-xs"
            />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>
        );
      case 'date':
        return (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">{label}</label>
            <Input
              type="date"
              value={value ?? ''}
              onChange={e => onChange(e.target.value)}
              disabled={disabled}
              className="md:max-w-xs"
            />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>
        );
      case 'multi_date':
        // For now we reuse a single date input – the backend will treat the value as a string of ISO dates.
        return (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">{label}</label>
            <Input
              type="date"
              value={value ?? ''}
              onChange={e => onChange(e.target.value)}
              disabled={disabled}
              className="md:max-w-xs"
            />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>
        );
      default:
        return null;
    }
  };

  // The outer container follows the same glass‑morphic style as SelectionToggle for visual consistency.
  return (
    <div className={cn(
      'flex flex-col gap-3 p-4 bg-white border border-slate-200 rounded-lg hover:border-blue-200 transition-colors',
      disabled && 'opacity-60 cursor-not-allowed'
    )}>
      {renderControl()}
    </div>
  );
};
