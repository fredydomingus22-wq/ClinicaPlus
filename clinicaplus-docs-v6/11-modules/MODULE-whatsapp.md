# MODULE — WhatsApp, Evolution API & Automações n8n

> Fonte de verdade: este ficheiro + ADR-012
> Lê também: MODULE-subscricoes.md (plano PRO obrigatório), MODULE-plataforma.md (API keys)
> Requer plano: PRO (1 instância) | ENTERPRISE (ilimitado)

---

## 1. Schema completo — migration_006_whatsapp

```prisma
// ─── Instância WhatsApp de uma clínica ───────────────────────────────────────
enum WaEstadoInstancia {
  DESCONECTADO
  AGUARDA_QR
  CONECTADO
  ERRO
}

model WaInstancia {
  id            String   @id @default(cuid())
  clinicaId     String   @unique
  clinica       Clinica  @relation(fields: [clinicaId], references: [id])

  // Identificadores na Evolution API
  evolutionName  String  @unique  // ex: "cp-abc123-prod" — gerado, não editável
  evolutionToken String           // token de acesso à instância

  estado         WaEstadoInstancia @default(DESCONECTADO)
  numeroTelefone String?           // preenchido após ligar (+244923456789)
  qrCodeBase64   String?           // base64 do QR — apagado após conexão

  criadoEm      DateTime @default(now())
  actualizadoEm DateTime @updatedAt

  automacoes    WaAutomacao[]
  conversas     WaConversa[]

  @@index([clinicaId])
  @@map("wa_instancias")
}

// ─── Automação configurada pelo admin ────────────────────────────────────────
enum WaTipoAutomacao {
  MARCACAO_CONSULTA        // fluxo guiado: especialidade → médico → slot → confirm
  LEMBRETE_24H             // mensagem D-1 antes da consulta
  LEMBRETE_2H              // mensagem H-2 antes da consulta
  CONFIRMACAO_CANCELAMENTO // paciente responde SIM/NAO ao lembrete
  BOAS_VINDAS              // primeiro contacto de número desconhecido
}

model WaAutomacao {
  id          String   @id @default(cuid())
  instanciaId String
  instancia   WaInstancia @relation(fields: [instanciaId], references: [id])

  tipo        WaTipoAutomacao
  ativo       Boolean  @default(false)

  // IDs no n8n — null enquanto não activado
  n8nWorkflowId  String?
  n8nWebhookPath String?  // path do webhook: ex: "wa-marcacao-cp-abc123"

  // Configuração específica por tipo (JSON livre)
  // MARCACAO: { horarioInicio, horarioFim, msgForaHorario, msgBoasVindas }
  // LEMBRETE_24H: { template: "Olá {nome}! Lembrete da consulta amanhã às {hora}..." }
  // LEMBRETE_2H: { template: "..." }
  // CONFIRMACAO: { msgConfirmado, msgCancelado }
  // BOAS_VINDAS: { mensagem }
  configuracao Json     @default("{}")

  criadoEm    DateTime @default(now())
  actualizadoEm DateTime @updatedAt

  @@unique([instanciaId, tipo])
  @@index([instanciaId])
  @@map("wa_automacoes")
}

// ─── Conversa activa com um paciente ─────────────────────────────────────────
enum WaEstadoConversa {
  AGUARDA_INPUT
  EM_FLUXO_MARCACAO
  AGUARDA_CONFIRMACAO
  CONCLUIDA
  EXPIRADA          // sem resposta há mais de 24h
}

model WaConversa {
  id          String   @id @default(cuid())
  instanciaId String
  instancia   WaInstancia @relation(fields: [instanciaId], references: [id])

  numeroWhatsapp  String       // ex: "244923456789" (sem @s.whatsapp.net)
  pacienteId      String?      // null se número desconhecido
  paciente        Paciente?    @relation(fields: [pacienteId], references: [id])

  estado          WaEstadoConversa @default(AGUARDA_INPUT)
  etapaFluxo      String?          // "ESCOLHA_ESPECIALIDADE" | "ESCOLHA_MEDICO" | ...
  // Dados acumulados durante o fluxo
  // { especialidade, medicoId, medicoNome, slot, pacienteNome, ... }
  contexto        Json?

  ultimaMensagemEm DateTime?
  criadoEm        DateTime @default(now())

  mensagens       WaMensagem[]

  @@unique([instanciaId, numeroWhatsapp])
  @@index([instanciaId, estado])
  @@index([pacienteId])
  @@map("wa_conversas")
}

// ─── Histórico de mensagens ───────────────────────────────────────────────────
enum WaDirecao {
  ENTRADA   // mensagem do paciente
  SAIDA     // mensagem do bot
}

model WaMensagem {
  id          String   @id @default(cuid())
  conversaId  String
  conversa    WaConversa @relation(fields: [conversaId], references: [id])

  direcao     WaDirecao
  conteudo    String
  tipo        String   @default("text")  // text | image | audio | document

  evolutionMsgId  String?   // ID da mensagem na Evolution API
  entregue        Boolean   @default(false)
  lida            Boolean   @default(false)

  criadoEm    DateTime @default(now())

  @@index([conversaId, criadoEm])
  @@map("wa_mensagens")
}
```

