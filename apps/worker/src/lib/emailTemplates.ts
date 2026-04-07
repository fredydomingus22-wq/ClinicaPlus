import { formatDateTime } from '@clinicaplus/utils';

const BASE_STYLE = `
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  max-width: 600px;
  margin: 0 auto;
  color: #1e293b;
  line-height: 1.6;
`;

const HEADER = (clinicaNome: string): string => `
  <div style="background: #2563eb; padding: 32px; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">ClinicaPlus</h1>
    <p style="color: #bfdbfe; margin: 4px 0 0; font-size: 14px; font-weight: 500;">${clinicaNome}</p>
  </div>
`;

const FOOTER = (contactos?: { tipo: string; valor: string; descricao?: string | null }[]): string => `
  <div style="background: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0; border-radius: 0 0 8px 8px; text-align: center;">
    ${contactos && contactos.length > 0 ? `
      <div style="margin-bottom: 20px; display: flex; flex-direction: column; gap: 8px; align-items: center; justify-content: center;">
        ${contactos.map(c => `
          <div style="font-size: 13px; color: #475569;">
            <span style="font-weight: 600; color: #1e293b;">${c.descricao || c.tipo}:</span> ${c.valor}
          </div>
        `).join('')}
      </div>
    ` : ''}
    <p style="color: #64748b; font-size: 12px; margin: 0;">
      Este é um email automático enviado pelo sistema ClinicaPlus.<br>
      Por favor, não responda a este endereço.<br>
      © 2026 ClinicaPlus — Gestão Clínica Inteligente
    </p>
  </div>
`;

export const emailTemplates = {
  confirmacao: (data: {
    pacienteNome: string;
    medicoNome: string;
    clinicaNome: string;
    dataHora: Date;
    tipo: string;
    contactos?: { tipo: string; valor: string; descricao?: string | null }[];
  }): string => `
    <div style="${BASE_STYLE}">
      ${HEADER(data.clinicaNome)}
      <div style="padding: 40px; background: white; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
        <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 20px;">Agendamento Confirmado</h2>
        <p>Olá, <strong>${data.pacienteNome}</strong>,</p>
        <p>Informamos que o seu agendamento foi confirmado com sucesso na nossa plataforma.</p>

        <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 24px 0; border-radius: 4px;">
          <p style="margin: 0 0 10px;"><strong>Data e Hora:</strong> ${formatDateTime(data.dataHora)}</p>
          <p style="margin: 0 0 10px;"><strong>Médico:</strong> Dr(a). ${data.medicoNome}</p>
          <p style="margin: 0;"><strong>Tipo de Serviço:</strong> ${data.tipo}</p>
        </div>

        <p style="margin: 24px 0; font-size: 14px; color: #475569;">
          <strong>Nota Importante:</strong> Recomendamos a chegada com 15 minutos de antecedência para os procedimentos de triagem.
        </p>
      </div>
      ${FOOTER(data.contactos)}
    </div>
  `,

  lembrete: (data: {
    pacienteNome: string;
    medicoNome: string;
    clinicaNome: string;
    dataHora: Date;
    horasAntecedencia: number;
    contactos?: { tipo: string; valor: string; descricao?: string | null }[];
  }): string => `
    <div style="${BASE_STYLE}">
      ${HEADER(data.clinicaNome)}
      <div style="padding: 40px; background: white; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
        <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 20px;">Lembrete de Consulta</h2>
        <p>Olá, <strong>${data.pacienteNome}</strong>,</p>
        <p>Este é um lembrete amigável de que tem uma consulta agendada para daqui a aproximadamente <strong>${data.horasAntecedencia} horas</strong>.</p>

        <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 20px; margin: 24px 0; border-radius: 4px;">
          <p style="margin: 0 0 10px;"><strong>Data e Hora:</strong> ${formatDateTime(data.dataHora)}</p>
          <p style="margin: 0;"><strong>Médico:</strong> Dr(a). ${data.medicoNome}</p>
        </div>

        <p style="color: #475569; font-size: 14px;">
          Caso não possa comparecer, por favor contacte a clínica o mais brevemente possível.
        </p>
      </div>
      ${FOOTER(data.contactos)}
    </div>
  `,

  avisoExpiracao: (data: {
    clinicaNome: string;
    diasRestantes: number;
    dataExpiracao: Date;
  }): string => `
    <div style="${BASE_STYLE}">
      ${HEADER(data.clinicaNome)}
      <div style="padding: 40px; background: white; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
        <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 20px;">A tua subscrição expira em breve</h2>
        <p>Olá,</p>
        <p>A subscrição da clínica <strong>${data.clinicaNome}</strong> termina em <strong>${data.diasRestantes} dias</strong> (${formatDateTime(data.dataExpiracao)}).</p>
        
        <p>Para evitar interrupções no serviço, recomendamos a renovação atempada do seu plano.</p>

        <div style="text-align: center; margin: 32px 0;">
          <a href="https://app.clinicaplus.ao/configuracoes/subscricao" style="background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 700; display: inline-block;">
            Renovar Subscrição
          </a>
        </div>
      </div>
      ${FOOTER()}
    </div>
  `,

  gracePeriod: (data: {
    clinicaNome: string;
    diasRestantes: number;
    dataExpiracao: Date;
  }): string => `
    <div style="${BASE_STYLE}">
      ${HEADER(data.clinicaNome)}
      <div style="padding: 40px; background: white; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
        <h2 style="margin: 0 0 16px; color: #f59e0b; font-size: 20px;">Subscrição Expirada — Período de Graça</h2>
        <p>Olá,</p>
        <p>Informamos que a subscrição da clínica <strong>${data.clinicaNome}</strong> expirou em ${formatDateTime(data.dataExpiracao)}.</p>
        
        <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 20px; margin: 24px 0; border-radius: 4px;">
          <p style="margin: 0;">Restam <strong>${data.diasRestantes} dias</strong> para regularizar a situação antes da suspensão da conta.</p>
        </div>

        <p>Para continuar a usufruir de todas as funcionalidades, por favor renove o seu plano no painel de configurações.</p>
      </div>
      ${FOOTER()}
    </div>
  `,

  contaSuspensa: (data: {
    clinicaNome: string;
  }): string => `
    <div style="${BASE_STYLE}">
      ${HEADER(data.clinicaNome)}
      <div style="padding: 40px; background: white; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
        <h2 style="margin: 0 0 16px; color: #dc2626; font-size: 20px;">Conta Suspensa — ClinicaPlus</h2>
        <p>Olá,</p>
        <p>Lamentamos informar que a conta da clínica <strong>${data.clinicaNome}</strong> foi suspensa por falta de pagamento após o período de graça.</p>
        
        <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 24px 0; border-radius: 4px;">
          <p style="margin: 0;">Neste momento, a conta encontra-se no plano <strong>BASÍCO</strong> e em modo de apenas leitura.</p>
        </div>

        <p>Para reactivar a conta e recuperar o acesso total, por favor entre em contacto com o suporte ou realize o pagamento no painel administrativo.</p>
      </div>
      ${FOOTER()}
    </div>
  `,
};
