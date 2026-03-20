import React from 'react';
import { cn } from '../utils/cn';

interface HeroBannerProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Ultra-Minimalist "Spartan" Hero Header.
 * Discreet, high-density, and efficient.
 * Uses only official project tokens and fonts.
 */
export function HeroBanner({ 
  title, 
  subtitle, 
  action, 
  className 
}: HeroBannerProps) {
  return (
    <div className={cn(
      "w-full px-5 py-4 mb-6 bg-white border border-neutral-100 shadow-sm",
      className
    )}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-neutral-400 text-[10px] font-black uppercase tracking-[0.2em] opacity-90">
              {subtitle}
            </p>
          )}
        </div>
        
        {action && (
          <div className="flex items-center shrink-0">
            {action}
          </div>
        )}
      </div>
    </div>
  );
}
