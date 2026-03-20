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

const FOOTER = (): string => `
  <div style="background: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0; border-radius: 0 0 8px 8px; text-align: center;">
    <p style="color: #64748b; font-size: 12px; margin: 0;">
      Este é um email automático enviado pelo sistema ClinicaPlus.<br>
      Por favor, não responda a este endereço.<br>
      © 2026 ClinicaPlus — Gestão Clínica Inteligente
    </p>
  </div>
`;

export const emailTemplates = {
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
};
