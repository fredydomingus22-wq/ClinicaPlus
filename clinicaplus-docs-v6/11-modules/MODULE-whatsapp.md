# MODULE — WhatsApp, Evolution API & Automações n8n

> ADR de referência: ADR-012  
> Plano obrigatório: PRO (1 instância) | ENTERPRISE (ilimitado)  
> Lê também: MODULE-subscricoes.md (requirePlan), SKILL-redis-bullmq (jobs)

---

## 1. Schema Prisma — migration_006_whatsapp

```prisma
// ─── Instância WhatsApp (1 por clínica no plano PRO, N no ENTERPRISE) ──────
enum WaEstadoInstancia {
  DESCONECTADO   // nunca ligou ou desligou
  AGUARDA_QR     // instância criada, aguarda scan do QR
  CONECTADO      // sessão Baileys activa
  ERRO           // falha de conexão
}

model WaInstancia {
  id              String            @id @default(cuid())
  clinicaId       String            @unique  // PRO: único; ENTERPRISE: pode ter N (ver PlanoLimite)
  clinica         Clinica           @relation(fields: [clinicaId], references: [id])

  // Identificadores na Evolution API
  evolutionName   String            @unique  // "cp-{clinicaSlug}-{random6}" — imutável após criar
  evolutionToken  String            // token de acesso à instância na Evolution API

  estado          WaEstadoInstancia @default(DESCONECTADO)
  numeroTelefone  String?           // "+244923456789" — preenchido após conectar
  qrCodeBase64    String?           // "data:image/png;base64,..." — apagado após conectar
  qrExpiresAt     DateTime?         // QR expira em 60s — regenerar se expirado

  criadoEm        DateTime          @default(now())
  actualizadoEm   DateTime          @updatedAt

  automacoes      WaAutomacao[]
  conversas       WaConversa[]

  @@index([clinicaId])
  @@map("wa_instancias")
}

// ─── Automação configurada pelo admin ────────────────────────────────────────
enum WaTipoAutomacao {
  MARCACAO_CONSULTA        // fluxo: especialidade → médico → slot → confirmação
  LEMBRETE_24H             // job BullMQ: D-1
  LEMBRETE_2H              // job BullMQ: H-2
  CONFIRMACAO_CANCELAMENTO // paciente responde SIM/NÃO ao lembrete
  BOAS_VINDAS              // primeiro contacto de número desconhecido
}

model WaAutomacao {
  id              String          @id @default(cuid())
  instanciaId     String
  instancia       WaInstancia     @relation(fields: [instanciaId], references: [id])

  tipo            WaTipoAutomacao
  ativo           Boolean         @default(false)

  // IDs no n8n — null enquanto desactivado
  n8nWorkflowId   String?         // ID retornado pela n8n API ao criar o workflow
  n8nWebhookPath  String?         // path do webhook n8n: "wa-marcacao-{slug}"

  // Configuração específica (JSON schema por tipo — ver secção 3)
  configuracao    Json            @default("{}")

  criadoEm        DateTime        @default(now())
  actualizadoEm   DateTime        @updatedAt

  @@unique([instanciaId, tipo])   // uma automação de cada tipo por instância
  @@index([instanciaId])
  @@map("wa_automacoes")
}

// ─── Conversa activa com paciente ─────────────────────────────────────────────
enum WaEstadoConversa {
  AGUARDA_INPUT         // nenhum fluxo activo
  EM_FLUXO_MARCACAO     // a percorrer o fluxo de marcação
  AGUARDA_CONFIRMACAO   // aguarda SIM/NÃO do lembrete
  CONCLUIDA             // fluxo terminado com sucesso
  EXPIRADA              // sem resposta há mais de 24h
}

model WaConversa {
  id              String           @id @default(cuid())
  instanciaId     String
  instancia       WaInstancia      @relation(fields: [instanciaId], references: [id])

  // Número normalizado: "244923456789" (sem + ou @s.whatsapp.net)
  numeroWhatsapp  String
  pacienteId      String?          // null se número ainda não associado a paciente
  paciente        Paciente?        @relation(fields: [pacienteId], references: [id])

  estado          WaEstadoConversa @default(AGUARDA_INPUT)
  etapaFluxo      String?          // "ESCOLHA_ESPECIALIDADE" | "ESCOLHA_MEDICO" | ...

  // Dados acumulados durante o fluxo de marcação
  // Shape: { especialidade?, medicoId?, medicoNome?, slot?, slotLabel?,
  //          pacienteNome?, errosEspecialidade?, errosMedico?, errosHorario? }
  contexto        Json?

  ultimaMensagemEm  DateTime?
  criadoEm          DateTime       @default(now())

  mensagens       WaMensagem[]

  @@unique([instanciaId, numeroWhatsapp])
  @@index([instanciaId, estado])
  @@index([pacienteId])
  @@index([ultimaMensagemEm])      // para job de expiração
  @@map("wa_conversas")
}

// ─── Histórico de mensagens ───────────────────────────────────────────────────
enum WaDirecao {
  ENTRADA    // paciente → bot
  SAIDA      // bot → paciente
}

model WaMensagem {
  id              String     @id @default(cuid())
  conversaId      String
  conversa        WaConversa @relation(fields: [conversaId], references: [id])

  direcao         WaDirecao
  conteudo        String     @db.Text
  tipo            String     @default("text")  // text | image | audio | document

  evolutionMsgId  String?    // ID retornado pela Evolution API ao enviar
  entregue        Boolean    @default(false)
  lida            Boolean    @default(false)

  criadoEm        DateTime   @default(now())

  @@index([conversaId, criadoEm])
  @@map("wa_mensagens")
}

// ─── Adicionar ao model Paciente existente ────────────────────────────────────
// origem  String?  @default("DIRECTO")  // "DIRECTO" | "WHATSAPP" | "PORTAL"

// ─── Adicionar ao model Agendamento existente ─────────────────────────────────
// canal   String?  @default("PRESENCIAL")  // "PRESENCIAL" | "WHATSAPP" | "PORTAL"
```

