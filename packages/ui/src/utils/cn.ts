import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utilitário global para fusão inteligente de classes do Tailwind CSS.
 * Permite usar condicionais elegantes (clsx) enquanto resolve
 * conflitos de classes Tailwind automaticamente (twMerge).
 * 
 * Exemplo: cn('px-2 py-1', isActive && 'bg-primary-500', 'px-4')
 * Resultado: 'py-1 bg-primary-500 px-4' (px-2 foi anulado)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
