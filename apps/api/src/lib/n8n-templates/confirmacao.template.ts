import { TemplateVars } from '../n8nApi';

export function templateConfirmacao(vars: TemplateVars): object {
  const slug = vars.clinicaSlug;
  const instanceClean = vars.instanceName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const webhookPath = `wa-confirmacao-${instanceClean}-${vars.automacaoId.slice(-4)}`;

  return {
    name: `[${slug}] WA — Confirmação/Cancelamento (${vars.instanceName})`,
    nodes: [
      {
        id: 'node-webhook',
        name: 'Receber Mensagem',
        type: 'n8n-nodes-base.webhook',
        position: [240, 200],
        typeVersion: 2,
        parameters: {
          path: webhookPath,
          responseMode: 'responseNode',
          httpMethod: 'POST',
        },
        webhookId: webhookPath,
      },
      {
        id: 'node-if-msg',
        name: 'É mensagem?',
        type: 'n8n-nodes-base.if',
        position: [460, 200],
        typeVersion: 1,
        parameters: {
          conditions: {
            string: [
              {
                value1: '={{ $json.body.data.message?.conversation || $json.body.data.message?.extendedTextMessage?.text }}',
                operation: 'notEmpty',
              },
            ],
          },
        },
      },
      {
        id: 'node-filter-owner',
        name: 'Não é do sistema?',
        type: 'n8n-nodes-base.if',
        position: [680, 200],
        typeVersion: 1,
        parameters: {
          conditions: {
            boolean: [
              {
                value1: '={{ $json.body.data.key.fromMe }}',
                value2: false,
              },
            ],
            combinator: 'and',
          },
        },
      },
      {
        id: 'node-processar',
        name: 'Processar Confirmação',
        type: 'n8n-nodes-base.httpRequest',
        position: [900, 200],
        typeVersion: 4.1,
        parameters: {
          method: 'POST',
          url: `${vars.apiBaseUrl}/api/whatsapp/fluxo/confirmar`,
          authentication: 'none',
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
        position: [1120, 200],
        typeVersion: 1.1,
        parameters: { respondWith: 'json', responseBody: '={ "ok": true }' },
      },
    ],
    connections: {
      'Receber Mensagem': { main: [[{ node: 'É mensagem?', type: 'main', index: 0 }]] },
      'É mensagem?': { main: [[{ node: 'Não é do sistema?', type: 'main', index: 0 }]] },
      'Não é do sistema?': { main: [[{ node: 'Processar Confirmação', type: 'main', index: 0 }]] },
      'Processar Confirmação': { main: [[{ node: 'Responder 200', type: 'main', index: 0 }]] },
    },
    settings: { executionOrder: 'v1' },
  };
}
