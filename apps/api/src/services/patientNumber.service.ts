import { prisma } from '../lib/prisma';

/**
 * Generates a sequential patient number for a given clinic and year.
 * Format: P-2026-0001, P-2026-0042, etc.
 * Uses findFirst with orderBy desc on numeroPaciente to find the last used number.
 * Thread-safe under normal load — no distributed locking needed for this use case.
 */
export async function generatePatientNumber(clinicaId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `P-${year}-`;

  // Find the highest patient number for this clinic in the current year
  const last = await prisma.paciente.findFirst({
    where: {
      clinicaId,
      numeroPaciente: { startsWith: prefix },
    },
    orderBy: { numeroPaciente: 'desc' },
    select: { numeroPaciente: true },
  });

  let nextSeq = 1;
  if (last) {
    // Extract the sequence number from "P-YYYY-NNNN"
    const parts = last.numeroPaciente.split('-');
    const lastSeq = parseInt(parts[2] ?? '0', 10);
    nextSeq = lastSeq + 1;
  }

  // Zero-pad to 4 digits (P-2026-0001 ... P-2026-9999+)
  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}
