import type { TemplateVars } from '../n8nApi';

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
              value: `={{ $json.body.data.key.remoteJid.replace('@s.whatsapp.net','').replace('@c.us','') }}`,
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
              { name: 'numero',       value: `={{ $('Receber Mensagem').item.json.body.data.key.remoteJid.replace('@s.whatsapp.net','').replace('@c.us','') }}` },
              { name: 'instanceName', value: vars.instanceName },
              { name: 'resposta',     value: `={{ $('Receber Mensagem').item.json.body.data.message?.conversation ?? $('Receber Mensagem').item.json.body.data.message?.extendedTextMessage?.text ?? '' }}` },
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
  };
}
