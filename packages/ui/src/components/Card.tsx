import React from 'react';
import { cn } from '../utils/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export function Card({ children, className, id }: CardProps) {
  return (
    <div 
      id={id}
      className={cn(
        "bg-white border border-neutral-200 overflow-hidden",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: CardProps) {
  return (
    <div className={cn("px-6 py-4 border-b border-neutral-100 bg-neutral-50/30", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: CardProps) {
  return (
    <h3 className={cn("font-bold text-neutral-900 tracking-tight", className)}>
      {children}
    </h3>
  );
}

export function CardContent({ children, className }: CardProps) {
  return (
    <div className={cn("px-6 py-4", className)}>
      {children}
    </div>
  );
}
