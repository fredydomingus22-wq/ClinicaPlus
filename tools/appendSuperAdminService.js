const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../services/superadmin.service.ts');
let content = fs.readFileSync(targetFile, 'utf8');

// Ensure imports
if (!content.includes("from '../lib/redis'")) {
    content = content.replace("import { logger } from '../lib/logger';", "import { logger } from '../lib/logger';\nimport { redis } from '../lib/redis';\nimport jwt from 'jsonwebtoken';\nimport { config } from '../lib/config';\nimport { auditLogService } from './auditLog.service';");
}

const newMethods = `
  // ─── SPRINT 11 PASSO 2 ─────────────────────────────────────────────────────

  async createImpersonation(clinicaId: string, adminId: string, motivo: string, currentSuperAdminId: string) {
    const targetAdmin = await prisma.utilizador.findFirst({
      where: { id: adminId, clinicaId }
    });
    
    if (!targetAdmin) {
      throw new AppError('Admin não encontrado nesta clínica', 404);
    }
    
    const crypto = await import('crypto');
    const sessionId = crypto.randomUUID();

    const token = jwt.sign(
      { sub: targetAdmin.id, clinicaId, papel: targetAdmin.papel, isImpersonated: true, impersonationId: sessionId },
      config.JWT_SECRET,
      { expiresIn: '30m' }
    );

    // Create DB Session
    const session = await prisma.impersonationSession.create({
      data: {
        id: sessionId,
        targetClinicaId: clinicaId,
        targetAdminId: adminId,
        superAdminId: currentSuperAdminId,
        motivo,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 mins
        ip: '127.0.0.1',
        token
      }
    });

    // Lógica para contornar auditlog cross-tenant (usamos ID do tenant alvo)
    await auditLogService.log(clinicaId, 'IMPERSONATION_STARTED', currentSuperAdminId, \`Impersonated via SuperAdmin\`, { motivo });

    return { token, expiresAt: session.expiresAt };
  },

  async suspenderClinica(id: string, motivo: string, adminId: string) {
    if (!motivo || Object.keys(motivo).length === 0) throw new AppError('Motivo é obrigatório', 400);
    // superadmin: cross-tenant mutation
    const clinica = await prisma.clinica.update({
      where: { id },
      data: {
        ativo: false,
        suspensaEm: new Date(),
        motivoSuspensao: typeof motivo === 'string' ? motivo : JSON.stringify(motivo)
      }
    });

    await auditLogService.log(id, 'CLINICA_SUSPENSA', adminId, \`Clínica suspensa\`, { motivo });
    return clinica;
  },

  async getHealthScores() {
    const cacheKey = 'superadmin:health_scores';
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    // superadmin: cross-tenant query
    const eventos = await prisma.sistemaEvento.groupBy({
      by: ['clinicaId'],
      where: { tipo: 'API_ERROR', severidade: 'ERROR', criadoEm: { gte: yesterday } },
      _count: { _all: true }
    });

    const scores = eventos.map(e => ({
      clinicaId: e.clinicaId,
      score: e._count._all >= 10 ? 'VERMELHO' : e._count._all >= 5 ? 'AMARELO' : 'VERDE',
      erros24h: e._count._all
    }));

    await redis.setex(cacheKey, 300, JSON.stringify(scores)); // 5 min TTL
    return scores;
  }
`;

if (!content.includes('suspenderClinica')) {
    // Find last closing brace associated with the object export
    const endMatch = content.lastIndexOf('};');
    
    if (endMatch !== -1) {
        content = content.slice(0, endMatch) + ',\n' + newMethods + content.slice(endMatch);
        fs.writeFileSync(targetFile, content);
        console.log("Serviços de SuperAdmin injetados com sucesso.");
    } else {
        console.error("Não foi possivel encontrar o final do serviço em superadmin.service.ts ");
    }
} else {
    console.log("Serviços já presentes.");
}
