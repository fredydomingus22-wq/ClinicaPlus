import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../utils/cn';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'ghost';
  };
  className?: string;
}

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action,
  className 
}: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center p-12",
      className
    )}>
      {Icon && (
        <div className="h-16 w-16 bg-[#f5f5f5] border border-[#e5e5e5] flex items-center justify-center mb-6">
          <Icon className="h-8 w-8 text-[#a3a3a3]" />
        </div>
      )}
      <div className="max-w-xs mx-auto space-y-2">
        <h3 className="text-[14px] font-bold text-[#1a1a1a] tracking-tight uppercase font-mono">{title}</h3>
        <p className="text-[#737373] text-[13px] leading-relaxed font-mono">{description}</p>
      </div>
      {action && (
        <div className="mt-8">
          <Button 
            variant={action.variant || 'secondary'} 
            size="sm" 
            className="px-8" 
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
}
