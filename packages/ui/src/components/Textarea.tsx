import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string | undefined;
  error?: string | undefined;
  required?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, required, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1 w-full">
        {label && (
          <label className="text-[10px] font-bold uppercase tracking-[0.15em] font-mono" style={{ color: 'var(--input-label)' }}>
            {label} {required && <span className="text-danger-600" aria-hidden="true">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          className={`
            px-3 py-2 text-[13px] border w-full transition-colors duration-150 outline-none min-h-[100px]
            ${error 
              ? 'border-danger-500 focus:border-danger-600' 
              : 'focus:border-[#1a1a1a] hover:border-[#a3a3a3]'
            }
            disabled:bg-[#f5f5f5] disabled:border-[#e5e5e5] disabled:cursor-not-allowed disabled:text-[#a3a3a3]
            ${className}
          `}
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
          {...props}
        />
        {error && <span className="text-[11px] font-medium text-danger-600 font-mono mt-0.5">{error}</span>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