---

## 2. Arquitectura de ficheiros

```
apps/api/src/
├── lib/
│   ├── evolutionApi.ts              cliente HTTP Evolution API (ver secção 4)
│   ├── n8nApi.ts                    cliente HTTP n8n REST API (ver secção 5)
│   └── n8n-templates/
│       ├── index.ts                 registo TEMPLATES[WaTipoAutomacao]
│       ├── marcacao.template.ts     workflow de marcação completo
│       ├── lembrete-24h.template.ts workflow de lembrete D-1
│       ├── lembrete-2h.template.ts  workflow de lembrete H-2
│       ├── confirmacao.template.ts  workflow confirmação/cancelamento
│       └── boas-vindas.template.ts  workflow de boas-vindas
├── services/
│   ├── wa-instancia.service.ts      criar/gerir instâncias na Evolution API
│   ├── wa-automacao.service.ts      activar/desactivar + criar workflows no n8n
│   ├── wa-webhook.service.ts        processar eventos recebidos da Evolution API
│   ├── wa-conversa.service.ts       máquina de estados (etapas do fluxo)
│   └── wa-mensagem.service.ts       enviar mensagens via Evolution API
└── routes/
    └── whatsapp.ts                  todas as rotas /api/whatsapp/*

apps/worker/src/jobs/
├── wa-lembrete.job.ts               lembrete 24h e 2h via BullMQ
└── wa-expirar-conversas.job.ts      expirar conversas sem resposta > 24h

apps/web/src/pages/configuracoes/
└── WhatsappPage.tsx                 painel de automações

apps/web/src/components/wa/
├── WaConexaoCard.tsx                card QR + estado
├── WaAutomacaoCard.tsx              toggle + config por tipo
└── WaActividadeRecente.tsx          feed em tempo real
```

---

## 3. Schemas de configuração por tipo de automação

```typescript
// MARCACAO_CONSULTA
interface ConfigMarcacao {
  horarioInicio:  string;  // "08:00"
  horarioFim:     string;  // "18:00"
  diasAtivos:     number[]; // [1,2,3,4,5] = seg-sex (0=dom, 6=sab)
  msgBoasVindas:  string;  // "Olá! Para marcar consulta escreve *marcar*"
  msgForaHorario: string;  // "Bot disponível das {inicio} às {fim}. Até logo!"
  msgErroGenerico:string;  // "Não entendi. Escreve *oi* para recomeçar."
}

// LEMBRETE_24H e LEMBRETE_2H
interface ConfigLembrete {
  template: string; // "Olá {nome}! Lembrete da consulta {data} às {hora} com {medico}. Confirmas? 1-SIM 2-NÃO"
  // variáveis disponíveis: {nome}, {data}, {hora}, {medico}, {especialidade}, {clinica}
}

// CONFIRMACAO_CANCELAMENTO
interface ConfigConfirmacao {
  msgConfirmado: string; // "✅ Consulta confirmada! Até logo, {nome}."
  msgCancelado:  string; // "Consulta cancelada. Para remarcar escreve *marcar*."
  msgInvalido:   string; // "Responde 1 para confirmar ou 2 para cancelar."
}

// BOAS_VINDAS
interface ConfigBoasVindas {
  mensagem: string; // "Olá! 👋 Bem-vindo a {clinica}. Para marcar consulta escreve *marcar*."
}
```

---

## 4. Cliente Evolution API — implementação completa

```typescript
// apps/api/src/lib/evolutionApi.ts
import axios, { AxiosError } from 'axios';
import { config } from './config';
import { AppError } from './AppError';

const evo = axios.create({
  baseURL: config.EVOLUTION_API_URL,  // ex: https://evo.clinicaplus.ao
  headers: { apikey: config.EVOLUTION_API_KEY },
  timeout: 15_000,
});

// Interceptor: converter erros da Evolution API em AppError
evo.interceptors.response.use(
  res => res,
  (err: AxiosError) => {
    const msg = (err.response?.data as { message?: string })?.message ?? err.message;
    throw new AppError(`Evolution API: ${msg}`, 502, 'EVOLUTION_API_ERROR');
  }
);

export const evolutionApi = {

  /** Criar instância para uma clínica */
  async criarInstancia(instanceName: string, webhookUrl: string) {
    const { data } = await evo.post('/instance/create', {
      instanceName,
      qrcode:      true,
      integration: 'WHATSAPP-BAILEYS',
      webhook: {
        url:      webhookUrl,
        byEvents: false,
        base64:   false,
        events:   ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'QRCODE_UPDATED'],
      },
    });
    return data as { instance: { instanceName: string; status: string } };
  },

  /** Obter QR code (base64) para exibir na UI */
  async obterQrCode(instanceName: string) {
    const { data } = await evo.get(`/instance/connect/${instanceName}`);
    return data as { base64: string; code: string };
  },

  /** Estado da conexão */
  async estadoConexao(instanceName: string) {
    const { data } = await evo.get(`/instance/connectionState/${instanceName}`);
    return data as { instance: { state: 'open' | 'close' | 'connecting' | 'connected' } };
  },

  /** Enviar mensagem de texto */
  async enviarTexto(instanceName: string, numero: string, texto: string) {
    const { data } = await evo.post(`/message/sendText/${instanceName}`, {
      number: numero,
      text:   texto,
      delay:  1200,  // simula digitação (ms) — melhor UX
    });
    return data as { key: { id: string }; status: string };
  },

  /** Desligar sessão (mantém instância) */
  async desligar(instanceName: string) {
    await evo.delete(`/instance/logout/${instanceName}`);
  },

  /** Eliminar instância completamente */
  async eliminar(instanceName: string) {
    await evo.delete(`/instance/delete/${instanceName}`);
  },

  /** Actualizar URL do webhook */
  async actualizarWebhook(instanceName: string, webhookUrl: string) {
    await evo.post(`/webhook/set/${instanceName}`, {
      url:      webhookUrl,
      byEvents: false,
      base64:   false,
      events:   ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'QRCODE_UPDATED'],
    });
  },
};
```

