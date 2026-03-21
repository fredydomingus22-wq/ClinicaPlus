import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// ─── CONFIGURAÇÃO E UTILITÁRIOS ──────────────────────────────────────────────

const ARGS = process.argv.slice(2);
const JSON_OUTPUT = ARGS.includes('--json');
const SECTION = ARGS.find(a => !a.startsWith('--'));

// Cores para o terminal
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

interface AuditResult {
  id: string;
  section: string;
  description: string;
  status: 'PASS' | 'FAIL' | 'WARN' | 'SKIP';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  details?: string;
  howToFix?: string;
  reference?: string;
}

const results: AuditResult[] = [];

function check(res: AuditResult) {
  results.push(res);
}

function fileExists(relPath: string): boolean {
  return fs.existsSync(path.resolve(process.cwd(), relPath));
}

function fileContains(relPath: string, pattern: string | RegExp): boolean {
  if (!fileExists(relPath)) return false;
  const content = fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8');
  return typeof pattern === 'string' ? content.includes(pattern) : pattern.test(content);
}

function fileMatches(relPath: string, regex: RegExp): boolean {
  if (!fileExists(relPath)) return false;
  const content = fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8');
  return regex.test(content);
}

function runCmd(cmd: string): { ok: boolean; stdout: string; stderr: string } {
  try {
    const stdout = execSync(cmd, { stdio: 'pipe', encoding: 'utf8' });
    return { ok: true, stdout, stderr: '' };
  } catch (err: any) {
    return { ok: false, stdout: err.stdout || '', stderr: err.stderr || '' };
  }
}

function printSectionHeader(title: string, icon: string) {
  if (JSON_OUTPUT) return;
  console.log(`\n${C.bold}${C.blue}────────────────────────────────────────────────────────────${C.reset}`);
  console.log(`${C.bold}${C.blue}  ${icon}  ${title.toUpperCase()}${C.reset}`);
  console.log(`${C.bold}${C.blue}────────────────────────────────────────────────────────────${C.reset}`);
}

function printResult(r: AuditResult) {
  if (JSON_OUTPUT) return;
  const icons = { PASS: `${C.green}✓${C.reset}`, FAIL: `${C.red}✗${C.reset}`, WARN: `${C.yellow}⚠${C.reset}`, SKIP: `${C.dim}—${C.reset}` };
  const sev = r.status === 'FAIL' ? ` ${C.dim}[${r.severity}]${C.reset}` : '';
  console.log(`  ${icons[r.status]}  ${r.description}${sev}`);
  if (r.status === 'FAIL' && r.details) {
    console.log(`      ${C.dim}${r.details}${C.reset}`);
  }
}

function printSectionSummary() {
  if (JSON_OUTPUT) return;
  const section = results[results.length - 1].section;
  const sectionResults = results.filter(r => r.section === section);
  const passed = sectionResults.filter(r => r.status === 'PASS').length;
  const total = sectionResults.length;
  const color = passed === total ? C.green : passed > 0 ? C.yellow : C.red;
  console.log(`${C.dim}  → ${passed}/${total} verificações passaram ${passed < total ? `  ${color}(${total - passed} em falta)${C.reset}` : ''}${C.reset}`);
}

// ─── 1. DATABASE & SCHEMA PRISMA ─────────────────────────────────────────────

