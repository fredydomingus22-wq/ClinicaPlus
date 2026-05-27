"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDate = formatDate;
exports.formatTime = formatTime;
exports.formatDateTime = formatDateTime;
exports.formatShortDate = formatShortDate;
exports.isToday = isToday;
exports.isFutureDate = isFutureDate;
exports.addMinutes = addMinutes;
exports.calculateAge = calculateAge;
exports.combineDateAndTime = combineDateAndTime;
const date_fns_1 = require("date-fns");
const date_fns_tz_1 = require("date-fns-tz");
const locale_1 = require("date-fns/locale");
const TIMEZONE = 'Africa/Luanda';
/**
 * Formata data longa: "10 de Março de 2026"
 */
function formatDate(date) {
    const d = typeof date === 'string' ? (0, date_fns_1.parseISO)(date) : new Date(date);
    return (0, date_fns_tz_1.formatInTimeZone)(d, TIMEZONE, "d 'de' MMMM 'de' yyyy", { locale: locale_1.pt });
}
/**
 * Formata hora: "09:30"
 */
function formatTime(date) {
    const d = typeof date === 'string' ? (0, date_fns_1.parseISO)(date) : new Date(date);
    return (0, date_fns_tz_1.formatInTimeZone)(d, TIMEZONE, "HH:mm");
}
/**
 * Formata data e hora: "10 Mar 2026, 09:30"
 */
function formatDateTime(date) {
    const d = typeof date === 'string' ? (0, date_fns_1.parseISO)(date) : new Date(date);
    return (0, date_fns_tz_1.formatInTimeZone)(d, TIMEZONE, "dd MMM yyyy, HH:mm", { locale: locale_1.pt });
}
/**
 * Formata data curta: "10/03/2026"
 */
function formatShortDate(date) {
    const d = typeof date === 'string' ? (0, date_fns_1.parseISO)(date) : new Date(date);
    return (0, date_fns_tz_1.formatInTimeZone)(d, TIMEZONE, "dd/MM/yyyy");
}
/**
 * Verifica se a data é hoje
 */
function isToday(date) {
    const d = typeof date === 'string' ? (0, date_fns_1.parseISO)(date) : new Date(date);
    const dateInTZ = (0, date_fns_tz_1.toDate)(d, { timeZone: TIMEZONE });
    const todayInTZ = (0, date_fns_tz_1.toDate)(new Date(), { timeZone: TIMEZONE });
    return (0, date_fns_1.isToday)(dateInTZ);
}
/**
 * Verifica se a data é futura
 */
function isFutureDate(date) {
    const d = typeof date === 'string' ? (0, date_fns_1.parseISO)(date) : new Date(date);
    return d.getTime() > Date.now();
}
/**
 * Adiciona minutos a uma data
 */
function addMinutes(date, minutes) {
    const d = typeof date === 'string' ? (0, date_fns_1.parseISO)(date) : new Date(date);
    return (0, date_fns_1.addMinutes)(d, minutes);
}
/**
 * Calcula a idade a partir da data de nascimento
 */
function calculateAge(birthDate) {
    const birth = typeof birthDate === 'string' ? (0, date_fns_1.parseISO)(birthDate) : new Date(birthDate);
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
function combineDateAndTime(dateStr, timeStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);
    // Criar data no fuso de Luanda e converter para UTC
    // Usamos toDate de date-fns-tz para garantir precisão
    const dateString = `${dateStr} ${timeStr}`;
    return (0, date_fns_tz_1.toDate)(dateString, { timeZone: TIMEZONE });
}
//# sourceMappingURL=date.js.map