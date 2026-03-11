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
        "bg-white border border-[#e5e5e5] p-5",
        className
      )}
    >
      {children}
    </div>
  );
}