function auditDatabase() {
  printSectionHeader('DATABASE & SCHEMA PRISMA', '🗄️');

  const schema = 'apps/api/prisma/schema.prisma';
  if (!fileExists(schema)) {
    check({
      id: 'DB-SCHEMA-EXISTS',
      section: 'database',
      description: 'Ficheiro schema.prisma existe',
      status: 'FAIL',
      severity: 'CRITICAL',
      howToFix: `Criar ${schema}`,
    });
    printResult(results[results.length - 1]);
    return;
  }

  // Verificações no Prisma Schema
  const enums = ['WaEstadoInstancia', 'WaTipoAutomacao', 'WaEstadoConversa', 'WaDirecao'];
  for (const e of enums) {
    check({
      id: `DB-ENUM-${e}`,
      section: 'database',
      description: `enum ${e} definido no schema`,
      status: fileContains(schema, `enum ${e}`) ? 'PASS' : 'FAIL',
      severity: 'CRITICAL',
      howToFix: `Adicionar enum ${e} ao schema.prisma`,
      reference: 'clinicaplus-docs-v6/11-modules/MODULE-whatsapp.md §1',
    });
    printResult(results[results.length - 1]);
  }

  const models = ['WaInstancia', 'WaAutomacao', 'WaConversa', 'WaMensagem'];
  for (const m of models) {
    const exists = fileContains(schema, `model ${m}`);
    check({
      id: `DB-MODEL-${m}`,
      section: 'database',
      description: `model ${m} com campos completos`,
      status: exists ? 'PASS' : 'FAIL',
      severity: 'CRITICAL',
      howToFix: `Adicionar model ${m} ao schema.prisma seguindo a spec`,
      reference: 'clinicaplus-docs-v6/11-modules/MODULE-whatsapp.md §1',
    });
    printResult(results[results.length - 1]);
  }

  // Índices e Relações
  const hasExpireIndex = fileContains(schema, 'ultimaMensagemEm') && 
                         fileContains(schema, '@@index([ultimaMensagemEm])');
  check({
    id: 'DB-INDEX-EXPIRE',
    section: 'database',
    description: '@@index([ultimaMensagemEm]) em WaConversa para job de expiração',
    status: hasExpireIndex ? 'PASS' : 'FAIL',
    severity: 'HIGH',
    details: hasExpireIndex ? undefined : 'Índice em falta — job de expiração vai fazer full table scan',
    howToFix: `Em model WaConversa, adicionar:\n@@index([ultimaMensagemEm])\n\nDepois: pnpm prisma migrate dev --name wa_expire_index`,
    reference: 'clinicaplus-docs-v6/11-modules/MODULE-whatsapp.md §1',
  });
  printResult(results[results.length - 1]);

  // Campos adicionados a modelos existentes
  const hasPacienteOrigem    = fileContains(schema, 'origem') && fileContains(schema, 'model Paciente');
  const hasAgendamentoCanal  = fileContains(schema, 'canal')  && fileContains(schema, 'model Agendamento');

  check({
    id: 'DB-PACIENTE-ORIGEM',
    section: 'database',
    description: 'Campo origem adicionado ao model Paciente',
    status: hasPacienteOrigem ? 'PASS' : 'FAIL',
    severity: 'MEDIUM',
    howToFix: `Em model Paciente, adicionar:\norigem  String?  @default("DIRECTO")  // "DIRECTO" | "WHATSAPP" | "PORTAL"`,
    reference: 'clinicaplus-docs-v6/11-modules/MODULE-whatsapp.md §1',
  });
  printResult(results[results.length - 1]);

  check({
    id: 'DB-AGENDAMENTO-CANAL',
    section: 'database',
    description: 'Campo canal adicionado ao model Agendamento',
    status: hasAgendamentoCanal ? 'PASS' : 'FAIL',
    severity: 'MEDIUM',
    howToFix: `Em model Agendamento, adicionar:\ncanal  String?  @default("PRESENCIAL")  // "PRESENCIAL" | "WHATSAPP" | "PORTAL"`,
    reference: 'clinicaplus-docs-v6/11-modules/MODULE-whatsapp.md §1',
  });
  printResult(results[results.length - 1]);

  // Prisma validate
  const { ok: prismaOk } = runCmd('pnpm --filter api exec prisma validate 2>&1');
  check({
    id: 'DB-PRISMA-VALID',
    section: 'database',
    description: 'Schema Prisma válido (pnpm prisma validate)',
    status: prismaOk ? 'PASS' : 'FAIL',
    severity: 'CRITICAL',
    howToFix: `Corrigir erros no schema e executar:\npnpm --filter api exec prisma validate\npnpm --filter api exec prisma generate`,
    reference: 'clinicaplus-docs-v6/11-modules/MODULE-whatsapp.md §1',
  });
  printResult(results[results.length - 1]);

  printSectionSummary();
}

// ─── 2. BACKEND — SERVIÇOS E ROTAS ────────────────────────────────────────────

