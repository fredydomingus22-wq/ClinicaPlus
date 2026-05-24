import { describe, expect, it, vi } from 'vitest';

const baseClinica = {
  id: 'clin-1',
  nome: 'Clínica Teste',
  slug: 'clinica-teste',
  tipoEntidade: 'EMPRESA',
  logo: null,
  logotipoUrl: null,
  telefone: null,
  email: 'clinica@teste.ao',
  endereco: null,
  cidade: null,
  provincia: null,
  plano: 'BASICO',
  ativo: true,
  criadoEm: new Date('2026-01-01T00:00:00.000Z'),
  atualizadoEm: new Date('2026-01-01T00:00:00.000Z'),
  subscricaoValidaAte: null,
  subscricaoEstado: 'TRIAL',
  nif: '5000000000',
  razaoSocial: 'Clinica Teste Lda',
  regimeFiscal: 'GERAL',
  agtSoftwareCert: null,
  enderecoPostal: 'Luanda',
  serieDocFiscal: 'CPLS',
  agtPrivateKey: null,
  agtPublicKey: null,
} as any;

const mockPrisma = {
  clinica: {
    update: vi.fn(),
  },
} as any;

vi.mock('../../lib/prisma', () => ({
  prisma: mockPrisma,
}));

import { clinicasService } from '../../services/clinicas.service';

describe('clinicasService.update (fiscal/AGT secrets)', () => {
  it('deve encriptar segredos AGT antes de guardar e devolver apenas flags', async () => {
    mockPrisma.clinica.update.mockImplementation(async (args: any) => {
      // simular que a DB devolve exactamente o que foi guardado
      return {
        ...baseClinica,
        ...args.data,
        configuracao: null,
        contactos: [],
      };
    });

    const result = await clinicasService.update(
      baseClinica.id,
      {
        agtPrivateKey: '-----BEGIN RSA PRIVATE KEY-----\nabc\n-----END RSA PRIVATE KEY-----',
        agtPublicKey: '-----BEGIN PUBLIC KEY-----\ndef\n-----END PUBLIC KEY-----',
      } as any
    );

    expect(mockPrisma.clinica.update).toHaveBeenCalledTimes(1);
    const args = mockPrisma.clinica.update.mock.calls[0]![0];

    expect(args.data.agtPrivateKey).toMatch(/^v1:/);
    expect(args.data.agtPublicKey).toMatch(/^v1:/);

    expect(result.agtPrivateKeyConfigured).toBe(true);
    expect(result.agtPublicKeyConfigured).toBe(true);

    // Garantia: não devolver segredos no DTO
    expect('agtPrivateKey' in (result as any)).toBe(false);
    expect('agtPublicKey' in (result as any)).toBe(false);
  });

  it('não deve re-encriptar valores já encriptados (prefixo v1:)', async () => {
    mockPrisma.clinica.update.mockImplementation(async (args: any) => {
      return {
        ...baseClinica,
        ...args.data,
        configuracao: null,
        contactos: [],
      };
    });

    const alreadyEncrypted = 'v1:aaaa:bbbb:cccc';
    await clinicasService.update(
      baseClinica.id,
      {
        agtPrivateKey: alreadyEncrypted,
      } as any
    );

    const args = mockPrisma.clinica.update.mock.calls.at(-1)![0];
    expect(args.data.agtPrivateKey).toBe(alreadyEncrypted);
  });
});
