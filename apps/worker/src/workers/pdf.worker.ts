import { Worker, Job } from 'bullmq';
import puppeteer from 'puppeteer';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { redis } from '../lib/redis';

interface PdfJobData {
  type: 'consulta' | 'resumo';
  agendamentoId: string;
  clinicaId: string;
}

interface PdfJobResult {
  success: boolean;
  pdfBuffer?: Buffer;
  error?: string;
}

/**
 * Worker para geração de PDFs usando Puppeteer.
 * Isolado do API para evitar memory leak e bloqueio de event loop.
 * Concurrency limitada a 2 para evitar sobrecarga de memória.
 */
export const pdfWorker = new Worker<PdfJobData, PdfJobResult>(
  'pdf-generation',
  async (job: Job<PdfJobData>) => {
    const { type, agendamentoId, clinicaId } = job.data;
    logger.info({ jobId: job.id, type, agendamentoId }, 'Starting PDF generation');

    let browser;
    try {
      // 1. Buscar dados do agendamento
      const agendamento = await prisma.agendamento.findUnique({
        where: { id: agendamentoId },
        include: {
          paciente: true,
          medico: {
            include: {
              utilizador: true
            }
          },
          clinica: true
        }
      });

      if (!agendamento) {
        throw new Error('Agendamento não encontrado');
      }

      // 2. Inicializar Puppeteer
      const launchOptions: any = {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      };
      
      if (process.env.CHROME_EXECUTABLE_PATH) {
        launchOptions.executablePath = process.env.CHROME_EXECUTABLE_PATH;
      }
      
      browser = await puppeteer.launch(launchOptions);
      const page = await browser.newPage();

      // 3. Gerar HTML baseado no tipo
      const html = generateHtml(type, agendamento);

      // 4. Renderizar PDF
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
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

      await page.close();

      logger.info({ jobId: job.id, type }, 'PDF generation completed');
      return { success: true, pdfBuffer: Buffer.from(pdfBuffer) };
    } catch (err) {
      logger.error({ err, jobId: job.id, type }, 'PDF generation failed');
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  },
  { 
    connection: redis,
    concurrency: 2 // Limitar concurrency (Puppeteer pesado)
  }
);

pdfWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'PDF job completed');
});

pdfWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'PDF job failed');
});

// Helper function para gerar HTML (simplificado)
function generateHtml(type: string, agendamento: any): string {
  const formatDate = (date: Date) => new Date(date).toLocaleDateString('pt-PT');
  const formatTime = (date: Date) => new Date(date).toLocaleTimeString('pt-PT');

  const title = type === 'consulta' ? 'Relatório de Consulta' : 'Resumo da Consulta';

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
    <div class="title">${title}</div>
  </div>

  <div class="section">
    <div class="section-title">Dados do Paciente</div>
    <p><span class="label">Nome:</span> ${agendamento.paciente.nome}</p>
    <p><span class="label">Data de Nascimento:</span> ${formatDate(agendamento.paciente.dataNascimento)}</p>
  </div>

  <div class="section">
    <div class="section-title">Dados do Médico</div>
    <p><span class="label">Nome:</span> ${agendamento.medico.utilizador.nome}</p>
  </div>

  <div class="section">
    <div class="section-title">Agendamento</div>
    <p><span class="label">Data:</span> ${formatDate(agendamento.dataHora)}</p>
    <p><span class="label">Hora:</span> ${formatTime(agendamento.dataHora)}</p>
    <p><span class="label">Tipo:</span> ${agendamento.tipo}</p>
  </div>
</body>
</html>
  `;
}
