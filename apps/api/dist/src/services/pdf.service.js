"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pdfService = exports.PdfService = void 0;
const puppeteer_1 = __importDefault(require("puppeteer"));
const prisma_1 = require("../lib/prisma");
const AppError_1 = require("../lib/AppError");
/**
 * Serviço de geração de PDFs parametrizados por tenant usando Puppeteer
 */
class PdfService {
    constructor() {
        this.browser = null;
    }
    async getBrowser() {
        if (!this.browser) {
            // Usar Chrome instalado no sistema se disponível, ou pular download
            const launchOptions = {
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            };
            if (process.env.CHROME_EXECUTABLE_PATH) {
                launchOptions.executablePath = process.env.CHROME_EXECUTABLE_PATH;
            }
            this.browser = await puppeteer_1.default.launch(launchOptions);
        }
        return this.browser;
    }
    /**
     * Gera HTML para relatório de consulta completo
     */
    generateConsultaHtml(data, config) {
        const formatDate = (date) => new Date(date).toLocaleDateString('pt-PT');
        const formatTime = (date) => new Date(date).toLocaleTimeString('pt-PT');
        return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.4; color: #333; }
    .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
    .title { font-size: 20px; font-weight: bold; text-align: center; margin-bottom: 10px; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 14px; font-weight: bold; margin-bottom: 8px; }
    .label { font-weight: bold; }
    .table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    .table th { background-color: #f5f5f5; }
  </style>
</head>
<body>
  <div class="header">
    ${config.logo ? `<img src="${config.logo}" alt="Logo" style="height: 50px;">` : ''}
    <div class="title">Relatório de Consulta</div>
  </div>

  <div class="section">
    <div class="section-title">Dados do Paciente</div>
    <p><span class="label">Nome:</span> ${data.paciente.nome}</p>
    <p><span class="label">Data de Nascimento:</span> ${formatDate(data.paciente.dataNascimento)}</p>
    ${data.paciente.telefone ? `<p><span class="label">Telefone:</span> ${data.paciente.telefone}</p>` : ''}
    ${data.paciente.email ? `<p><span class="label">Email:</span> ${data.paciente.email}</p>` : ''}
  </div>

  <div class="section">
    <div class="section-title">Dados do Médico</div>
    <p><span class="label">Nome:</span> ${data.medico.nome}</p>
    ${data.medico.especialidade ? `<p><span class="label">Especialidade:</span> ${data.medico.especialidade}</p>` : ''}
  </div>

  <div class="section">
    <div class="section-title">Dados da Consulta</div>
    <p><span class="label">Data:</span> ${formatDate(data.agendamento.data)} ${formatTime(data.agendamento.data)}</p>
    <p><span class="label">Tipo:</span> ${data.agendamento.tipo}</p>
  </div>

  ${data.anamnese ? `
  <div class="section">
    <div class="section-title">Anamnese</div>
    <table class="table">
      ${Object.entries(data.anamnese).map(([key, value]) => `
        <tr>
          <td><span class="label">${key.replace(/_/g, ' ')}:</span></td>
          <td>${value}</td>
        </tr>
      `).join('')}
    </table>
  </div>
  ` : ''}

  ${data.odontograma && data.odontograma.length > 0 ? `
  <div class="section">
    <div class="section-title">Odontograma</div>
    <table class="table">
      ${data.odontograma.map((marcacao) => `
        <tr>
          <td>Dente ${marcacao.numeroDente}</td>
          <td>Face ${marcacao.face}</td>
          <td>${marcacao.status}</td>
        </tr>
      `).join('')}
    </table>
  </div>
  ` : ''}
</body>
</html>
    `;
    }
    /**
     * Gera HTML para resumo da consulta
     */
    generateResumoHtml(data) {
        const formatDate = (date) => new Date(date).toLocaleDateString('pt-PT');
        const formatTime = (date) => new Date(date).toLocaleTimeString('pt-PT');
        return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.4; color: #333; }
    .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
    .title { font-size: 20px; font-weight: bold; text-align: center; margin-bottom: 10px; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 14px; font-weight: bold; margin-bottom: 8px; }
    .label { font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">Resumo da Consulta</div>
  </div>

  <div class="section">
    <div class="section-title">Paciente</div>
    <p>${data.paciente.nome}</p>
    <p>Nascido em: ${formatDate(data.paciente.dataNascimento)}</p>
  </div>

  <div class="section">
    <div class="section-title">Consulta</div>
    <p><span class="label">Data:</span> ${formatDate(data.agendamento.data)} ${formatTime(data.agendamento.data)}</p>
    <p><span class="label">Tipo:</span> ${data.agendamento.tipo}</p>
    <p><span class="label">Médico:</span> ${data.medico.nome}</p>
  </div>

  <div style="margin-top: 40px; text-align: center; color: #999; font-size: 10px;">
    Gerado por ClinicaPlus
  </div>
</body>
</html>
    `;
    }
    /**
     * Gera PDF de relatório de consulta completo
     */
    async generateConsultaReport(agendamentoId, clinicaId) {
        if (!clinicaId) {
            throw new AppError_1.AppError('ClinicaId não fornecido', 400);
        }
        // Buscar dados da consulta
        const agendamento = await prisma_1.prisma.agendamento.findFirst({
            where: { id: agendamentoId, clinicaId },
            include: {
                paciente: true,
                medico: {
                    include: {
                        utilizador: true,
                    },
                },
                clinica: true,
            },
        });
        if (!agendamento) {
            throw new AppError_1.AppError('Agendamento não encontrado', 404);
        }
        // Buscar anamnese se existir
        const anamnese = await prisma_1.prisma.anamnese.findFirst({
            where: { agendamentoId },
        });
        // Buscar odontograma se existir
        const odontograma = await prisma_1.prisma.odontograma.findFirst({
            where: { agendamentoId },
        });
        const config = {
            clinicaId,
            logo: agendamento.clinica.logo ?? undefined,
        };
        const data = {
            paciente: {
                nome: agendamento.paciente.nome,
                dataNascimento: agendamento.paciente.dataNascimento,
                telefone: agendamento.paciente.telefone ?? undefined,
                email: agendamento.paciente.email ?? undefined,
            },
            medico: {
                nome: agendamento.medico.utilizador.nome,
                especialidade: agendamento.medico.especialidadeId ? 'Médico' : undefined,
            },
            agendamento: {
                data: agendamento.dataHora,
                tipo: agendamento.tipo,
            },
            anamnese: anamnese?.respostas ?? undefined,
            odontograma: odontograma?.marcacoes ?? undefined,
        };
        return this.generateConsultaPdf(data, config);
    }
    /**
     * Gera PDF de resumo da consulta
     */
    async generateResumoReport(agendamentoId, clinicaId) {
        if (!clinicaId) {
            throw new AppError_1.AppError('ClinicaId não fornecido', 400);
        }
        const agendamento = await prisma_1.prisma.agendamento.findFirst({
            where: { id: agendamentoId, clinicaId },
            include: {
                paciente: true,
                medico: {
                    include: {
                        utilizador: true,
                    },
                },
                clinica: true,
            },
        });
        if (!agendamento) {
            throw new AppError_1.AppError('Agendamento não encontrado', 404);
        }
        const data = {
            paciente: {
                nome: agendamento.paciente.nome,
                dataNascimento: agendamento.paciente.dataNascimento,
            },
            medico: {
                nome: agendamento.medico.utilizador.nome,
            },
            agendamento: {
                data: agendamento.dataHora,
                tipo: agendamento.tipo,
            },
        };
        return this.generateResumoPdf(data);
    }
    /**
     * Gera PDF de consulta completo usando Puppeteer
     */
    async generateConsultaPdf(data, config) {
        const browser = await this.getBrowser();
        const page = await browser.newPage();
        try {
            const html = this.generateConsultaHtml(data, config);
            await page.setContent(html, { waitUntil: 'networkidle0' });
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '20px',
                    right: '20px',
                    bottom: '20px',
                    left: '20px',
                },
            });
            return Buffer.from(pdfBuffer);
        }
        finally {
            await page.close();
        }
    }
    /**
     * Gera PDF de resumo usando Puppeteer
     */
    async generateResumoPdf(data) {
        const browser = await this.getBrowser();
        const page = await browser.newPage();
        try {
            const html = this.generateResumoHtml(data);
            await page.setContent(html, { waitUntil: 'networkidle0' });
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '20px',
                    right: '20px',
                    bottom: '20px',
                    left: '20px',
                },
            });
            return Buffer.from(pdfBuffer);
        }
        finally {
            await page.close();
        }
    }
    /**
     * Fecha o browser Puppeteer
     */
    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
}
exports.PdfService = PdfService;
exports.pdfService = new PdfService();
