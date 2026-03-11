import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generatePatientNumber } from '../../services/patientNumber.service';
import { prisma } from '../../lib/prisma';

vi.mock('../../lib/prisma', () => ({
  prisma: {
    paciente: {
      findFirst: vi.fn(),
    },
  },
}));

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-06-10T09:00:00.000Z')); // Year 2026
});

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('patientNumber.service', () => {
  const clinicaId = 'c1';
  const prefix = 'P-2026-';

  it('generates P-2026-0001 when no patients exist for that year', async () => {
    vi.mocked(prisma.paciente.findFirst).mockResolvedValue(null);

    const result = await generatePatientNumber(clinicaId);

    expect(result).toBe(`${prefix}0001`);
    expect(prisma.paciente.findFirst).toHaveBeenCalledWith({
      where: {
        clinicaId,
        numeroPaciente: { startsWith: prefix },
      },
      orderBy: { numeroPaciente: 'desc' },
      select: { numeroPaciente: true },
    });
  });

  it('generates P-2026-0042 when last patient is P-2026-0041', async () => {
    vi.mocked(prisma.paciente.findFirst).mockResolvedValue({
      numeroPaciente: `${prefix}0041`,
    } as any);

    const result = await generatePatientNumber(clinicaId);

    expect(result).toBe(`${prefix}0042`);
  });

  it('pads with zeroes correctly (e.g. from 9 to 10 is 0010)', async () => {
    vi.mocked(prisma.paciente.findFirst).mockResolvedValue({
      numeroPaciente: `${prefix}0009`,
    } as any);

    const result = await generatePatientNumber(clinicaId);

    expect(result).toBe(`${prefix}0010`);
  });

  it('ignores patients from previous years (starts fresh at 0001)', async () => {
    // We already mocked findFirst to filter by prefix (`P-2026-`).
    // If there were `P-2025-0099`, it wouldn't be returned by findFirst due to where clause.
    // So findFirst resolves to null.
    vi.mocked(prisma.paciente.findFirst).mockResolvedValue(null);

    const result = await generatePatientNumber(clinicaId);

    expect(result).toBe(`${prefix}0001`);
  });
});