---

## 2. Arquitectura de ficheiros

```
apps/api/src/
├── lib/
│   ├── evolutionApi.ts           cliente HTTP para Evolution API
│   └── n8nApi.ts                 cliente HTTP para n8n REST API
├── lib/n8n-templates/
│   ├── index.ts                  registo de todos os templates
│   ├── marcacao.template.ts      workflow de marcação de consulta
│   ├── lembrete-24h.template.ts  workflow de lembrete D-1
│   ├── lembrete-2h.template.ts   workflow de lembrete H-2
│   ├── confirmacao.template.ts   workflow de confirmação/cancelamento
│   └── boas-vindas.template.ts   workflow de boas-vindas
├── services/
│   ├── wa-instancia.service.ts   criar/gerir instâncias na Evolution API
│   ├── wa-automacao.service.ts   activar/desactivar + criar workflows no n8n
│   ├── wa-webhook.service.ts     processar eventos da Evolution API
│   ├── wa-conversa.service.ts    máquina de estados da conversa
│   └── wa-mensagem.service.ts    enviar mensagens via Evolution API
└── routes/
    └── whatsapp.ts               todas as rotas /api/whatsapp/*

apps/worker/src/jobs/
└── wa-expirar-conversas.job.ts   expirar conversas sem resposta há 24h

apps/web/src/pages/configuracoes/
└── WhatsappPage.tsx              painel de automações do admin
apps/web/src/components/
└── wa/
    ├── WaConexaoCard.tsx         card de estado + QR code
    ├── WaAutomacaoCard.tsx       card por tipo de automação
    └── WaActividadeRecente.tsx   feed de actividade em tempo real
```

---

## 3. Variáveis de ambiente novas

```env
# Evolution API
EVOLUTION_API_URL=https://evo.clinicaplus.ao
EVOLUTION_API_KEY=evo_prod_xxxxxxxxxxxxxxxx
EVOLUTION_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxx   # para verificar HMAC

# n8n
N8N_BASE_URL=https://n8n.clinicaplus.ao
N8N_API_KEY=n8n_api_xxxxxxxxxxxxxxxx

# URL público da API (usado nos templates n8n para callbacks)
API_PUBLIC_URL=https://api.clinicaplus.ao
```

---

## 4. Cliente Evolution API

```typescript
// apps/api/src/lib/evolutionApi.ts

import axios from 'axios';
import { config } from './config';

const evo = axios.create({
  baseURL: config.EVOLUTION_API_URL,
  headers: { apikey: config.EVOLUTION_API_KEY },
  timeout: 15_000,
});

export const evolutionApi = {
  async criarInstancia(instanceName: string, webhookUrl: string) {
    const { data } = await evo.post('/instance/create', {
      instanceName,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
      webhook: {
        url: webhookUrl,
        byEvents: false,
        base64: false,
        events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'QRCODE_UPDATED'],
      },
    });
    return data;
  },

  async obterQrCode(instanceName: string) {
    const { data } = await evo.get(`/instance/connect/${instanceName}`);
    return data as { base64: string };
  },

  async estadoConexao(instanceName: string) {
    const { data } = await evo.get(`/instance/connectionState/${instanceName}`);
    return data as { state: 'open' | 'close' | 'connecting' };
  },

  async enviarTexto(instanceName: string, numero: string, texto: string) {
    const { data } = await evo.post(`/message/sendText/${instanceName}`, {
      number: numero,
      text: texto,
      delay: 1200,  // simula digitação (ms) — melhor UX
    });
    return data;
  },

  async desligar(instanceName: string) {
    await evo.delete(`/instance/logout/${instanceName}`);
  },

  async eliminar(instanceName: string) {
    await evo.delete(`/instance/delete/${instanceName}`);
  },
};
```

