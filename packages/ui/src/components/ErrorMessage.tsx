import React from 'react';

interface ErrorMessageProps {
  error?: string | { message?: string } | null;
  className?: string;
}

export function ErrorMessage({ error, className = '' }: ErrorMessageProps) {
  if (!error) return null;

  const message = typeof error === 'string' 
    ? error 
    : error.message || 'Ocorreu um erro inesperado';

  return (
    <div className={`text-sm text-danger-600 bg-danger-50 border border-danger-100 p-3 rounded-md animate-shake ${className}`}>
      {message}
    </div>
  );
}
