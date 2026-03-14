# Reference — Templates de Workflow n8n

## Princípios dos templates

1. **Stateless** — o n8n não guarda estado. Todo o estado vive no ClinicaPlus DB.
2. **Parametrizados** — cada template recebe `TemplateVars` com dados da clínica.
3. **Idempotentes** — se o mesmo template for criado 2x para a mesma clínica,
   o segundo sobrepõe o primeiro (mesmo `webhookId` = mesmo webhook URL).
4. **Resilientes** — erro num nó não deve crashar o workflow inteiro.
   Usar nó "Respond to Webhook" antes de nós que podem falhar.

## Registo central de templates

```typescript
// apps/api/src/lib/n8n-templates/index.ts
import type { WaTipoAutomacao } from '@prisma/client';
import type { TemplateVars } from '../n8nApi';
import { templateMarcacao }    from './marcacao.template';
import { templateLembrete24h } from './lembrete-24h.template';
import { templateLembrete2h }  from './lembrete-2h.template';
import { templateConfirmacao } from './confirmacao.template';
import { templateBoasVindas }  from './boas-vindas.template';

export const TEMPLATES: Record<WaTipoAutomacao, (vars: TemplateVars) => object> = {
  MARCACAO_CONSULTA:        templateMarcacao,
  LEMBRETE_24H:             templateLembrete24h,
  LEMBRETE_2H:              templateLembrete2h,
  CONFIRMACAO_CANCELAMENTO: templateConfirmacao,
  BOAS_VINDAS:              templateBoasVindas,
};
```

## Template: Lembrete 24h

```typescript
// apps/api/src/lib/n8n-templates/lembrete-24h.template.ts
// Este workflow é activado pelo ClinicaPlus (POST para o webhook do n8n)
// quando o job BullMQ de lembretes dispara, NÃO pela Evolution API

export function templateLembrete24h(vars: TemplateVars): object {
  const slug = vars.clinicaSlug;
  const template = (vars.configuracao as { template?: string }).template
    ?? 'Olá {nome}! 👋 Lembrete da tua consulta amanhã às *{hora}* com *{medico}*.\n\nPara confirmar responde *SIM*, para cancelar responde *NÃO*.';

  return {
    name: `[${slug}] WA — Lembrete 24h`,
    nodes: [
      // Webhook chamado pelo job BullMQ do ClinicaPlus worker
      {
        id: 'node-webhook',
        name: 'Receber Trigger Lembrete',
        type: 'n8n-nodes-base.webhook',
        position: [240, 300],
        typeVersion: 2,
        parameters: {
          path: `wa-lembrete24h-${slug}`,
          responseMode: 'responseNode',
          httpMethod: 'POST',
        },
        webhookId: `wa-lembrete24h-${slug}`,
      },
      // Enviar mensagem via ClinicaPlus API (que chama a Evolution API)
      {
        id: 'node-enviar',
        name: 'Enviar Lembrete',
        type: 'n8n-nodes-base.httpRequest',
        position: [460, 300],
        typeVersion: 4.2,
        parameters: {
          method: 'POST',
          url: `${vars.apiBaseUrl}/api/whatsapp/fluxo/enviar-lembrete`,
          sendHeaders: true,
          headerParameters: { parameters: [{ name: 'x-api-key', value: vars.apiKey }] },
          sendBody: true,
          bodyParameters: {
            parameters: [
              { name: 'agendamentoId', value: '={{ $json.body.agendamentoId }}' },
              { name: 'instanceName',  value: vars.instanceName },
              { name: 'template',      value: template },
            ],
          },
        },
      },
      {
        id: 'node-resposta',
        name: 'Responder 200',
        type: 'n8n-nodes-base.respondToWebhook',
        position: [680, 300],
        typeVersion: 1.1,
        parameters: { respondWith: 'json', responseBody: '={ "ok": true }' },
      },
    ],
    connections: {
      'Receber Trigger Lembrete': { main: [[{ node: 'Enviar Lembrete', type: 'main', index: 0 }]] },
      'Enviar Lembrete':          { main: [[{ node: 'Responder 200', type: 'main', index: 0 }]] },
    },
    settings: { executionOrder: 'v1' },
    tags: [{ name: slug }, { name: 'whatsapp' }, { name: 'lembrete' }],
  };
}
```

