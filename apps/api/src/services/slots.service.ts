import { prisma } from '../lib/prisma';
import type { MedicoHorario } from '@clinicaplus/types';
import { formatInTimeZone } from 'date-fns-tz';

// Map JS Date.getDay() to horario keys (0=Sunday, 1=Monday, ...)
const DAY_MAP: Record<number, keyof MedicoHorario> = {
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
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/**
 * Converts total minutes from midnight to "HH:MM" string.
 */
function toHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Returns available appointment slot strings ["08:00", "08:30", ...] for a
 * given doctor on a given date, excluding occupied slots and breaks.
 */
export async function getAvailableSlots(
  medicoId: string,
  dataStr: string, // "YYYY-MM-DD"
  clinicaId: string
): Promise<string[]> {
  const medico = await prisma.medico.findUnique({ where: { id: medicoId } });
  if (!medico || medico.clinicaId !== clinicaId || !medico.ativo) return [];

  const horario = medico.horario as MedicoHorario;
  const duracao = medico.duracaoConsulta; // minutes

  // Determine day of week for the requested date avoiding timezone shifts
  const [yyyy, mm, dd] = dataStr.split('-').map(Number);
  const dateObj = new Date(yyyy!, mm! - 1, dd!);
  const dayKey = DAY_MAP[dateObj.getDay()];
  if (!dayKey) return [];

  const diaConfig = horario[dayKey];
  if (!diaConfig?.ativo || !diaConfig.inicio || !diaConfig.fim) return [];

  const start = toMinutes(diaConfig.inicio);
  const end = toMinutes(diaConfig.fim);
  const pausaStart = diaConfig.pausaInicio ? toMinutes(diaConfig.pausaInicio) : null;
  const pausaEnd = diaConfig.pausaFim ? toMinutes(diaConfig.pausaFim) : null;

  // Generate candidates
  const candidates: string[] = [];
  for (let t = start; t + duracao <= end; t += duracao) {
    if (pausaStart !== null && pausaEnd !== null) {
      const slotEnd = t + duracao;
      if (t < pausaEnd && slotEnd > pausaStart) continue; 
    }
    candidates.push(toHHMM(t));
  }

  // Fetch active appointments that day
  const dayStart = new Date(`${dataStr}T00:00:00.000Z`);
  const dayEnd = new Date(`${dataStr}T23:59:59.999Z`);

  const appointments = await prisma.agendamento.findMany({
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
    const tzTime = formatInTimeZone(a.dataHora, TZ, 'HH:mm');
    const startMins = toMinutes(tzTime);
    return { start: startMins, end: startMins + a.duracao };
  });

  // Now in Luanda Timezone
  const now = new Date();
  const todayStr = formatInTimeZone(now, TZ, 'yyyy-MM-dd');
  const isToday = todayStr === dataStr;
  
  // Calculate current minutes in Luanda to lock past slots + 1h notice
  const HORAS_ANTECEDENCIA = 1; // From rules 
  const nowLuandaTime = formatInTimeZone(now, TZ, 'HH:mm');
  const lockThresholdMin = toMinutes(nowLuandaTime) + (HORAS_ANTECEDENCIA * 60);

  const available = candidates.filter((slotStr) => {
    const slotMin = toMinutes(slotStr);
    const slotEndMin = slotMin + duracao;

    if (isToday && slotMin <= lockThresholdMin) return false;

    return !occupied.some((occ) => slotMin < occ.end && slotEndMin > occ.start);
  });

  return available;
}

/**
 * Checks if a specific slot is available within a transaction (used during creation).
 */
export async function isSlotAvailable(
  medicoId: string,
  dataHora: Date,
  duracao: number,
  clinicaId: string
): Promise<boolean> {
  const slotStart = dataHora;
  const slotEnd = new Date(dataHora.getTime() + duracao * 60_000);

  // Fetch potential overlapping appointments
  // (starting before slotEnd and after 12 hours ago to limit search window)
  const windowStart = new Date(dataHora.getTime() - 12 * 60 * 60_000);

  const possibleConflicts = await prisma.agendamento.findMany({
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
    const appEnd = new Date(app.dataHora.getTime() + app.duracao * 60_000);
    return appEnd > slotStart;
  });

  return !conflict;
}