---

## 5. Cliente n8n

```typescript
// apps/api/src/lib/n8nApi.ts

import axios from 'axios';
import { config } from './config';
import { TEMPLATES } from './n8n-templates/index';
import type { WaTipoAutomacao } from '@prisma/client';

const n8n = axios.create({
  baseURL: config.N8N_BASE_URL,
  headers: { 'X-N8N-API-KEY': config.N8N_API_KEY },
  timeout: 20_000,
});

export interface TemplateVars {
  clinicaId:    string;
  clinicaSlug:  string;
  instanceName: string;
  apiBaseUrl:   string;
  apiKey:       string;  // API key interna gerada para o n8n
  configuracao: Record<string, unknown>;
}

export const n8nApi = {
  async criarWorkflow(tipo: WaTipoAutomacao, vars: TemplateVars) {
    const template = TEMPLATES[tipo](vars);
    const { data } = await n8n.post('/api/v1/workflows', template);
    await n8n.post(`/api/v1/workflows/${data.id}/activate`);
    const webhookPath = extrairWebhookPath(data);
    return { workflowId: data.id as string, webhookPath };
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
};

function extrairWebhookPath(workflowData: Record<string, unknown>): string {
  const nodes = (workflowData.nodes as { type: string; parameters?: { path?: string } }[]) ?? [];
  const webhookNode = nodes.find(n => n.type === 'n8n-nodes-base.webhook');
  return webhookNode?.parameters?.path ?? '';
}
```

---

## 6. Serviço de automação — activar/desactivar

```typescript
// apps/api/src/services/wa-automacao.service.ts

export const waAutomacaoService = {
  async activar(automacaoId: string, clinicaId: string, userId: string) {
    const automacao = await prisma.waAutomacao.findFirstOrThrow({
      where: { id: automacaoId },
      include: { instancia: true },
    });

    if (automacao.instancia.estado !== 'CONECTADO') {
      throw new AppError(
        'Liga o WhatsApp antes de activar automações.',
        400,
        'WA_INSTANCIA_DESCONECTADA'
      );
    }

    // Gerar (ou reutilizar) API key interna para o n8n
    const apiKey = await apiKeyService.getOrCreateInternal(clinicaId, 'n8n-whatsapp');
    const clinica = await prisma.clinica.findUniqueOrThrow({ where: { id: clinicaId } });

    const vars: TemplateVars = {
      clinicaId,
      clinicaSlug:  clinica.slug,
      instanceName: automacao.instancia.evolutionName,
      apiBaseUrl:   config.API_PUBLIC_URL,
      apiKey:       apiKey.tokenPlain,  // token em texto — só disponível aqui
      configuracao: automacao.configuracao as Record<string, unknown>,
    };

    const { workflowId, webhookPath } = await n8nApi.criarWorkflow(automacao.tipo, vars);

    await prisma.waAutomacao.update({
      where: { id: automacaoId },
      data: { ativo: true, n8nWorkflowId: workflowId, n8nWebhookPath: webhookPath },
    });

    await auditLogService.log({
      clinicaId, userId, accao: 'WA_AUTOMACAO_ACTIVAR',
      recurso: 'wa_automacao', recursoId: automacaoId,
    });
  },

  async desactivar(automacaoId: string, clinicaId: string, userId: string) {
    const automacao = await prisma.waAutomacao.findFirstOrThrow({
      where: { id: automacaoId, instancia: { clinicaId } },
    });

    if (automacao.n8nWorkflowId) {
      await n8nApi.desactivar(automacao.n8nWorkflowId).catch(() => {
        // não bloquear se n8n estiver em baixo — marcar como inactivo no DB
      });
    }

    await prisma.waAutomacao.update({
      where: { id: automacaoId },
      data: { ativo: false },
    });

    await auditLogService.log({
      clinicaId, userId, accao: 'WA_AUTOMACAO_DESACTIVAR',
      recurso: 'wa_automacao', recursoId: automacaoId,
    });
  },
};
```

---

## 7. Máquina de estados da conversa

### Etapas do fluxo de marcação