## Template: Confirmação/Cancelamento

```typescript
// apps/api/src/lib/n8n-templates/confirmacao.template.ts
// Recebe mensagens da Evolution API e processa SIM/NAO de lembretes

export function templateConfirmacao(vars: TemplateVars): object {
  const slug = vars.clinicaSlug;
  return {
    name: `[${slug}] WA — Confirmação/Cancelamento`,
    nodes: [
      {
        id: 'node-webhook',
        name: 'Receber Mensagem',
        type: 'n8n-nodes-base.webhook',
        position: [240, 300],
        typeVersion: 2,
        parameters: {
          path: `wa-confirmacao-${slug}`,
          responseMode: 'responseNode',
          httpMethod: 'POST',
        },
        webhookId: `wa-confirmacao-${slug}`,
      },
      // Filtro: só processar se conversa está em AGUARDA_CONFIRMACAO
      {
        id: 'node-check-estado',
        name: 'Conversa aguarda confirmação?',
        type: 'n8n-nodes-base.httpRequest',
        position: [460, 300],
        typeVersion: 4.2,
        parameters: {
          method: 'GET',
          url: `${vars.apiBaseUrl}/api/whatsapp/fluxo/conversa`,
          sendHeaders: true,
          headerParameters: { parameters: [{ name: 'x-api-key', value: vars.apiKey }] },
          sendQuery: true,
          queryParameters: {
            parameters: [{
              name: 'numero',
              value: `={{ $json.body.data.key.remoteJid.replace('@s.whatsapp.net','') }}`,
            }],
          },
        },
      },
      {
        id: 'node-filtro-estado',
        name: 'Estado = AGUARDA_CONFIRMACAO?',
        type: 'n8n-nodes-base.if',
        position: [680, 300],
        typeVersion: 2,
        parameters: {
          conditions: {
            conditions: [{
              leftValue:  '={{ $json.data?.estado }}',
              rightValue: 'AGUARDA_CONFIRMACAO',
              operator: { type: 'string', operation: 'equals' },
            }],
            combinator: 'and',
          },
        },
      },
      {
        id: 'node-processar',
        name: 'Processar Confirmação',
        type: 'n8n-nodes-base.httpRequest',
        position: [900, 200],
        typeVersion: 4.2,
        parameters: {
          method: 'POST',
          url: `${vars.apiBaseUrl}/api/whatsapp/fluxo/confirmar`,
          sendHeaders: true,
          headerParameters: { parameters: [{ name: 'x-api-key', value: vars.apiKey }] },
          sendBody: true,
          bodyParameters: {
            parameters: [
              { name: 'numero',       value: `={{ $('Receber Mensagem').item.json.body.data.key.remoteJid.replace('@s.whatsapp.net','') }}` },
              { name: 'instanceName', value: vars.instanceName },
              { name: 'resposta',     value: `={{ $('Receber Mensagem').item.json.body.data.message?.conversation ?? '' }}` },
            ],
          },
        },
      },
      {
        id: 'node-resposta',
        name: 'Responder 200',
        type: 'n8n-nodes-base.respondToWebhook',
        position: [1100, 300],
        typeVersion: 1.1,
        parameters: { respondWith: 'json', responseBody: '={ "ok": true }' },
      },
    ],
    connections: {
      'Receber Mensagem':               { main: [[{ node: 'Conversa aguarda confirmação?', type: 'main', index: 0 }]] },
      'Conversa aguarda confirmação?':  { main: [[{ node: 'Estado = AGUARDA_CONFIRMACAO?', type: 'main', index: 0 }]] },
      'Estado = AGUARDA_CONFIRMACAO?':  { main: [[{ node: 'Processar Confirmação', type: 'main', index: 0 }], [{ node: 'Responder 200', type: 'main', index: 0 }]] },
      'Processar Confirmação':          { main: [[{ node: 'Responder 200', type: 'main', index: 0 }]] },
    },
    settings: { executionOrder: 'v1' },
    tags: [{ name: slug }, { name: 'whatsapp' }, { name: 'confirmacao' }],
  };
}
```

