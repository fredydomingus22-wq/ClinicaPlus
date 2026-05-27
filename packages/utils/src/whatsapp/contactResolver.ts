export interface WhatsAppContact {
  phone: string;
  jid: string;
  name: string;
  type: 'paciente' | 'utilizador';
  id: string;
}

export class ContactNotFoundError extends Error {
  constructor(type: string, id: string) {
    super(`${type} com ID ${id} não encontrado ou sem telefone`);
    this.name = 'ContactNotFoundError';
  }
}

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