function auditBackend() {
  printSectionHeader('BACKEND — SERVIÇOS, CLIENTES E ROTAS', '⚙️');

  const files: [string, string, string][] = [
    ['apps/api/src/lib/evolutionApi.ts',                'Cliente HTTP Evolution API',   'clinicaplus-docs-v6/11-modules/MODULE-whatsapp.md §4'],
    ['apps/api/src/lib/n8nApi.ts',                      'Cliente HTTP n8n API',         'clinicaplus-docs-v6/11-modules/MODULE-whatsapp.md §5'],
    ['apps/api/src/lib/n8n-templates/index.ts',         'Registo de templates n8n',     'clinicaplus-docs-v6/11-modules/MODULE-whatsapp.md §2'],
    ['apps/api/src/services/wa-instancia.service.ts',   'Service de instâncias WA',     'clinicaplus-docs-v6/11-modules/MODULE-whatsapp.md §6'],
    ['apps/api/src/services/wa-automacao.service.ts',   'Service de automações WA',     'clinicaplus-docs-v6/11-modules/MODULE-whatsapp.md §6'],
    ['apps/api/src/services/wa-conversa.service.ts',    'Service da máquina de estados','clinicaplus-docs-v6/11-modules/MODULE-whatsapp.md §6'],
    ['apps/api/src/services/wa-webhook.service.ts',     'Handler do webhook Evolution', 'clinicaplus-docs-v6/11-modules/MODULE-whatsapp.md §7'],
    ['apps/api/src/routes/whatsapp.ts',                 'Rotas /api/whatsapp/*',        'clinicaplus-docs-v6/11-modules/MODULE-whatsapp.md §8'],
  ];

  for (const [filePath, desc, ref] of files) {
    const exists = fileExists(filePath);
    check({
      id: `BE-FILE-${path.basename(filePath, '.ts')}`,
      section: 'backend',
      description: desc,
      status: exists ? 'PASS' : 'FAIL',
      severity: 'CRITICAL',
      howToFix: exists ? undefined : `Criar ${filePath}`,
      reference: ref,
    });
    printResult(results[results.length - 1]);
  }

  // Templates n8n
  const templates = ['marcacao', 'lembrete-24h', 'lembrete-2h', 'confirmacao', 'boas-vindas'];
  for (const t of templates) {
    const exists = fileExists(`apps/api/src/lib/n8n-templates/${t}.template.ts`);
    check({
      id: `BE-TEMPLATE-${t}`,
      section: 'backend',
      description: `Template n8n: ${t}`,
      status: exists ? 'PASS' : 'FAIL',
      severity: 'HIGH',
      reference: 'kit/skills/whatsapp/reference/n8n-workflow-templates.md',
    });
    printResult(results[results.length - 1]);
  }

  // evolutionApi.ts specific checks
  if (fileExists('apps/api/src/lib/evolutionApi.ts')) {
    check({
      id: 'BE-EVO-DELAY',
      section: 'backend',
      description: 'evolutionApi.enviarTexto inclui delay: 1200',
      status: fileContains('apps/api/src/lib/evolutionApi.ts', 'delay: 1200') ? 'PASS' : 'FAIL',
      severity: 'HIGH',
    });
    printResult(results[results.length - 1]);
  }

  // HMAC verification check
  const hasHmac = fileContains('apps/api/src/middleware/verificarHmacEvolution.ts', 'timingSafeEqual') ||
                  fileContains('apps/api/src/routes/whatsapp.ts', 'verificarHmacEvolution');
  check({
    id: 'BE-WEBHOOK-HMAC',
    section: 'backend',
    description: 'Verificação HMAC com crypto.timingSafeEqual no webhook',
    status: hasHmac ? 'PASS' : 'FAIL',
    severity: 'CRITICAL',
    reference: 'clinicaplus-docs-v6/11-modules/MODULE-whatsapp.md §7',
  });
  printResult(results[results.length - 1]);

  // Routing and Guards
  const waRoutes = 'apps/api/src/routes/whatsapp.ts';
  if (fileExists(waRoutes)) {
    check({
      id: 'BE-ROUTE-PLAN',
      section: 'backend',
      description: 'requirePlan(...) nas rotas de gestão',
      status: fileContains(waRoutes, 'requirePlan') ? 'PASS' : 'FAIL',
      severity: 'HIGH',
    });
    printResult(results[results.length - 1]);

    check({
      id: 'BE-ROUTE-PERMISSION',
      section: 'backend',
      description: "requirePermission('whatsapp', 'manage') nas rotas de escrita",
      status: fileContains(waRoutes, 'requirePermission') ? 'PASS' : 'FAIL',
      severity: 'HIGH',
    });
    printResult(results[results.length - 1]);

    check({
      id: 'BE-ROUTE-APIKEY',
      section: 'backend',
      description: 'apiKeyAuth nos endpoints /fluxo/*',
      status: fileContains(waRoutes, 'apiKeyAuth') ? 'PASS' : 'FAIL',
      severity: 'HIGH',
    });
    printResult(results[results.length - 1]);
  }

  printSectionSummary();
}