---

## 5. Cliente n8n API — implementação completa

```typescript
// apps/api/src/lib/n8nApi.ts
import axios, { AxiosError } from 'axios';
import { config } from './config';
import { AppError } from './AppError';
import { TEMPLATES } from './n8n-templates/index';
import type { WaTipoAutomacao } from '@prisma/client';

const n8n = axios.create({
  baseURL: config.N8N_BASE_URL,          // ex: https://n8n.clinicaplus.ao
  headers: { 'X-N8N-API-KEY': config.N8N_API_KEY },
  timeout: 20_000,
});

n8n.interceptors.response.use(
  res => res,
  (err: AxiosError) => {
    const msg = (err.response?.data as { message?: string })?.message ?? err.message;
    throw new AppError(`n8n API: ${msg}`, 502, 'N8N_API_ERROR');
  }
);

export interface TemplateVars {
  clinicaId:    string;
  clinicaSlug:  string;
  instanceName: string;  // nome da instância Evolution API
  apiBaseUrl:   string;  // URL pública da ClinicaPlus API
  apiKey:       string;  // API key interna (scope WRITE_AGENDAMENTOS)
  configuracao: Record<string, unknown>;
}

export const n8nApi = {

  /** Criar e activar workflow a partir do template */
  async criarWorkflow(tipo: WaTipoAutomacao, vars: TemplateVars) {
    const template = TEMPLATES[tipo](vars);

    // 1. Criar workflow
    const { data: workflow } = await n8n.post('/api/v1/workflows', template);

    // 2. Activar imediatamente
    await n8n.post(`/api/v1/workflows/${workflow.id}/activate`);

    // 3. Extrair webhook path dos nós
    const webhookPath = extrairWebhookPath(workflow);

    return {
      workflowId:  workflow.id as string,
      webhookPath,
    };
  },

  async activar(workflowId: string) {
    await n8n.post(`/api/v1/workflows/${workflowId}/activate`);
  },

  async desactivar(workflowId: string) {
    await n8n.post(`/api/v1/workflows/${workflowId}/deactivate`);
  },

  async eliminar(workflowId: string) {
    await n8n.delete(`/api/v1/workflows/${workflowId}`);
  },

  async detalhes(workflowId: string) {
    const { data } = await n8n.get(`/api/v1/workflows/${workflowId}`);
    return data;
  },
};

function extrairWebhookPath(workflowData: Record<string, unknown>): string {
  const nodes = (workflowData.nodes as { type: string; parameters?: { path?: string } }[]) ?? [];
  const webhookNode = nodes.find(n => n.type === 'n8n-nodes-base.webhook');
  return webhookNode?.parameters?.path ?? '';
}
```

---

## 6. Serviços principais — contratos e implementação

### wa-instancia.service.ts

