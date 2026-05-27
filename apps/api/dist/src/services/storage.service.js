"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageService = void 0;
const config_1 = require("../lib/config");
const supabase_1 = require("../lib/supabase");
const AppError_1 = require("../lib/AppError");
const prisma_1 = require("../lib/prisma");
const logger_1 = require("../lib/logger");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
exports.storageService = {
    /**
     * Generates a signed upload URL for Supabase OR a localized upload signal
     */
    async getUploadUrl(clinicaId, entityType, entityId, fileName) {
        const ext = fileName.split('.').pop() || 'png';
        const filePath = `${clinicaId}/${entityType}/${entityId}_${Date.now()}.${ext}`;
        const provider = config_1.config.STORAGE_PROVIDER;
        if (provider === 'supabase') {
            const bucket = config_1.config.SUPABASE_PUBLIC_BUCKET || 'assets';
            const { data, error } = await supabase_1.supabase.storage
                .from(bucket)
                .createSignedUploadUrl(filePath);
            if (error || !data) {
                logger_1.logger.error({ error }, 'Supabase upload URL error');
                throw new AppError_1.AppError(`Erro ao gerar URL de upload Cloud: ${error?.message || 'Erro desconhecido'}`, 500);
            }
            return { uploadUrl: data.signedUrl, path: filePath, provider: 'supabase' };
        }
        // Provider local devolve a rota interna com o path
        return { uploadUrl: `/api/upload/local`, path: filePath, provider: 'local' };
    },
    /**
     * Confirms the upload and finalizes changing the string on the DB
     */
    async confirmUpload(clinicaId, entityType, entityId, filePath, provider, base64Data) {
        let publicUrl;
        if (provider === 'supabase') {
            const bucket = config_1.config.SUPABASE_PUBLIC_BUCKET || 'assets';
            const { data } = supabase_1.supabase.storage
                .from(bucket)
                .getPublicUrl(filePath);
            publicUrl = data.publicUrl;
        }
        else {
            // Local storage: salvar arquivo e retornar URL pública
            if (!base64Data)
                throw new AppError_1.AppError('Dados base64 ausentes no modo local', 400);
            // Extrair dados base64 (remover prefixo data:...;base64,)
            const base64Content = base64Data.includes(',')
                ? base64Data.split(',')[1]
                : base64Data;
            if (!base64Content)
                throw new AppError_1.AppError('Conteúdo base64 inválido', 400);
            const buffer = Buffer.from(base64Content, 'base64');
            const uploadDir = path_1.default.join(process.cwd(), 'uploads');
            const fullPath = path_1.default.join(uploadDir, filePath);
            // Criar subdiretórios se necessário
            const dir = path_1.default.dirname(fullPath);
            await fs_1.promises.mkdir(dir, { recursive: true });
            // Escrever arquivo
            await fs_1.promises.writeFile(fullPath, buffer);
            // Retornar URL pública local
            publicUrl = `${config_1.config.API_PUBLIC_URL}/uploads/${filePath}`;
            logger_1.logger.info({ path: filePath, size: buffer.length }, 'Arquivo salvo localmente');
        }
        // Guardar URL directamente no DB 
        try {
            switch (entityType) {
                case 'clinica_logo':
                    await prisma_1.prisma.clinica.update({
                        where: { id: clinicaId },
                        data: { logo: publicUrl }
                    });
                    break;
                case 'user_avatar': {
                    await prisma_1.prisma.utilizador.update({
                        where: { id: entityId, clinicaId },
                        data: { avatarUrl: publicUrl }
                    });
                    // Sync with Paciente if it exists (Medico doesn't have avatarUrl yet)
                    await prisma_1.prisma.paciente.updateMany({
                        where: { utilizadorId: entityId, clinicaId },
                        data: { avatarUrl: publicUrl }
                    });
                    break;
                }
                case 'paciente_avatar': {
                    await prisma_1.prisma.paciente.update({
                        where: { id: entityId, clinicaId },
                        data: { avatarUrl: publicUrl }
                    });
                    // Sync back to Utilizador if possible
                    const pac = await prisma_1.prisma.paciente.findUnique({ where: { id: entityId }, select: { utilizadorId: true } });
                    if (pac?.utilizadorId) {
                        await prisma_1.prisma.utilizador.update({
                            where: { id: pac.utilizadorId },
                            data: { avatarUrl: publicUrl }
                        });
                    }
                    break;
                }
                case 'contract_document':
                    // Persistência do documento é feita no serviço de contratos.
                    break;
            }
        }
        catch {
            throw new AppError_1.AppError(`Erro a gravar recurso na DB (${entityType})`, 500);
        }
        return publicUrl;
    }
};
