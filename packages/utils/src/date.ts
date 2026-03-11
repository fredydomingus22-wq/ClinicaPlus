import { format, isToday as isTodayFns, addMinutes as addMinutesFns, parseISO } from 'date-fns';
import { formatInTimeZone, toDate } from 'date-fns-tz';
import { pt } from 'date-fns/locale';

const TIMEZONE = 'Africa/Luanda';

/**
 * Formata data longa: "10 de Março de 2026"
 */
export function formatDate(date: Date | string | number): string {
  const d = typeof date === 'string' ? parseISO(date) : new Date(date);
  return formatInTimeZone(d, TIMEZONE, "d 'de' MMMM 'de' yyyy", { locale: pt });
}

/**
 * Formata hora: "09:30"
 */
export function formatTime(date: Date | string | number): string {
  const d = typeof date === 'string' ? parseISO(date) : new Date(date);
  return formatInTimeZone(d, TIMEZONE, "HH:mm");
}

/**
 * Formata data e hora: "10 Mar 2026, 09:30"
 */
export function formatDateTime(date: Date | string | number): string {
  const d = typeof date === 'string' ? parseISO(date) : new Date(date);
  return formatInTimeZone(d, TIMEZONE, "dd MMM yyyy, HH:mm", { locale: pt });
}

/**
 * Formata data curta: "10/03/2026"
 */
export function formatShortDate(date: Date | string | number): string {
  const d = typeof date === 'string' ? parseISO(date) : new Date(date);
  return formatInTimeZone(d, TIMEZONE, "dd/MM/yyyy");
}

/**
 * Verifica se a data é hoje
 */
export function isToday(date: Date | string | number): boolean {
  const d = typeof date === 'string' ? parseISO(date) : new Date(date);
  const dateInTZ = toDate(d, { timeZone: TIMEZONE });
  const todayInTZ = toDate(new Date(), { timeZone: TIMEZONE });
  return isTodayFns(dateInTZ);
}

/**
 * Verifica se a data é futura
 */
export function isFutureDate(date: Date | string | number): boolean {
  const d = typeof date === 'string' ? parseISO(date) : new Date(date);
  return d.getTime() > Date.now();
}

/**
 * Adiciona minutos a uma data
 */
export function addMinutes(date: Date | string | number, minutes: number): Date {
  const d = typeof date === 'string' ? parseISO(date) : new Date(date);
  return addMinutesFns(d, minutes);
}
/**
 * Calcula a idade a partir da data de nascimento
 */
export function calculateAge(birthDate: Date | string | number): number {
  const birth = typeof birthDate === 'string' ? parseISO(birthDate) : new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/**
 * Combina uma data (YYYY-MM-DD) e hora (HH:mm) strings em um objeto Date UTC
 * assumindo que os inputs estão no fuso horário de Luanda.
 */
export function combineDateAndTime(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  
  // Criar data no fuso de Luanda e converter para UTC
  // Usamos toDate de date-fns-tz para garantir precisão
  const dateString = `${dateStr} ${timeStr}`;
  return toDate(dateString, { timeZone: TIMEZONE });
}
