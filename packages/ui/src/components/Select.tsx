import React from 'react';
import { cn } from '../utils/cn';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string | undefined;
  error?: string | undefined;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, required, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label className="text-[10px] font-bold uppercase tracking-[0.15em] font-mono" style={{ color: 'var(--select-label)' }}>
            {label} {required && <span className="text-danger-500" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={cn(
              "h-9 px-3 pr-10 text-[13px] border w-full transition-colors duration-150 outline-none appearance-none cursor-pointer",
              error 
                ? "border-danger-500 focus:border-danger-600" 
                : "focus:border-[#1a1a1a] hover:border-[#a3a3a3]",
              "disabled:cursor-not-allowed disabled:bg-[#f5f5f5] disabled:border-[#e5e5e5] disabled:text-[#a3a3a3]",
              className
            )}
            style={{ 
              backgroundColor: 'var(--select-bg)', 
              borderColor: 'var(--select-border)',
              color: 'var(--select-text)'
            }}
            aria-invalid={!!error}
            {...props}
            defaultValue={props.value === undefined ? "" : undefined}
          >
            {placeholder && (
              <option value="" disabled className="bg-white text-neutral-400">
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-white text-neutral-800">
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none">
            <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--select-chevron)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {error && <span className="text-[11px] font-medium text-danger-600 font-mono mt-0.5">{error}</span>}
      </div>
    );
  }
);

Select.displayName = 'Select';