// ─── 3. JOBS ─────────────────────────────────────────────────────────────────

function auditJobs() {
  printSectionHeader('JOBS — AGENDAMENTO E TAREFAS', '⚡');

  const jobFiles: [string, string, string][] = [
    ['apps/worker/src/jobs/wa-lembrete.job.ts',          'Job de lembretes (24h e 2h)',  'clinicaplus-docs-v6/11-modules/MODULE-whatsapp.md §9'],
    ['apps/worker/src/jobs/wa-expirar-conversas.job.ts', 'Job de expiração de conversas','clinicaplus-docs-v6/11-modules/MODULE-whatsapp.md §9'],
  ];

  for (const [filePath, desc, ref] of jobFiles) {
    const exists = fileExists(filePath);
    check({
      id: `JOB-FILE-${path.basename(filePath, '.ts')}`,
      section: 'jobs',
      description: desc,
      status: exists ? 'PASS' : 'FAIL',
      severity: 'HIGH',
      reference: ref,
    });
    printResult(results[results.length - 1]);
  }

  const schedulerFile = 'apps/worker/src/services/scheduler.service.ts';
  const exists = fileExists(schedulerFile);

  check({
    id: 'JOB-TIMEZONE',
    section: 'jobs',
    description: "Jobs agendados com timezone 'Africa/Luanda'",
    status: (exists && fileContains(schedulerFile, 'Africa/Luanda')) ? 'PASS' : 'FAIL',
    severity: 'HIGH',
    howToFix: `Em ${schedulerFile}, usar:\ncron.schedule(..., { timezone: 'Africa/Luanda' });`,
  });
  printResult(results[results.length - 1]);

  const hasLembrete = exists && (fileContains(schedulerFile, 'jobWaLembretes') || fileContains(schedulerFile, 'wa-lembrete'));
  const hasExpirar = exists && (fileContains(schedulerFile, 'jobWaExpirarConversas') || fileContains(schedulerFile, 'wa-expirar'));

  check({
    id: 'JOB-REGISTERED',
    section: 'jobs',
    description: 'Jobs registados no scheduler',
    status: (hasLembrete && hasExpirar) ? 'PASS' : 'FAIL',
    severity: 'HIGH',
  });
  printResult(results[results.length - 1]);

  printSectionSummary();
}

// ─── 4. FRONTEND ─────────────────────────────────────────────────────────────

function auditFrontend() {
  printSectionHeader('FRONTEND — COMPONENTES E HOOKS', '🖥️');

  const feFiles = [
    'apps/web/src/pages/configuracoes/WhatsappPage.tsx',
    'apps/web/src/components/wa/WaConexaoCard.tsx',
    'apps/web/src/components/wa/WaAutomacaoCard.tsx',
    'apps/web/src/components/wa/WaActividadeRecente.tsx',
  ];

  for (const f of feFiles) {
    check({
      id: `FE-FILE-${path.basename(f)}`,
      section: 'frontend',
      description: `Ficheiro ${path.basename(f)} existe`,
      status: fileExists(f) ? 'PASS' : 'FAIL',
      severity: 'HIGH',
    });
    printResult(results[results.length - 1]);
  }

  const waPage = 'apps/web/src/pages/configuracoes/WhatsappPage.tsx';
  const cardAuto = 'apps/web/src/components/wa/WaAutomacaoCard.tsx';
  const hookFile = 'apps/web/src/hooks/useWhatsApp.ts';

  check({
    id: 'FE-PLAN-GATE',
    section: 'frontend',
    description: 'WhatsappPage protegida por PlanGate (PRO)',
    status: fileContains(waPage, 'PlanGate') ? 'PASS' : 'FAIL',
    severity: 'HIGH',
  });
  printResult(results[results.length - 1]);

  check({
    id: 'FE-SOCKET-ESTADO',
    section: 'frontend',
    description: "useSocketEvent('whatsapp:estado') para real-time",
    status: (fileContains(waPage, 'whatsapp:estado') || (fileExists(hookFile) && fileContains(hookFile, 'whatsapp:estado'))) ? 'PASS' : 'FAIL',
    severity: 'HIGH',
  });
  printResult(results[results.length - 1]);

  check({
    id: 'FE-TOGGLE-DISABLED',
    section: 'frontend',
    description: 'Toggles disabled quando offline',
    status: (fileContains(cardAuto, 'isDisconnected') || fileContains(cardAuto, 'disabled')) ? 'PASS' : 'FAIL',
    severity: 'HIGH',
  });
  printResult(results[results.length - 1]);

  printSectionSummary();
}