```typescript
export const waInstanciaService = {

  async criar(clinicaId: string, userId: string): Promise<WaInstancia> {
    // 1. Verificar plano PRO+
    await subscricaoService.verificarFeature(clinicaId, 'whatsappAutomacoes');

    // 2. Verificar se já tem instância (PRO = máx 1)
    const existente = await prisma.waInstancia.findUnique({ where: { clinicaId } });
    if (existente) throw new AppError('Clínica já tem instância WhatsApp', 409, 'WA_INSTANCIA_EXISTS');

    const clinica = await prisma.clinica.findUniqueOrThrow({ where: { id: clinicaId } });
    const evolutionName = `cp-${clinica.slug}-${crypto.randomBytes(3).toString('hex')}`;
    const webhookUrl = `${config.API_PUBLIC_URL}/api/whatsapp/webhook`;

    // 3. Criar na Evolution API
    await evolutionApi.criarInstancia(evolutionName, webhookUrl);

    // 4. Obter QR code inicial
    const qr = await evolutionApi.obterQrCode(evolutionName);
    const qrExpiresAt = new Date(Date.now() + 60_000);

    // 5. Persistir
    const instancia = await prisma.waInstancia.create({
      data: {
        clinicaId,
        evolutionName,
        evolutionToken: config.EVOLUTION_API_KEY,  // reutiliza a master key
        estado: 'AGUARDA_QR',
        qrCodeBase64: qr.base64,
        qrExpiresAt,
      },
    });

    // 6. Emitir via WebSocket para o painel do admin
    await publishEvent(`clinica:${clinicaId}`, 'whatsapp:qrcode', {
      qrCode: qr.base64,
      expiresAt: qrExpiresAt,
    });

    await auditLogService.log({ clinicaId, userId, accao: 'WA_INSTANCIA_CRIAR', recurso: 'wa_instancia', recursoId: instancia.id });
    return instancia;
  },

  async processarQrCode(clinicaId: string, qrBase64: string) {
    const qrExpiresAt = new Date(Date.now() + 60_000);
    await prisma.waInstancia.update({
      where: { clinicaId },
      data: { qrCodeBase64: qrBase64, qrExpiresAt, estado: 'AGUARDA_QR' },
    });
    await publishEvent(`clinica:${clinicaId}`, 'whatsapp:qrcode', { qrCode: qrBase64, expiresAt: qrExpiresAt });
  },

  async processarConexao(clinicaId: string, state: string, numeroTelefone?: string) {
    const estado = state === 'open' ? 'CONECTADO'
                 : state === 'close' ? 'DESCONECTADO'
                 : 'AGUARDA_QR';

    await prisma.waInstancia.update({
      where: { clinicaId },
      data: {
        estado,
        numeroTelefone: estado === 'CONECTADO' ? numeroTelefone : undefined,
        qrCodeBase64:   estado === 'CONECTADO' ? null : undefined,
        qrExpiresAt:    estado === 'CONECTADO' ? null : undefined,
      },
    });
    await publishEvent(`clinica:${clinicaId}`, 'whatsapp:estado', { estado, numeroTelefone });
  },

  async desligar(clinicaId: string, userId: string) {
    const instancia = await prisma.waInstancia.findUniqueOrThrow({ where: { clinicaId } });
    await evolutionApi.desligar(instancia.evolutionName);
    await prisma.waInstancia.update({
      where: { clinicaId },
      data: { estado: 'DESCONECTADO', qrCodeBase64: null, numeroTelefone: null },
    });
    await auditLogService.log({ clinicaId, userId, accao: 'WA_INSTANCIA_DESLIGAR', recurso: 'wa_instancia', recursoId: instancia.id });
  },
};
```

### wa-automacao.service.ts

```typescript
export const waAutomacaoService = {

  async activar(automacaoId: string, clinicaId: string, userId: string) {
    const automacao = await prisma.waAutomacao.findFirstOrThrow({
      where: { id: automacaoId },
      include: { instancia: true },
    });

    // Validação: instância deve estar CONECTADA
    if (automacao.instancia.estado !== 'CONECTADO') {
      throw new AppError('Liga o WhatsApp antes de activar automações.', 400, 'WA_INSTANCIA_DESCONECTADA');
    }

    // Gerar API key interna para o n8n usar (idempotente — reutiliza se já existe)
    const apiKey = await apiKeyService.getOrCreateInternal(clinicaId, `n8n-wa-${automacao.tipo.toLowerCase()}`);
    const clinica = await prisma.clinica.findUniqueOrThrow({ where: { id: clinicaId } });

    const vars: TemplateVars = {
      clinicaId,
      clinicaSlug:  clinica.slug,
      instanceName: automacao.instancia.evolutionName,
      apiBaseUrl:   config.API_PUBLIC_URL,
      apiKey:       apiKey.tokenPlain,  // só disponível no momento de criação
      configuracao: automacao.configuracao as Record<string, unknown>,
    };

    // Criar workflow no n8n
    const { workflowId, webhookPath } = await n8nApi.criarWorkflow(automacao.tipo, vars);

    await prisma.waAutomacao.update({
      where: { id: automacaoId },
      data: { ativo: true, n8nWorkflowId: workflowId, n8nWebhookPath: webhookPath },
    });

    await auditLogService.log({ clinicaId, userId, accao: 'WA_AUTOMACAO_ACTIVAR', recurso: 'wa_automacao', recursoId: automacaoId });
  },

  async desactivar(automacaoId: string, clinicaId: string, userId: string) {
    const automacao = await prisma.waAutomacao.findFirstOrThrow({
      where: { id: automacaoId, instancia: { clinicaId } },
    });

    // Desactivar no n8n — não bloquear se n8n estiver em baixo
    if (automacao.n8nWorkflowId) {
      await n8nApi.desactivar(automacao.n8nWorkflowId).catch(err => {
        logger.warn(`n8n desactivar falhou (continuando): ${err.message}`);
      });
    }

    await prisma.waAutomacao.update({
      where: { id: automacaoId },
      data: { ativo: false },
    });

    await auditLogService.log({ clinicaId, userId, accao: 'WA_AUTOMACAO_DESACTIVAR', recurso: 'wa_automacao', recursoId: automacaoId });
  },

  async actualizarConfig(automacaoId: string, clinicaId: string, configuracao: Record<string, unknown>) {
    // Actualizar config — se activo, recriar workflow no n8n com nova config
    const automacao = await prisma.waAutomacao.findFirstOrThrow({
      where: { id: automacaoId, instancia: { clinicaId } },
    });

    await prisma.waAutomacao.update({
      where: { id: automacaoId },
      data: { configuracao },
    });

    // Se está activo, recriar workflow com nova config
    if (automacao.ativo) {
      // Usar o userId do admin que actualizou (passado como param)
      const adminUser = await prisma.utilizador.findFirst({
        where: { clinicaId, papel: 'ADMIN' },
      });
      await this.desactivar(automacaoId, clinicaId, adminUser!.id);
      await this.activar(automacaoId, clinicaId, adminUser!.id);
    }
  },
};
```

### wa-conversa.service.ts — máquina de estados completa