## Template: Boas-vindas

```typescript
// apps/api/src/lib/n8n-templates/boas-vindas.template.ts
export function templateBoasVindas(vars: TemplateVars): object {
  const slug = vars.clinicaSlug;
  const mensagem = (vars.configuracao as { mensagem?: string }).mensagem
    ?? `Olá! 👋 Bem-vindo à nossa clínica.\nPara marcar uma consulta escreve *marcar*.`;

  return {
    name: `[${slug}] WA — Boas-vindas`,
    nodes: [
      {
        id: 'node-webhook',
        name: 'Receber Mensagem',
        type: 'n8n-nodes-base.webhook',
        position: [240, 300],
        typeVersion: 2,
        parameters: {
          path: `wa-boasvindas-${slug}`,
          responseMode: 'responseNode',
          httpMethod: 'POST',
        },
        webhookId: `wa-boasvindas-${slug}`,
      },
      // Só enviar boas-vindas a números desconhecidos (sem conversa prévia)
      {
        id: 'node-check-novo',
        name: 'É número novo?',
        type: 'n8n-nodes-base.httpRequest',
        position: [460, 300],
        typeVersion: 4.2,
        parameters: {
          method: 'POST',
          url: `${vars.apiBaseUrl}/api/whatsapp/fluxo/boas-vindas`,
          sendHeaders: true,
          headerParameters: { parameters: [{ name: 'x-api-key', value: vars.apiKey }] },
          sendBody: true,
          bodyParameters: {
            parameters: [
              { name: 'numero',       value: `={{ $json.body.data.key.remoteJid.replace('@s.whatsapp.net','') }}` },
              { name: 'instanceName', value: vars.instanceName },
              { name: 'mensagem',     value: mensagem },
            ],
          },
        },
      },
      {
        id: 'node-resposta',
        name: 'Responder 200',
        type: 'n8n-nodes-base.respondToWebhook',
        position: [680, 300],
        typeVersion: 1.1,
        parameters: { respondWith: 'json', responseBody: '={ "ok": true }' },
      },
    ],
    connections: {
      'Receber Mensagem': { main: [[{ node: 'É número novo?', type: 'main', index: 0 }]] },
      'É número novo?':   { main: [[{ node: 'Responder 200', type: 'main', index: 0 }]] },
    },
    settings: { executionOrder: 'v1' },
    tags: [{ name: slug }, { name: 'whatsapp' }, { name: 'boasvindas' }],
  };
}
```

## Convenção de nomes de webhook paths

```
wa-marcacao-{slug}        ← fluxo de marcação (Evolution API → n8n)
wa-confirmacao-{slug}     ← confirmação/cancelamento (Evolution API → n8n)
wa-boasvindas-{slug}      ← boas-vindas (Evolution API → n8n)
wa-lembrete24h-{slug}     ← lembrete D-1 (ClinicaPlus worker → n8n)
wa-lembrete2h-{slug}      ← lembrete H-2 (ClinicaPlus worker → n8n)
```

**Importante:** a Evolution API só pode ter 1 webhook URL por instância.
Os workflows de marcação, confirmação e boas-vindas recebem TODAS as mensagens.
Cada workflow filtra o que lhe pertence (por estado da conversa).
A Evolution API configura o webhook para apontar ao workflow de marcação
(que é o mais abrangente) — os outros são activados pelo ClinicaPlus directamente.
