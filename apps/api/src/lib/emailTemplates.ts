import { formatDateTime } from '@clinicaplus/utils';

/**
 * HTML Email Templates for ClinicaPlus
 * Compatible with most email clients.
 */

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

  cancelamento: (data: {
    pacienteNome: string;
    medicoNome: string;
    clinicaNome: string;
    dataHora: Date;
    motivo?: string;
    contactos?: { tipo: string; valor: string; descricao?: string | null }[];
  }): string => `
    <div style="${BASE_STYLE}">
      ${HEADER(data.clinicaNome)}
      <div style="padding: 40px; background: white; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
        <h2 style="margin: 0 0 16px; color: #dc2626; font-size: 20px;">Agendamento Cancelado</h2>
        <p>Olá, <strong>${data.pacienteNome}</strong>,</p>
        <p>Lamentamos informar que o seu agendamento foi cancelado.</p>

        <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 24px 0; border-radius: 4px;">
          <p style="margin: 0 0 10px;"><strong>Data Original:</strong> ${formatDateTime(data.dataHora)}</p>
          <p style="margin: 0 0 10px;"><strong>Médico:</strong> Dr(a). ${data.medicoNome}</p>
          ${data.motivo ? `<p style="margin: 0;"><strong>Motivo:</strong> ${data.motivo}</p>` : ''}
        </div>

        <p>Pode realizar um novo agendamento através do nosso portal ou entrando em contacto com a nossa receção.</p>
      </div>
      ${FOOTER(data.contactos)}
    </div>
  `,


  clinicaBoasVindas: (data: {
    nome: string;
    plano: string;
  }): string => `
    <div style="${BASE_STYLE}">
      ${HEADER('ClinicaPlus')}
      <div style="padding: 40px; background: white; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
        <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 22px;">Bem-vinda ao Futuro da Gestão Clínica</h2>
        <p>Olá, <strong>${data.nome}</strong>,</p>
        <p>É com grande satisfação que confirmamos o registo da sua clínica na plataforma <strong>ClinicaPlus</strong>.</p>
        
        <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 20px; margin: 24px 0; border-radius: 4px;">
          <p style="margin: 0 0 10px;"><strong>Estado:</strong> Ativada</p>
          <p style="margin: 0;"><strong>Plano Subscrito:</strong> ${data.plano}</p>
        </div>

        <p>A partir de agora, tem acesso a um conjunto completo de ferramentas para otimizar os seus agendamentos, triagens e prontuários eletrónicos.</p>
        
        <p style="margin-top: 24px;">O administrador da conta receberá um e-mail separado com as credenciais de acesso.</p>
      </div>
      ${FOOTER()}
    </div>
  `,

  adminBoasVindas: (data: {
    nome: string;
    email: string;
    url: string;
    senhaTemporaria: string;
    clinicaNome: string;
  }): string => `
    <div style="${BASE_STYLE}">
      ${HEADER(data.clinicaNome)}
      <div style="padding: 40px; background: white; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
        <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 20px;">Credenciais de Acesso Administrativo</h2>
        <p>Olá, <strong>${data.nome}</strong>,</p>
        <p>Foi designado(a) como administrador(a) da conta <strong>${data.clinicaNome}</strong> no ClinicaPlus.</p>
        
        <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 24px 0; border-radius: 4px;">
          <p style="margin: 0 0 10px;"><strong>URL de Acesso:</strong> ${data.url}</p>
          <p style="margin: 0 0 10px;"><strong>E-mail:</strong> ${data.email}</p>
          <p style="margin: 0;"><strong>Senha Temporária:</strong> <code style="background: #e2e8f0; padding: 4px 8px; border-radius: 4px; font-weight: bold;">${data.senhaTemporaria}</code></p>
        </div>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${data.url}" style="background-color: #2563eb; color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 700; display: inline-block;">
            Fazer Primeiro Login
          </a>
        </div>

        <p style="font-size: 13px; color: #dc2626; font-weight: 600;">
          Atenção: Por razões de segurança, altere a sua senha imediatamente após o primeiro acesso.
        </p>
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

  /**
   * Password reset email — sent when the user requests a password reset.
   */
  resetPassword: (data: {
    nome: string;
    resetUrl: string;
    expiresInMinutes: number;
  }): string => `
    <div style="${BASE_STYLE}">
      ${HEADER('ClinicaPlus')}
      <div style="padding: 40px; background: white; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
        <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 20px;">Recuperar Palavra-passe</h2>
        <p>Olá, <strong>${data.nome}</strong>,</p>
        <p>Recebemos um pedido para redefinir a palavra-passe da sua conta ClinicaPlus. Clique no botão abaixo para criar uma nova palavra-passe.</p>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${data.resetUrl}"
             style="display: inline-block; background: #2563eb; color: white; font-weight: 700; font-size: 15px;
                    padding: 14px 32px; border-radius: 8px; text-decoration: none; letter-spacing: -0.01em;">
            Redefinir Palavra-passe →
          </a>
        </div>

        <div style="background: #fefce8; border-left: 4px solid #eab308; padding: 16px 20px; margin: 24px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 13px; color: #713f12;">
            ⚠️ Este link expira em <strong>${data.expiresInMinutes} minutos</strong>. Após isso, precisará solicitar um novo link.
          </p>
        </div>

        <p style="font-size: 13px; color: #64748b;">
          Se não solicitou a redefinição da palavra-passe, ignore este e-mail. A sua conta permanece segura.
        </p>
        <p style="font-size: 13px; color: #64748b;">
          Se o botão não funcionar, copie e cole este URL no seu navegador:<br/>
          <a href="${data.resetUrl}" style="color: #2563eb; word-break: break-all;">${data.resetUrl}</a>
        </p>
      </div>
      ${FOOTER()}
    </div>
  `,
};