```typescript
export const waConversaService = {

  async obter(numero: string, clinicaId: string) {
    const instancia = await getInstancia(clinicaId);
    return prisma.waConversa.findUnique({
      where: { instanciaId_numeroWhatsapp: { instanciaId: instancia.id, numeroWhatsapp: numero } },
    });
  },

  /** INÍCIO — mostra lista de especialidades */
  async etapaInicio(numero: string, clinicaId: string, instanceName: string, pushName: string) {
    const instancia = await getInstancia(clinicaId);
    const clinica   = await prisma.clinica.findUniqueOrThrow({ where: { id: clinicaId } });

    // Verificar horário configurado
    const automacao = await getAutomacaoMarcacao(instancia.id);
    const cfg = automacao.configuracao as ConfigMarcacao;
    if (!estaNoHorario(cfg)) {
      await evolutionApi.enviarTexto(instanceName, numero,
        cfg.msgForaHorario
          .replace('{inicio}', cfg.horarioInicio)
          .replace('{fim}', cfg.horarioFim)
      );
      return;
    }

    // Criar ou resetar conversa
    await prisma.waConversa.upsert({
      where: { instanciaId_numeroWhatsapp: { instanciaId: instancia.id, numeroWhatsapp: numero } },
      create: { instanciaId: instancia.id, numeroWhatsapp: numero, estado: 'EM_FLUXO_MARCACAO', etapaFluxo: 'ESCOLHA_ESPECIALIDADE', contexto: {} },
      update: { estado: 'EM_FLUXO_MARCACAO', etapaFluxo: 'ESCOLHA_ESPECIALIDADE', contexto: {}, ultimaMensagemEm: new Date() },
    });

    const especialidades = await getEspecialidadesClinica(clinicaId);
    const lista = especialidades.map((e, i) => `${i + 1}. ${e}`).join('\n');
    const msg = `Olá${pushName ? `, ${pushName.split(' ')[0]}` : ''}! 👋\n`
      + `Bem-vindo(a) à *${clinica.nome}*.\n\n`
      + `Escolhe a especialidade:\n\n${lista}\n\n`
      + `Responde com o número da opção.`;

    await evolutionApi.enviarTexto(instanceName, numero, msg);
    await registarMensagemSaida(instancia.id, numero, msg);
  },

  /** ESPECIALIDADE → lista médicos */
  async etapaEspecialidade(numero: string, clinicaId: string, instanceName: string, resposta: string) {
    const { conversa, instancia } = await getConversaOuFalhar(numero, clinicaId);
    const especialidades = await getEspecialidadesClinica(clinicaId);
    const idx = parseInt(resposta.trim()) - 1;

    if (isNaN(idx) || idx < 0 || idx >= especialidades.length) {
      return tratarInputInvalido(conversa, instancia, instanceName, especialidades, 'errosEspecialidade');
    }

    const especialidade = especialidades[idx];
    const medicos = await prisma.medico.findMany({
      where: { clinicaId, especialidade, ativo: true },
      select: { id: true, nome: true, preco: true },
    });

    if (medicos.length === 0) {
      await evolutionApi.enviarTexto(instanceName, numero,
        `Não há médicos disponíveis em *${especialidade}* de momento. Escolhe outra especialidade ou volta mais tarde.`
      );
      return;
    }

    const lista = medicos.map((m, i) => `${i + 1}. Dr(a). ${m.nome} — ${formatKz(m.preco)}`).join('\n');
    const msg = `Médicos disponíveis em *${especialidade}*:\n\n${lista}\n\nEscolhe o médico.`;

    await prisma.waConversa.update({
      where: { id: conversa.id },
      data: {
        etapaFluxo: 'ESCOLHA_MEDICO',
        contexto: { especialidade, medicosDisponiveis: medicos.map(m => m.id) },
        ultimaMensagemEm: new Date(),
      },
    });

    await evolutionApi.enviarTexto(instanceName, numero, msg);
    await registarMensagemSaida(instancia.id, numero, msg);
  },

  /** MÉDICO → lista slots */
  async etapaMedico(numero: string, clinicaId: string, instanceName: string, resposta: string) {
    const { conversa, instancia } = await getConversaOuFalhar(numero, clinicaId);
    const ctx = conversa.contexto as { especialidade: string; medicosDisponiveis: string[] };
    const medicos = await prisma.medico.findMany({
      where: { id: { in: ctx.medicosDisponiveis } },
      select: { id: true, nome: true },
    });

    const idx = parseInt(resposta.trim()) - 1;
    if (isNaN(idx) || idx < 0 || idx >= medicos.length) {
      return tratarInputInvalido(conversa, instancia, instanceName, medicos.map(m => m.nome), 'errosMedico');
    }

    const medico = medicos[idx];
    const slots = await agendamentosService.getSlotsDisponiveis(medico.id, clinicaId, 5);

    if (slots.length === 0) {
      await evolutionApi.enviarTexto(instanceName, numero,
        `Dr(a). ${medico.nome} não tem horários disponíveis nos próximos dias. Escolhe outro médico ou tenta mais tarde.`
      );
      await prisma.waConversa.update({
        where: { id: conversa.id },
        data: { etapaFluxo: 'ESCOLHA_MEDICO' },
      });
      return;
    }

    const lista = slots.map((s, i) => `${i + 1}. ${formatSlotPtAO(s)}`).join('\n');
    const msg = `Próximas vagas com *Dr(a). ${medico.nome}*:\n\n${lista}\n\nEscolhe o horário.`;

    await prisma.waConversa.update({
      where: { id: conversa.id },
      data: {
        etapaFluxo: 'ESCOLHA_HORARIO',
        contexto: { ...ctx, medicoId: medico.id, medicoNome: medico.nome, slotsDisponiveis: slots },
        ultimaMensagemEm: new Date(),
      },
    });

    await evolutionApi.enviarTexto(instanceName, numero, msg);
    await registarMensagemSaida(instancia.id, numero, msg);
  },

  /** HORÁRIO → pede confirmação */
  async etapaHorario(numero: string, clinicaId: string, instanceName: string, resposta: string) {
    const { conversa, instancia } = await getConversaOuFalhar(numero, clinicaId);
    const ctx = conversa.contexto as { medicoId: string; medicoNome: string; slotsDisponiveis: string[] };

    const idx = parseInt(resposta.trim()) - 1;
    if (isNaN(idx) || idx < 0 || idx >= ctx.slotsDisponiveis.length) {
      return tratarInputInvalido(conversa, instancia, instanceName, ctx.slotsDisponiveis.map(formatSlotPtAO), 'errosHorario');
    }

    const slot = ctx.slotsDisponiveis[idx];
    const slotLabel = formatSlotPtAO(slot);
    const msg = `Confirmas a consulta?\n\n`
      + `📅 *${slotLabel}*\n`
      + `👨‍⚕️ *Dr(a). ${ctx.medicoNome}*\n\n`
      + `Responde *1* para confirmar ou *2* para cancelar.`;

    await prisma.waConversa.update({
      where: { id: conversa.id },
      data: {
        estado: 'AGUARDA_CONFIRMACAO',
        etapaFluxo: 'AGUARDA_CONFIRMACAO',
        contexto: { ...ctx, slot, slotLabel },
        ultimaMensagemEm: new Date(),
      },
    });

    await evolutionApi.enviarTexto(instanceName, numero, msg);
    await registarMensagemSaida(instancia.id, numero, msg);
  },

  /** CONFIRMAÇÃO — cria agendamento ou cancela */
  async etapaConfirmar(numero: string, clinicaId: string, instanceName: string, resposta: string) {
    const { conversa, instancia } = await getConversaOuFalhar(numero, clinicaId);
    const ctx = conversa.contexto as { medicoId: string; medicoNome: string; slot: string; slotLabel: string };

    const confirmado = /^[1sS]/.test(resposta.trim());

    if (!confirmado) {
      await evolutionApi.enviarTexto(instanceName, numero,
        `Marcação cancelada. Escreve *marcar* para recomeçar. 👋`
      );
      await prisma.waConversa.update({
        where: { id: conversa.id },
        data: { estado: 'CONCLUIDA', etapaFluxo: null, ultimaMensagemEm: new Date() },
      });
      return;
    }

    // Encontrar ou criar paciente
    const pacienteId = await obterOuCriarPaciente(numero, clinicaId, conversa);

    // Criar agendamento — reutiliza o agendamentosService existente
    const agendamento = await agendamentosService.create(
      {
        clinicaId,
        medicoId:   ctx.medicoId,
        pacienteId,
        dataHora:   new Date(ctx.slot),
        canal:      'WHATSAPP',
        tipo:       'CONSULTA',
      },
      'sistema'  // criado pelo sistema, não por utilizador
    );

    const msg = `✅ *Consulta marcada!*\n\n`
      + `📅 ${ctx.slotLabel}\n`
      + `👨‍⚕️ Dr(a). ${ctx.medicoNome}\n\n`
      + `Receberás um lembrete 24h antes. Até lá! 🙏`;

    await prisma.waConversa.update({
      where: { id: conversa.id },
      data: { estado: 'CONCLUIDA', etapaFluxo: null, ultimaMensagemEm: new Date() },
    });

    await evolutionApi.enviarTexto(instanceName, numero, msg);
    await registarMensagemSaida(instancia.id, numero, msg);

    // Notificar admin em tempo real
    await publishEvent(`clinica:${clinicaId}`, 'whatsapp:marcacao', {
      agendamentoId: agendamento.id,
      numero,
      medicoNome: ctx.medicoNome,
      slotLabel: ctx.slotLabel,
    });
  },
};

// ─── helpers internos ─────────────────────────────────────────────────────────

async function obterOuCriarPaciente(numero: string, clinicaId: string, conversa: WaConversa) {
  if (conversa.pacienteId) return conversa.pacienteId;

  const telefone = `+${numero}`;
  let paciente = await prisma.paciente.findFirst({ where: { clinicaId, telefone }, select: { id: true } });

  if (!paciente) {
    paciente = await prisma.paciente.create({
      data: {
        clinicaId,
        nome:    `Paciente WA ${numero.slice(-4)}`,  // admin completa depois
        telefone,
        origem:  'WHATSAPP',
      },
      select: { id: true },
    });
    // Ligar conversa ao paciente recém-criado
    await prisma.waConversa.update({ where: { id: conversa.id }, data: { pacienteId: paciente.id } });
  }

  return paciente.id;
}

async function tratarInputInvalido(
  conversa: WaConversa,
  instancia: WaInstancia,
  instanceName: string,
  opcoes: string[],
  campoErros: string,
) {
  const ctx = (conversa.contexto ?? {}) as Record<string, unknown>;
  const erros = ((ctx[campoErros] as number) ?? 0) + 1;

  if (erros >= 3) {
    await evolutionApi.enviarTexto(instanceName, conversa.numeroWhatsapp,
      'Não consegui perceber. 😕 Escreve *oi* para recomeçar.'
    );
    await prisma.waConversa.update({
      where: { id: conversa.id },
      data: { estado: 'CONCLUIDA', etapaFluxo: null },
    });
    return;
  }

  const lista = opcoes.map((o, i) => `${i + 1}. ${o}`).join('\n');
  await evolutionApi.enviarTexto(instanceName, conversa.numeroWhatsapp,
    `❌ Opção inválida. Escolhe um número de 1 a ${opcoes.length}:\n\n${lista}`
  );
  await prisma.waConversa.update({
    where: { id: conversa.id },
    data: { contexto: { ...ctx, [campoErros]: erros } },
  });
}
```

