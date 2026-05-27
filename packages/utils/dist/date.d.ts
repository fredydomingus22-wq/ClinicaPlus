/**
 * Formata data longa: "10 de Março de 2026"
 */
export declare function formatDate(date: Date | string | number): string;
/**
 * Formata hora: "09:30"
 */
export declare function formatTime(date: Date | string | number): string;
/**
 * Formata data e hora: "10 Mar 2026, 09:30"
 */
export declare function formatDateTime(date: Date | string | number): string;
/**
 * Formata data curta: "10/03/2026"
 */
export declare function formatShortDate(date: Date | string | number): string;
/**
 * Verifica se a data é hoje
 */
export declare function isToday(date: Date | string | number): boolean;
/**
 * Verifica se a data é futura
 */
export declare function isFutureDate(date: Date | string | number): boolean;
/**
 * Adiciona minutos a uma data
 */
export declare function addMinutes(date: Date | string | number, minutes: number): Date;
/**
 * Calcula a idade a partir da data de nascimento
 */
export declare function calculateAge(birthDate: Date | string | number): number;
/**
 * Combina uma data (YYYY-MM-DD) e hora (HH:mm) strings em um objeto Date UTC
 * assumindo que os inputs estão no fuso horário de Luanda.
 */
export declare function combineDateAndTime(dateStr: string, timeStr: string): Date;
//# sourceMappingURL=date.d.ts.map