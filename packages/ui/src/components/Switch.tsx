import React from 'react';
import { cn } from '../utils/cn';

interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  description?: string;
}

export const Switch = ({ 
  checked, 
  onCheckedChange, 
  label, 
  description, 
  className,
  disabled,
  ...props 
}: SwitchProps) => {
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      {(label || description) && (
        <div className="flex flex-col">
          {label && <span className="text-[13px] font-bold text-[#1a1a1a] leading-tight font-mono uppercase tracking-tight">{label}</span>}
          {description && <span className="text-[11px] text-[#737373] font-mono">{description}</span>}
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onCheckedChange(!checked)}
        className={cn(
          "relative inline-flex h-5 w-10 shrink-0 cursor-pointer border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
          checked ? "bg-[#10b981]" : "bg-[#e5e5e5]",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none inline-block h-4 w-4 transform bg-white transition duration-200 ease-in-out",
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        disabled={disabled}
        {...props}
      />
    </div>
  );
};