---

## 7. Webhook handler — verificação HMAC obrigatória

```typescript
// apps/api/src/services/wa-webhook.service.ts

import crypto from 'crypto';

/** Verificar assinatura HMAC — chamar ANTES de processar payload */
export function verificarHmacEvolution(req: Request, res: Response, next: NextFunction) {
  const signature = req.headers['x-evolution-signature'] as string | undefined;

  if (!signature) {
    throw new AppError('Webhook sem assinatura', 401, 'WEBHOOK_NO_SIGNATURE');
  }

  const body = JSON.stringify(req.body);
  const expected = crypto
    .createHmac('sha256', config.EVOLUTION_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))) {
    throw new AppError('Assinatura HMAC inválida', 401, 'WEBHOOK_INVALID_SIGNATURE');
  }

  next();
}

export const waWebhookService = {

  async processar(payload: EvolutionWebhookPayload) {
    const { event, instance, data } = payload;

    // Resolver clinicaId a partir do nome da instância
    const waInstancia = await prisma.waInstancia.findUnique({
      where: { evolutionName: instance },
    });
    if (!waInstancia) {
      logger.warn(`Webhook para instância desconhecida: ${instance}`);
      return;
    }

    const clinicaId = waInstancia.clinicaId;

    switch (event) {
      case 'QRCODE_UPDATED':
        await waInstanciaService.processarQrCode(clinicaId, data.qrcode?.base64 ?? '');
        break;

      case 'CONNECTION_UPDATE':
        await waInstanciaService.processarConexao(
          clinicaId,
          data.state ?? 'close',
          data.number ?? undefined
        );
        break;

      case 'MESSAGES_UPSERT':
        // Ignorar mensagens do próprio bot e grupos
        if (data.key?.fromMe || data.key?.remoteJid?.endsWith('@g.us')) return;

        const numero = data.key.remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '');
        const texto  = data.message?.conversation
                    ?? data.message?.extendedTextMessage?.text
                    ?? '';

        // Registar no histórico
        await registarMensagemEntrada(waInstancia.id, numero, texto);

        // O n8n gere o routing — este handler é só para registo e auditoria
        break;

      default:
        logger.debug(`Evento WhatsApp ignorado: ${event}`);
    }
  },
};
```