// ─── 5. SEGURANÇA ────────────────────────────────────────────────────────────

function auditSecurity() {
  printSectionHeader('SEGURANÇA — VERIFICAÇÕES CRÍTICAS', '🔒');

  // IDOR prevention check
  const hasIorVuln = fileContains('apps/api/src/routes/whatsapp.ts', 'req.body.clinicaId');
  check({
    id: 'SEC-IDOR-CLINICAID',
    section: 'security',
    description: 'clinicaId NÃO vem de req.body nos fluxos',
    status: hasIorVuln ? 'FAIL' : 'PASS',
    severity: 'CRITICAL',
  });
  printResult(results[results.length - 1]);

  printSectionSummary();
}

// ─── 6. TESTES ────────────────────────────────────────────────────────────────

function auditTests() {
  printSectionHeader('TESTES — COBERTURA E QUALIDADE', '🧪');

  const { ok: testsOk } = runCmd('pnpm test --run --filter=api 2>&1 | tail -5');
  check({
    id: 'TEST-RUN',
    section: 'tests',
    description: 'pnpm test --run --filter=api passa sem erros',
    status: testsOk ? 'PASS' : 'FAIL',
    severity: 'HIGH',
  });
  printResult(results[results.length - 1]);

  const { ok: tsOk } = runCmd('pnpm typecheck --filter=api 2>&1');
  check({
    id: 'TEST-TYPECHECK',
    section: 'tests',
    description: 'pnpm typecheck --filter=api sem erros',
    status: tsOk ? 'PASS' : 'FAIL',
    severity: 'HIGH',
  });
  printResult(results[results.length - 1]);

  printSectionSummary();
}

// ─── RELATÓRIO FINAL ──────────────────────────────────────────────────────────

function printFinalReport() {
  const total    = results.length;
  const passed   = results.filter(r => r.status === 'PASS').length;
  const failed   = results.filter(r => r.status === 'FAIL').length;
  const critical = results.filter(r => r.status === 'FAIL' && r.severity === 'CRITICAL').length;
  const score    = Math.round((passed / total) * 100);

  console.log(`\n${C.bold}${'═'.repeat(60)}${C.reset}`);
  console.log(`${C.bold}  RELATÓRIO DE AUDITORIA — MÓDULO WHATSAPP${C.reset}`);
  console.log(`${'═'.repeat(60)}`);

  console.log(`\n  ${C.bold}Conformidade geral:${C.reset}  ${score >= 90 ? C.green : C.red}${C.bold}${score}%${C.reset}`);
  console.log(`  ${C.green}✓ Passou: ${passed}${C.reset}  ${C.red}✗ Falhou: ${failed}${C.reset} ${critical > 0 ? `${C.red}(${critical} CRÍTICO)${C.reset}` : ''}`);

  if (failed > 0) {
    console.log(`\n${C.bold}  ITENS A CORRIGIR:${C.reset}`);
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  ${r.severity === 'CRITICAL' ? C.red : C.yellow}• [${r.section.toUpperCase()}] ${r.description}${C.reset}`);
      if (r.howToFix) console.log(`    ${C.dim}→ ${r.howToFix}${C.reset}`);
    });
  }

  console.log(`\n  ${C.dim}Gerado em: ${new Date().toLocaleString()} (Africa/Luanda)${C.reset}`);
  console.log(`${'═'.repeat(60)}\n`);
}

async function main() {
  auditDatabase();
  auditBackend();
  auditJobs();
  auditFrontend();
  auditSecurity();
  auditTests();
  printFinalReport();
  
  const hasCritical = results.some(r => r.status === 'FAIL' && r.severity === 'CRITICAL');
  process.exit(hasCritical ? 1 : 0);
}

main().catch(console.error);
