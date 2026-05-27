import { type ClassValue } from 'clsx';
/**
 * Utilitário global para fusão inteligente de classes do Tailwind CSS.
 * Permite usar condicionais elegantes (clsx) enquanto resolve
 * conflitos de classes Tailwind automaticamente (twMerge).
 *
 * Exemplo: cn('px-2 py-1', isActive && 'bg-primary-500', 'px-4')
 * Resultado: 'py-1 bg-primary-500 px-4' (px-2 foi anulado)
 */
export declare function cn(...inputs: ClassValue[]): string;
//# sourceMappingURL=cn.d.ts.map