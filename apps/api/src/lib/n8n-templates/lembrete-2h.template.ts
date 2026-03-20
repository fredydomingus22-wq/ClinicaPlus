import { TemplateVars } from '../n8nApi';

export function templateLembrete2h(vars: TemplateVars): object {
  const slug = vars.clinicaSlug;
  const config = vars.configuracao as { mensagem?: string };
  const template = config.mensagem || 'lembrete_2h';

  return {
    name: `[${slug}] WA — Lembrete 2h`,
    nodes: [
      {
        id: 'node-webhook',
        name: 'Receber Trigger',
        type: 'n8n-nodes-base.webhook',
        position: [240, 300],
        typeVersion: 2,
        parameters: {
          path: `wa-lembrete2h-${slug}`,
          responseMode: 'responseNode',
          httpMethod: 'POST',
        },
        webhookId: `wa-lembrete2h-${slug}`,
      },
      {
        id: 'node-enviar',
        name: 'Enviar Lembrete',
        type: 'n8n-nodes-base.httpRequest',
        position: [460, 300],
        typeVersion: 4.1,
        parameters: {
          method: 'POST',
          url: `${vars.apiBaseUrl}/api/whatsapp/notificacoes/enviar`,
          authentication: 'none',
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
      'Receber Trigger': { main: [[{ node: 'Enviar Lembrete', type: 'main', index: 0 }]] },
      'Enviar Lembrete':  { main: [[{ node: 'Responder 200', type: 'main', index: 0 }]] },
    },
    settings: { executionOrder: 'v1' },
  };
}
