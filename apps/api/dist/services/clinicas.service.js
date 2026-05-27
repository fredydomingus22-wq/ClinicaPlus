"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clinicasService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("../lib/prisma");
const AppError_1 = require("../lib/AppError");
const auth_service_1 = require("./auth.service");
const date_fns_1 = require("date-fns");
const subscricao_service_1 = require("./subscricao.service");
const types_1 = require("@clinicaplus/types");
const secretCrypto_1 = require("../lib/secretCrypto");
/**
 * Maps a Prisma Clinica record to a ClinicaDTO.
 * Never exposes raw DB fields like internal ids beyond what DTO specifies.
 */
function toClinicaDTO(c, config, contactos) {
    const dto = {
        id: c.id,
        nome: c.nome,
        slug: c.slug,
        logo: c.logo,
        logotipoUrl: c.logotipoUrl || c.logo,
        telefone: c.telefone,
        email: c.email,
        endereco: c.endereco,
        cidade: c.cidade,
        provincia: c.provincia,
        tipoEntidade: c.tipoEntidade ?? null,
        plano: c.plano,
        subscricaoEstado: c.subscricaoEstado,
        subscricaoValidaAte: c.subscricaoValidaAte ? c.subscricaoValidaAte.toISOString() : null,
        ativo: c.ativo,
        criadoEm: c.criadoEm.toISOString(),
        atualizadoEm: c.atualizadoEm.toISOString(),
        nif: c.nif,
        razaoSocial: c.razaoSocial,
        regimeFiscal: c.regimeFiscal || 'GERAL',
        agtSoftwareCert: '0/AGT/2026',
        enderecoPostal: c.enderecoPostal,
        serieDocFiscal: c.serieDocFiscal,
        agtPrivateKeyConfigured: !!c.agtPrivateKey,
        agtPublicKeyConfigured: !!c.agtPublicKey,
    };
    if (config) {
        dto.configuracao = {
            id: config.id,
            lembrete24h: config.lembrete24h,
            lembrete2h: config.lembrete2h,
            agendamentoOnline: config.agendamentoOnline,
            preTriagem: config.preTriagem,
            prontuarioCustom: config.prontuarioCustom,
            horasAntecedencia: config.horasAntecedencia,
            moedaSimbolo: config.moedaSimbolo,
            fusoHorario: config.fusoHorario,
            seguradoras: config.seguradoras,
        };
    }
    if (contactos && contactos.length > 0) {
        dto.contactos = contactos.map(cont => ({
            id: cont.id,
            clinicaId: cont.clinicaId,
            tipo: cont.tipo,
            valor: cont.valor,
            descricao: cont.descricao,
            ordem: cont.ordem,
            criadoEm: cont.criadoEm.toISOString(),
        }));
    }
    return dto;
}
// Slug must only contain lowercase letters, numbers and hyphens
const SLUG_REGEX = /^[a-z0-9-]{3,50}$/;
exports.clinicasService = {
    /**
     * Registers a new clinic with an ADMIN user and default configuration.
     * Returns the ClinicaDTO and tokens for immediate login.
     */
    async registar(data) {
        // Validate slug format
        if (!SLUG_REGEX.test(data.slug)) {
            throw new AppError_1.AppError('Slug inválido. Utilize apenas letras minúsculas, números e hífens (3–50 caracteres).', 400, 'INVALID_SLUG');
        }
        // Check slug uniqueness (409 if taken)
        const existing = await prisma_1.prisma.clinica.findUnique({ where: { slug: data.slug } });
        if (existing) {
            throw new AppError_1.AppError('Este slug já está em uso. Escolha outro.', 409, 'SLUG_TAKEN');
        }
        const passwordHash = await bcryptjs_1.default.hash(data.adminPassword, 12);
        // Create Clinica + ADMIN user + ConfiguracaoClinica in one transaction
        const clinica = await prisma_1.prisma.$transaction(async (tx) => {
            const newClinica = await tx.clinica.create({
                data: {
                    nome: data.nome,
                    slug: data.slug,
                    email: data.email,
                    logo: data.logo || null,
                    telefone: data.telefone || null,
                    endereco: data.endereco || null,
                    cidade: data.cidade || null,
                    provincia: data.provincia || null,
                    plano: data.plano,
                },
            });
            await tx.utilizador.create({
                data: {
                    clinicaId: newClinica.id,
                    nome: data.adminNome,
                    email: data.adminEmail,
                    passwordHash,
                    papel: 'ADMIN',
                },
            });
            // Create default ConfiguracaoClinica
            await tx.configuracaoClinica.create({
                data: {
                    clinicaId: newClinica.id,
                    lembrete24h: true,
                    lembrete2h: true,
                    agendamentoOnline: false,
                    preTriagem: true,
                    prontuarioCustom: false,
                    horasAntecedencia: 24,
                    moedaSimbolo: 'Kz',
                    fusoHorario: 'Africa/Luanda',
                },
            });
            // Create initial Trial subscription (Passo 2)
            await subscricao_service_1.subscricaoService.criarNovaSubscricao({
                clinicaId: newClinica.id,
                plano: types_1.Plano.BASICO,
                estado: types_1.EstadoSubscricao.TRIAL,
                validaAte: (0, date_fns_1.endOfDay)((0, date_fns_1.addDays)(new Date(), 7)),
                razao: types_1.RazaoMudancaPlano.UPGRADE_MANUAL, // Trial inicial
                alteradoPor: 'sistema',
            }, tx);
            return newClinica;
        });
        // Find the newly created ADMIN user to issue tokens
        const adminUser = await prisma_1.prisma.utilizador.findUniqueOrThrow({
            where: { clinicaId_email: { clinicaId: clinica.id, email: data.adminEmail } },
            include: {
                paciente: true,
                medico: { include: { especialidade: true } }
            }
        });
        const { accessToken, refreshToken } = await auth_service_1.authService._issueTokens(adminUser);
        const fullClinica = await this.getMe(clinica.id);
        return {
            clinica: fullClinica,
            admin: {
                id: adminUser.id,
                nome: adminUser.nome,
                email: adminUser.email,
                papel: adminUser.papel,
            },
            accessToken,
            refreshToken,
        };
    },
    /**
     * Checks if a slug is available for registration.
     */
    async verificarSlug(slug) {
        if (!SLUG_REGEX.test(slug)) {
            return { disponivel: false };
        }
        const existing = await prisma_1.prisma.clinica.findUnique({ where: { slug } });
        return { disponivel: !existing };
    },
    /**
     * Returns the ClinicaDTO for the given clinicaId (used for ADMIN's "me" endpoint).
     */
    async getMe(clinicaId) {
        const clinica = await prisma_1.prisma.clinica.findUnique({
            where: { id: clinicaId },
            include: {
                configuracao: true,
                contactos: { orderBy: { ordem: 'asc' } }
            },
        });
        if (!clinica) {
            throw new AppError_1.AppError('Clínica não encontrada', 404, 'NOT_FOUND');
        }
        return toClinicaDTO(clinica, clinica.configuracao, clinica.contactos);
    },
    /**
     * Updates editable fields of the clinic. Slug and plano cannot be changed here.
     */
    async update(clinicaId, data) {
        // Prevent changing slug or plano via this endpoint
        const { configuracao, ...safeData } = data;
        // Normalizar strings vazias e encriptar segredos (nunca guardar em claro)
        const normalizeEmpty = (v) => {
            if (v === undefined)
                return undefined;
            if (v === null)
                return null;
            if (typeof v !== 'string')
                return undefined;
            const trimmed = v.trim();
            return trimmed === '' ? null : trimmed;
        };
        const maybeEncrypt = (v) => {
            if (v === undefined)
                return undefined;
            if (v === null)
                return null;
            // Evitar dupla-encriptação
            if (v.startsWith('v1:'))
                return v;
            return (0, secretCrypto_1.encryptSecret)(v);
        };
        // Campos fiscais sensíveis (AGT)
        safeData.agtPrivateKey = maybeEncrypt(normalizeEmpty(safeData.agtPrivateKey) ?? undefined);
        safeData.agtPublicKey = maybeEncrypt(normalizeEmpty(safeData.agtPublicKey) ?? undefined);
        // Sync logo and logotipoUrl if any is provided
        if (safeData.logo && !safeData.logotipoUrl) {
            safeData.logotipoUrl = safeData.logo;
        }
        else if (safeData.logotipoUrl && !safeData.logo) {
            safeData.logo = safeData.logotipoUrl;
        }
        const clinica = await prisma_1.prisma.clinica.update({
            where: { id: clinicaId },
            data: {
                ...safeData,
                configuracao: configuracao ? {
                    upsert: {
                        create: configuracao,
                        update: configuracao
                    }
                } : undefined
            },
            include: {
                configuracao: true,
                contactos: { orderBy: { ordem: 'asc' } }
            },
        });
        return toClinicaDTO(clinica, clinica.configuracao, clinica.contactos);
    },
    /**
     * Adds a new contact or updates all if a full list is provided.
     * For simplicity, let's allow a full list update or single operations.
     */
    async updateContactos(clinicaId, contactos) {
        await prisma_1.prisma.$transaction(async (tx) => {
            // Delete all and recreate to ensure order and consistency
            await tx.contactoClinica.deleteMany({ where: { clinicaId } });
            await tx.contactoClinica.createMany({
                data: contactos.map((c, index) => ({
                    clinicaId,
                    tipo: c.tipo,
                    valor: c.valor,
                    descricao: c.descricao || null,
                    ordem: c.ordem ?? index,
                }))
            });
        });
        return this.getMe(clinicaId);
    },
};
