import { prisma } from '../prisma';
import { normalizePhoneNumber } from './phoneNormalizer';
import { logger } from '../logger';

/**
 * Informações de contato para notificação WhatsApp
 */
export interface WhatsAppContact {
  phone: string;           // Número normalizado (+244923456789)
  jid: string;             // JID para Evolution API (244923456789@s.whatsapp.net)
  name: string;            // Nome para personalização
  type: 'paciente' | 'utilizador';
  id: string;              // ID do registro
}

/**
 * Erro quando contato não encontrado
 */
export class ContactNotFoundError extends Error {
  constructor(type: string, id: string) {
    super(`${type} com ID ${id} não encontrado ou sem telefone`);
    this.name = 'ContactNotFoundError';
  }
}

/**
 * Busca informações de contato de um paciente para notificação WhatsApp
 * @param pacienteId - ID do paciente
 * @param clinicaId - ID da clínica (para validação de segurança)
 * @returns Informações de contato normalizadas
 */
export async function getPacienteContact(
  pacienteId: string,
  clinicaId: string
): Promise<WhatsAppContact> {
  const paciente = await prisma.paciente.findFirst({
    where: {
      id: pacienteId,
      clinicaId,
      ativo: true,
    },
    select: {
      id: true,
      nome: true,
      telefone: true,
    },
  });

  if (!paciente || !paciente.telefone) {
    throw new ContactNotFoundError('Paciente', pacienteId);
  }

  const normalizedPhone = normalizePhoneNumber(paciente.telefone);
  const jid = `${normalizedPhone.replace('+', '')}@s.whatsapp.net`;

  return {
    phone: normalizedPhone,
    jid,
    name: paciente.nome,
    type: 'paciente',
    id: paciente.id,
  };
}

/**
 * Busca informações de contato de um utilizador para notificação WhatsApp
 * @param utilizadorId - ID do utilizador
 * @param clinicaId - ID da clínica (para validação de segurança)
 * @returns Informações de contato normalizadas
 */
export async function getUtilizadorContact(
  utilizadorId: string,
  clinicaId?: string
): Promise<WhatsAppContact> {
  const utilizador = await prisma.utilizador.findFirst({
    where: {
      id: utilizadorId,
      ...(clinicaId ? { clinicaId } : {}),
      ativo: true,
    },
    select: {
      id: true,
      nome: true,
      paciente: {
        select: {
          telefone: true,
        },
      },
    },
  });

  if (!utilizador) {
    throw new ContactNotFoundError('Utilizador', utilizadorId);
  }

  // Tenta buscar telefone do paciente associado
  const telefone = utilizador.paciente?.telefone;

  if (!telefone) {
    throw new ContactNotFoundError('Utilizador sem telefone', utilizadorId);
  }

  const normalizedPhone = normalizePhoneNumber(telefone);
  const jid = `${normalizedPhone.replace('+', '')}@s.whatsapp.net`;

  return {
    phone: normalizedPhone,
    jid,
    name: utilizador.nome,
    type: 'utilizador',
    id: utilizador.id,
  };
}

/**
 * Busca contato por ID genérico (paciente ou utilizador)
 * @param id - ID do registro
 * @param type - Tipo de registro
 * @param clinicaId - ID da clínica
 * @returns Informações de contato normalizadas
 */
export async function getContact(
  id: string,
  type: 'paciente' | 'utilizador',
  clinicaId: string
): Promise<WhatsAppContact> {
  if (type === 'paciente') {
    return getPacienteContact(id, clinicaId);
  }
  return getUtilizadorContact(id, clinicaId);
}

/**
 * Busca múltiplos contatos para envio em massa
 * @param ids - Array de IDs
 * @param type - Tipo de registro
 * @param clinicaId - ID da clínica
 * @returns Array de informações de contato
 */
export async function getContacts(
  ids: string[],
  type: 'paciente' | 'utilizador',
  clinicaId: string
): Promise<WhatsAppContact[]> {
  const contacts: WhatsAppContact[] = [];
  const errors: { id: string; error: string }[] = [];

  for (const id of ids) {
    try {
      const contact = await getContact(id, type, clinicaId);
      contacts.push(contact);
    } catch (error) {
      errors.push({
        id,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  if (errors.length > 0) {
    logger.warn({ errors }, `[WhatsApp] ${errors.length} contatos não encontrados`);
  }

  return contacts;
}

/**
 * Formata saudação personalizada
 * @param name - Nome do contato
 * @param formal - Se deve usar tratamento formal (Dr./Dra.)
 * @returns Saudação formatada
 */
export function formatGreeting(name: string, formal: boolean = false): string {
  const firstName = name.split(' ')[0];
  
  if (formal) {
    // Verifica se nome parece ser médico (Dr./Dra.)
    if (name.toLowerCase().includes('dr.') || name.toLowerCase().includes('dra.')) {
      return `Olá, ${name}`;
    }
    return `Olá, ${firstName}`;
  }
  
  return `Olá, ${firstName}`;
}
