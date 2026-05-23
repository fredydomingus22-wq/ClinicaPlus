import { config } from '../lib/config';
import { supabase } from '../lib/supabase';
import { AppError } from '../lib/AppError';
import { prisma } from '../lib/prisma';

export const storageService = {
  /**
   * Generates a signed upload URL for Supabase OR a localized upload signal
   */
  async getUploadUrl(
    clinicaId: string, 
    entityType: 'clinica_logo' | 'user_avatar' | 'paciente_avatar' | 'contract_document',
    entityId: string, 
    fileName: string
  ): Promise<{ uploadUrl: string; path: string; provider: 'supabase' | 'local' }> {
    const ext = fileName.split('.').pop() || 'png';
    const path = `${clinicaId}/${entityType}/${entityId}_${Date.now()}.${ext}`;

    const provider = config.STORAGE_PROVIDER;

    if (provider === 'supabase') {
      const bucket = config.SUPABASE_PUBLIC_BUCKET || 'assets';
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUploadUrl(path);

      if (error || !data) {
        throw new AppError('Erro ao gerar URL de upload Cloud', 500);
      }

      return { uploadUrl: data.signedUrl, path, provider: 'supabase' };
    }

    // Provider local devolve a rota interna com o path
    return { uploadUrl: `/api/upload/local`, path, provider: 'local' };
  },

  /**
   * Confirms the upload and finalizes changing the string on the DB
   */
  async confirmUpload(
    clinicaId: string, 
    entityType: 'clinica_logo' | 'user_avatar' | 'paciente_avatar' | 'contract_document',
    entityId: string, 
    path: string,
    provider: 'supabase' | 'local',
    base64Data?: string
  ): Promise<string> {
    let publicUrl: string;

    if (provider === 'supabase') {
       const bucket = config.SUPABASE_PUBLIC_BUCKET || 'assets';
       const { data } = supabase.storage
         .from(bucket)
         .getPublicUrl(path);
       publicUrl = data.publicUrl;
    } else {
       if (!base64Data) throw new AppError('Dados base64 ausentes no modo local', 400);
       publicUrl = base64Data;
    }

    // Guardar URL directamente no DB 
    try {
      switch (entityType) {
        case 'clinica_logo':
           await prisma.clinica.update({
             where: { id: clinicaId },
             data: { logo: publicUrl }
           });
           break;
        case 'user_avatar': {
           await prisma.utilizador.update({
             where: { id: entityId, clinicaId },
             data: { avatarUrl: publicUrl }
           });
           // Sync with Paciente if it exists (Medico doesn't have avatarUrl yet)
           await prisma.paciente.updateMany({
             where: { utilizadorId: entityId, clinicaId },
             data: { avatarUrl: publicUrl }
           });
           break;
        }
        case 'paciente_avatar': {
           await prisma.paciente.update({
             where: { id: entityId, clinicaId },
             data: { avatarUrl: publicUrl }
           });
           // Sync back to Utilizador if possible
           const pac = await prisma.paciente.findUnique({ where: { id: entityId }, select: { utilizadorId: true } });
           if (pac?.utilizadorId) {
             await prisma.utilizador.update({
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
    } catch {
      throw new AppError(`Erro a gravar recurso na DB (${entityType})`, 500);
    }
    
    return publicUrl;
  }
};
