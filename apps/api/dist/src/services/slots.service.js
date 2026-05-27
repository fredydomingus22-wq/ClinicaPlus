"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAvailableSlots = getAvailableSlots;
exports.isSlotAvailable = isSlotAvailable;
const prisma_1 = require("../lib/prisma");
const date_fns_tz_1 = require("date-fns-tz");
// Map JS Date.getDay() to horario keys (0=Sunday, 1=Monday, ...)
const DAY_MAP = {
    0: 'domingo',
    1: 'segunda',
    2: 'terca',
    3: 'quarta',
    4: 'quinta',
    5: 'sexta',
    6: 'sabado',
};
const TZ = 'Africa/Luanda';
/**
 * Converts "HH:MM" string to total minutes from midnight.
 */
function toMinutes(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
}
/**
 * Converts total minutes from midnight to "HH:MM" string.
 */
function toHHMM(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
/**
 * Returns available appointment slot strings ["08:00", "08:30", ...] for a
 * given doctor on a given date, excluding occupied slots and breaks.
 */
async function getAvailableSlots(medicoId, dataStr, // "YYYY-MM-DD"
clinicaId) {
    const medico = await prisma_1.prisma.medico.findUnique({ where: { id: medicoId } });
    if (!medico || medico.clinicaId !== clinicaId || !medico.ativo)
        return [];
    const horario = medico.horario;
    const duracao = medico.duracaoConsulta; // minutes
    // Determine day of week for the requested date avoiding timezone shifts
    const [yyyy, mm, dd] = dataStr.split('-').map(Number);
    const dateObj = new Date(yyyy, mm - 1, dd);
    const dayKey = DAY_MAP[dateObj.getDay()];
    if (!dayKey)
        return [];
    const diaConfig = horario[dayKey];
    if (!diaConfig?.ativo || !diaConfig.inicio || !diaConfig.fim)
        return [];
    const start = toMinutes(diaConfig.inicio);
    const end = toMinutes(diaConfig.fim);
    const pausaStart = diaConfig.pausaInicio ? toMinutes(diaConfig.pausaInicio) : null;
    const pausaEnd = diaConfig.pausaFim ? toMinutes(diaConfig.pausaFim) : null;
    // Generate candidates
    const candidates = [];
    for (let t = start; t + duracao <= end; t += duracao) {
        if (pausaStart !== null && pausaEnd !== null) {
            const slotEnd = t + duracao;
            if (t < pausaEnd && slotEnd > pausaStart)
                continue;
        }
        candidates.push(toHHMM(t));
    }
    // Fetch active appointments that day
    const dayStart = new Date(`${dataStr}T00:00:00.000Z`);
    const dayEnd = new Date(`${dataStr}T23:59:59.999Z`);
    const appointments = await prisma_1.prisma.agendamento.findMany({
        where: {
            clinicaId,
            medicoId,
            dataHora: { gte: dayStart, lte: dayEnd },
            estado: { in: ['PENDENTE', 'CONFIRMADO', 'EM_PROGRESSO'] },
        },
        select: { dataHora: true, duracao: true },
    });
    const occupied = appointments.map((a) => {
        // Convert UTC db time to Local Luanda time string "HH:mm"
        const tzTime = (0, date_fns_tz_1.formatInTimeZone)(a.dataHora, TZ, 'HH:mm');
        const startMins = toMinutes(tzTime);
        return { start: startMins, end: startMins + a.duracao };
    });
    // Now in Luanda Timezone
    const now = new Date();
    const todayStr = (0, date_fns_tz_1.formatInTimeZone)(now, TZ, 'yyyy-MM-dd');
    const isToday = todayStr === dataStr;
    // Calculate current minutes in Luanda to lock past slots + 1h notice
    const HORAS_ANTECEDENCIA = 1; // From rules 
    const nowLuandaTime = (0, date_fns_tz_1.formatInTimeZone)(now, TZ, 'HH:mm');
    const lockThresholdMin = toMinutes(nowLuandaTime) + (HORAS_ANTECEDENCIA * 60);
    const available = candidates.filter((slotStr) => {
        const slotMin = toMinutes(slotStr);
        const slotEndMin = slotMin + duracao;
        if (isToday && slotMin <= lockThresholdMin)
            return false;
        return !occupied.some((occ) => slotMin < occ.end && slotEndMin > occ.start);
    });
    return available;
}
/**
 * Checks if a specific slot is available within a transaction (used during creation).
 */
async function isSlotAvailable(medicoId, dataHora, duracao, clinicaId) {
    const slotStart = dataHora;
    const slotEnd = new Date(dataHora.getTime() + duracao * 60000);
    // Fetch potential overlapping appointments
    // (starting before slotEnd and after 12 hours ago to limit search window)
    const windowStart = new Date(dataHora.getTime() - 12 * 60 * 60000);
    const possibleConflicts = await prisma_1.prisma.agendamento.findMany({
        where: {
            clinicaId,
            medicoId,
            estado: { in: ['PENDENTE', 'CONFIRMADO', 'EM_PROGRESSO'] },
            dataHora: {
                gte: windowStart,
                lt: slotEnd,
            },
        },
        select: { dataHora: true, duracao: true },
    });
    // Overlap condition: ExistingStart < RequestedEnd (handled by `lt: slotEnd` query)
    // AND ExistingEnd > RequestedStart
    const conflict = possibleConflicts.some(app => {
        const appEnd = new Date(app.dataHora.getTime() + app.duracao * 60000);
        return appEnd > slotStart;
    });
    return !conflict;
}