---

## 8. Rotas completas

```typescript
// apps/api/src/routes/whatsapp.ts

// ── Gestão da instância (ADMIN, plano PRO+) ─────────────────────────────────
router.post('/instancias',
  authenticate, requirePlan('PRO'), requirePermission('whatsapp', 'manage'),
  criarInstancia
);
router.get('/instancias/estado',
  authenticate, requirePlan('PRO'),
  obterEstadoInstancia
);
router.get('/instancias/qrcode',
  authenticate, requirePlan('PRO'),
  obterQrCode
);
router.delete('/instancias',
  authenticate, requirePlan('PRO'), requirePermission('whatsapp', 'manage'),
  desligarInstancia
);

// ── Gestão de automações (ADMIN, plano PRO+) ─────────────────────────────────
router.get('/automacoes',
  authenticate, requirePlan('PRO'),
  listarAutomacoes  // retorna os 5 tipos com estado ativo/inativo e config
);
router.patch('/automacoes/:id',
  authenticate, requirePlan('PRO'), requirePermission('whatsapp', 'manage'),
  actualizarConfigAutomacao
);
router.post('/automacoes/:id/activar',
  authenticate, requirePlan('PRO'), requirePermission('whatsapp', 'manage'),
  activarAutomacao
);
router.post('/automacoes/:id/desactivar',
  authenticate, requirePlan('PRO'), requirePermission('whatsapp', 'manage'),
  desactivarAutomacao
);

// ── Endpoints do fluxo — chamados pelo n8n (API key, NÃO JWT) ─────────────────
router.get('/fluxo/conversa',    apiKeyAuth, requireScope('READ_AGENDAMENTOS'),  obterConversa);
router.post('/fluxo/inicio',     apiKeyAuth, requireScope('WRITE_AGENDAMENTOS'), etapaInicio);
router.post('/fluxo/especialidade', apiKeyAuth, requireScope('WRITE_AGENDAMENTOS'), etapaEspecialidade);
router.post('/fluxo/medico',     apiKeyAuth, requireScope('WRITE_AGENDAMENTOS'), etapaMedico);
router.post('/fluxo/horario',    apiKeyAuth, requireScope('WRITE_AGENDAMENTOS'), etapaHorario);
router.post('/fluxo/confirmar',  apiKeyAuth, requireScope('WRITE_AGENDAMENTOS'), etapaConfirmar);
router.post('/fluxo/enviar-lembrete', apiKeyAuth, requireScope('WRITE_AGENDAMENTOS'), enviarLembrete);

// ── Webhook da Evolution API (HMAC, SEM autenticação de utilizador) ─────────
router.post('/webhook', verificarHmacEvolution, receberWebhook);

// ── Actividade e histórico (ADMIN) ────────────────────────────────────────────
router.get('/actividade',   authenticate, listarActividade);
router.get('/conversas',    authenticate, listarConversas);
```

