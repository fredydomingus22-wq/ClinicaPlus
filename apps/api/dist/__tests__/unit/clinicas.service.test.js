"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
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
};
const mockPrisma = {
    clinica: {
        update: vitest_1.vi.fn(),
    },
};
vitest_1.vi.mock('../../lib/prisma', () => ({
    prisma: mockPrisma,
}));
const clinicas_service_1 = require("../../services/clinicas.service");
(0, vitest_1.describe)('clinicasService.update (fiscal/AGT secrets)', () => {
    (0, vitest_1.it)('deve encriptar segredos AGT antes de guardar e devolver apenas flags', async () => {
        mockPrisma.clinica.update.mockImplementation(async (args) => {
            // simular que a DB devolve exactamente o que foi guardado
            return {
                ...baseClinica,
                ...args.data,
                configuracao: null,
                contactos: [],
            };
        });
        const result = await clinicas_service_1.clinicasService.update(baseClinica.id, {
            agtPrivateKey: '-----BEGIN RSA PRIVATE KEY-----\nabc\n-----END RSA PRIVATE KEY-----',
            agtPublicKey: '-----BEGIN PUBLIC KEY-----\ndef\n-----END PUBLIC KEY-----',
        });
        (0, vitest_1.expect)(mockPrisma.clinica.update).toHaveBeenCalledTimes(1);
        const args = mockPrisma.clinica.update.mock.calls[0][0];
        (0, vitest_1.expect)(args.data.agtPrivateKey).toMatch(/^v1:/);
        (0, vitest_1.expect)(args.data.agtPublicKey).toMatch(/^v1:/);
        (0, vitest_1.expect)(result.agtPrivateKeyConfigured).toBe(true);
        (0, vitest_1.expect)(result.agtPublicKeyConfigured).toBe(true);
        // Garantia: não devolver segredos no DTO
        (0, vitest_1.expect)('agtPrivateKey' in result).toBe(false);
        (0, vitest_1.expect)('agtPublicKey' in result).toBe(false);
    });
    (0, vitest_1.it)('não deve re-encriptar valores já encriptados (prefixo v1:)', async () => {
        mockPrisma.clinica.update.mockImplementation(async (args) => {
            return {
                ...baseClinica,
                ...args.data,
                configuracao: null,
                contactos: [],
            };
        });
        const alreadyEncrypted = 'v1:aaaa:bbbb:cccc';
        await clinicas_service_1.clinicasService.update(baseClinica.id, {
            agtPrivateKey: alreadyEncrypted,
        });
        const args = mockPrisma.clinica.update.mock.calls.at(-1)[0];
        (0, vitest_1.expect)(args.data.agtPrivateKey).toBe(alreadyEncrypted);
    });
});