```
INICIO
  └─► envia lista de especialidades
      └─► [ESCOLHA_ESPECIALIDADE]
          └─► valida input → envia lista de médicos
              └─► [ESCOLHA_MEDICO]
                  └─► valida input → envia slots disponíveis
                      └─► [ESCOLHA_HORARIO]
                          └─► valida input → mostra resumo + pede confirmação
                              └─► [AGUARDA_CONFIRMACAO]
                                  ├─► SIM → cria agendamento → CONCLUIDA
                                  └─► NAO → cancela → CONCLUIDA
```

### Regras de timeout e reset

- Sem resposta > 24h → job marca conversa como EXPIRADA
- Paciente escreve qualquer coisa após EXPIRADA → começa do INICIO
- Paciente escreve "cancelar" em qualquer etapa → cancela e vai para CONCLUIDA
- Paciente escreve número inválido → repete a mesma etapa (máx. 3 tentativas)
- 3 erros consecutivos → "Não entendi. Escreve *oi* para recomeçar."

---

## 8. Endpoints da API

```
# Gestão da instância (ADMIN, plano PRO+)
POST   /api/whatsapp/instancias              criar instância + QR code
GET    /api/whatsapp/instancias/qrcode       obter QR code actualizado
GET    /api/whatsapp/instancias/estado       { estado, numeroTelefone }
DELETE /api/whatsapp/instancias              desligar e eliminar instância

# Gestão de automações (ADMIN, plano PRO+)
GET    /api/whatsapp/automacoes              listar os 5 tipos com estado ativo/inativo
PATCH  /api/whatsapp/automacoes/:id          actualizar configuracao (sem activar)
POST   /api/whatsapp/automacoes/:id/activar  activar (cria workflow n8n)
POST   /api/whatsapp/automacoes/:id/desactivar

# Endpoints do fluxo — chamados pelo n8n (autenticação por API key interna)
POST   /api/whatsapp/fluxo/inicio            iniciar fluxo com paciente
POST   /api/whatsapp/fluxo/especialidade     processar escolha de especialidade
POST   /api/whatsapp/fluxo/medico            processar escolha de médico
POST   /api/whatsapp/fluxo/horario           processar escolha de horário
POST   /api/whatsapp/fluxo/confirmar         confirmar ou cancelar marcação
GET    /api/whatsapp/fluxo/conversa          obter estado actual da conversa

# Webhook da Evolution API (HMAC auth)
POST   /api/whatsapp/webhook                 receber eventos da Evolution API

# Actividade (ADMIN)
GET    /api/whatsapp/actividade              últimas 20 acções (marcações, lembretes, etc.)
GET    /api/whatsapp/conversas               lista de conversas activas
```

---

## 9. Segurança — regras absolutas

```typescript
// VERIFICAÇÃO HMAC obrigatória no webhook da Evolution API
function verificarHmacEvolution(req: Request, res: Response, next: NextFunction) {
  const signature = req.headers['x-evolution-signature'] as string;
  if (!signature) throw new AppError('Sem assinatura', 401, 'WEBHOOK_NO_SIGNATURE');

  const body = JSON.stringify(req.body);
  const expected = crypto
    .createHmac('sha256', config.EVOLUTION_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw new AppError('Assinatura inválida', 401, 'WEBHOOK_INVALID_SIGNATURE');
  }
  next();
}
```

**Regras:**
- Webhook da Evolution API: SEMPRE verificar HMAC — nunca processar sem verificação
- Endpoints `/fluxo/*`: autenticação por API key interna (não JWT) — o n8n não tem JWT
- `clinicaId` sempre extraído da API key — nunca do body (evitar IDOR)
- Número WhatsApp: normalizar para `244XXXXXXXXX` antes de guardar (remover `@s.whatsapp.net`)

---

## 10. Job de expiração de conversas

```typescript
// apps/worker/src/jobs/wa-expirar-conversas.job.ts
// Corre a cada hora

export async function jobExpirarConversas() {
  const limite = subHours(new Date(), 24);

  await prisma.waConversa.updateMany({
    where: {
      estado:          { in: ['EM_FLUXO_MARCACAO', 'AGUARDA_CONFIRMACAO'] },
      ultimaMensagemEm: { lt: limite },
    },
    data: { estado: 'EXPIRADA', etapaFluxo: null },
  });
}
// agenda.every('0 * * * *', jobExpirarConversas);
```