---

## 9. Jobs BullMQ

```typescript
// apps/worker/src/jobs/wa-lembrete.job.ts

// Corre às 07:00 (Africa/Luanda) para lembretes 24h
export async function jobLembrete24h() {
  const amanha = startOfDay(addDays(new Date(), 1));
  const depoisDeAmanha = endOfDay(amanha);

  const agendamentos = await prisma.agendamento.findMany({
    where: {
      dataHora: { gte: amanha, lte: depoisDeAmanha },
      estado: 'CONFIRMADO',
      canal: { not: 'CANCELADO' },
    },
    include: {
      paciente: { select: { telefone: true, nome: true } },
      medico:   { select: { nome: true, especialidade: true } },
      clinica:  {
        include: {
          waInstancia: {
            include: {
              automacoes: {
                where: { tipo: 'LEMBRETE_24H', ativo: true },
              },
            },
          },
        },
      },
    },
  });

  for (const ag of agendamentos) {
    const instancia = ag.clinica.waInstancia;
    if (!instancia || instancia.estado !== 'CONECTADO') continue;

    const automacao = instancia.automacoes[0];
    if (!automacao?.n8nWebhookPath) continue;

    const telefone = ag.paciente.telefone?.replace('+', '');
    if (!telefone) continue;

    // Disparar workflow de lembrete via n8n
    const webhookUrl = `${config.N8N_BASE_URL}/webhook/${automacao.n8nWebhookPath}`;
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agendamentoId: ag.id,
        numero: telefone,
        nome: ag.paciente.nome,
        data: format(ag.dataHora, "d 'de' MMMM", { locale: pt }),
        hora: format(ag.dataHora, 'HH:mm'),
        medico: ag.medico.nome,
        especialidade: ag.medico.especialidade,
      }),
    });
  }
}

// apps/worker/src/jobs/wa-expirar-conversas.job.ts
// Corre a cada hora
export async function jobExpirarConversas() {
  const limite = subHours(new Date(), 24);
  await prisma.waConversa.updateMany({
    where: {
      estado: { in: ['EM_FLUXO_MARCACAO', 'AGUARDA_CONFIRMACAO'] },
      ultimaMensagemEm: { lt: limite },
    },
    data: { estado: 'EXPIRADA', etapaFluxo: null },
  });
}
```

---

## 10. Variáveis de ambiente

```env
# Evolution API
EVOLUTION_API_URL=https://evo.clinicaplus.ao
EVOLUTION_API_KEY=evo_prod_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EVOLUTION_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# n8n
N8N_BASE_URL=https://n8n.clinicaplus.ao
N8N_API_KEY=n8n_api_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# URL pública da API (usada nos templates n8n para callbacks)
API_PUBLIC_URL=https://api.clinicaplus.ao
```

---

## 11. Checklist de verificação — módulo WhatsApp

### Database
- [ ] Migration `006_whatsapp` aplicada sem erros
- [ ] `pnpm prisma generate` sem erros TypeScript
- [ ] Campos `origem` (Paciente) e `canal` (Agendamento) adicionados
- [ ] Índice `@@index([ultimaMensagemEm])` em WaConversa presente

### Backend
- [ ] `evolutionApi.criarInstancia` retorna instanceName correcto
- [ ] `evolutionApi.enviarTexto` inclui `delay: 1200`
- [ ] HMAC verificado ANTES de qualquer processamento no webhook
- [ ] `clinicaId` extraído da API key (não do body) nos endpoints `/fluxo/*`
- [ ] Número WhatsApp normalizado (sem `@s.whatsapp.net`) antes de guardar
- [ ] `n8nApi.desactivar` tem `.catch(() => {})` — não bloquear se n8n em baixo
- [ ] `obterOuCriarPaciente` usa `+{numero}` no campo `telefone`
- [ ] Todos os eventos publicados via `publishEvent()` APÓS commit do Prisma

### n8n Templates
- [ ] Template de marcação tem nó `respondToWebhook` antes de nós que podem falhar
- [ ] Webhook paths únicos por clínica: `wa-marcacao-{slug}`
- [ ] API key interna incluída em TODOS os nós HTTP dos templates
- [ ] Templates filtram `fromMe=true` e mensagens de grupo `@g.us`

### Jobs
- [ ] `jobLembrete24h` agendado às 07:00 (Africa/Luanda)
- [ ] `jobExpirarConversas` agendado a cada hora
- [ ] Jobs não falham se instância estiver DESCONECTADA (skip silencioso)

### Frontend
- [ ] `WhatsappPage` protegida por `requirePlan('PRO')`
- [ ] QR code actualiza em tempo real via WebSocket `whatsapp:qrcode`
- [ ] Estado (CONECTADO/DESCONECTADO) actualiza via WebSocket `whatsapp:estado`
- [ ] Toggle de automação desactivado se instância não CONECTADA
- [ ] Campos de config por tipo corretos (horário, templates com variáveis)
- [ ] Actividade recente actualiza via WebSocket `whatsapp:marcacao`

### Segurança
- [ ] `POST /webhook` rejeita sem assinatura HMAC (401)
- [ ] `POST /webhook` rejeita com assinatura inválida (401)
- [ ] `POST /fluxo/inicio` rejeita com JWT (só aceita API key)
- [ ] `POST /instancias` com plano BASICO retorna 402

### Testes
- [ ] `pnpm test --run --filter=api -- wa-` todos verdes
- [ ] Coverage `src/services/wa-*` ≥ 85%
- [ ] `pnpm typecheck` zero erros
