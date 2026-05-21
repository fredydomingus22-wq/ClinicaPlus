import React from 'react';
import { Button } from './Button';
import { Textarea } from './Textarea';
import { Input } from './Input';
import { cn } from '../utils/cn';

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

export const SelectionToggle: React.FC<SelectionToggleProps> = ({
  label,
  value,
  onChange,
  type,
  comObservacao,
  labelObservacao,
  observacao,
  onObservacaoChange,
  error,
  disabled
}) => {
  const isBoolean = type === 'boolean';
  
  return (
    <div className="flex flex-col gap-3 p-4 bg-white border border-slate-200 rounded-lg hover:border-blue-200 transition-colors">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <span className="text-sm font-medium text-slate-700 leading-tight">
          {label}
        </span>

        {isBoolean && (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant={value === true ? 'primary' : 'outline'}
              size="sm"
              className={cn(
                "w-20 font-semibold",
                value === true ? "bg-blue-600 hover:bg-blue-700 border-transparent text-white" : "text-slate-600 hover:bg-slate-50"
              )}
              onClick={() => onChange(true)}
              disabled={disabled}
            >
              Sim
            </Button>
            <Button
              type="button"
              variant={value === false ? 'danger' : 'outline'}
              size="sm"
              className={cn(
                "w-20 font-semibold",
                value === false ? "bg-red-500 hover:bg-red-600 border-transparent text-white" : "text-slate-600 hover:bg-slate-50"
              )}
              onClick={() => onChange(false)}
              disabled={disabled}
            >
              Não
            </Button>
          </div>
        )}

        {type === 'text' && (
          <Input
            value={value as string || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
            disabled={disabled}
            placeholder="Descreva aqui..."
            className="md:max-w-xs"
          />
        )}

        {type === 'date' && (
          <Input
            type="date"
            value={value as string || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
            disabled={disabled}
            className="md:max-w-xs"
          />
        )}
      </div>

      {comObservacao && value === true && onObservacaoChange && (
        <div className="mt-1 animate-in fade-in slide-in-from-top-1 duration-200">
          <label className="text-xs font-medium text-slate-500 mb-1 block uppercase tracking-wider">
            {labelObservacao || 'Observações'}
          </label>
          <Textarea
            value={observacao || ''}
            onChange={(e) => onObservacaoChange(e.target.value)}
            placeholder="Informações adicionais..."
            className="min-h-[80px] text-sm"
            disabled={disabled}
          />
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500 font-medium">{error}</p>
      )}
    </div>
  );
};
