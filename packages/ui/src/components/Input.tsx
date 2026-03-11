import React from 'react';
import { cn } from '../utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string | undefined;
  error?: string | undefined;
  required?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, required, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label className="text-[10px] font-bold uppercase tracking-[0.15em] font-mono" style={{ color: 'var(--input-label)' }}>
            {label} {required && <span className="text-danger-500" aria-hidden="true">*</span>}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            "h-9 px-3 text-[13px] border w-full transition-colors duration-150 outline-none",
            error 
              ? "border-danger-500 focus:border-danger-600" 
              : "focus:border-[#1a1a1a] hover:border-[#a3a3a3]",
            "disabled:bg-[#f5f5f5] disabled:border-[#e5e5e5] disabled:cursor-not-allowed disabled:text-[#a3a3a3]",
            className
          )}
          style={{ 
            backgroundColor: 'var(--input-bg)', 
            borderColor: 'var(--input-border)',
            color: 'var(--input-text)'
          }}
          onFocus={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--input-focus-bg)';
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--input-bg)';
            props.onBlur?.(e);
          }}
          aria-invalid={!!error}
          placeholder={label ? undefined : props.placeholder}
          {...props}
        />
        {error && <span className="text-[11px] font-medium text-danger-600 font-mono mt-0.5">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
