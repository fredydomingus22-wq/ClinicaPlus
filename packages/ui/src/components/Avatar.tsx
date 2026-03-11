import React from 'react';

interface AvatarProps {
  src?: string;
  initials: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeStyles = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
};

export function Avatar({ src, initials, size = 'md', className = '' }: AvatarProps) {
  return (
    <div className={`
      relative inline-flex items-center justify-center shrink-0 rounded-full bg-primary-100 text-primary-700 font-semibold overflow-hidden border border-primary-200
      ${sizeStyles[size]}
      ${className}
    `}>
      {src ? (
        <img src={src} alt={initials} className="h-full w-full object-cover" />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}
