import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rect' | 'circle';
}

/**
 * Skeleton component for smooth loading states.
 */
export function Skeleton({ className = '', variant = 'rect' }: SkeletonProps) {
  const variantClasses = {
    text: 'h-3 w-full rounded',
    rect: 'h-20 w-full',
    circle: 'h-10 w-10',
  };

  return (
    <div 
      className={`bg-neutral-100 animate-pulse-slow ${variantClasses[variant]} ${className}`} 
    />
  );
}

/**
 * Skeleton row for tables.
 */
export function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="border-b border-neutral-100">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-4">
          <Skeleton variant="text" className={i === 0 ? 'w-3/4' : 'w-1/2'} />
        </td>
      ))}
    </tr>
  );
}
