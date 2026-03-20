import type { TemplateVars } from '../n8nApi';

export function templateLembrete24h(vars: TemplateVars): object {
  const slug = vars.clinicaSlug;
  const config = vars.configuracao as { template?: string };
  const template = config.template
    ?? 'Olá {nome}! 👋 Lembrete da tua consulta amanhã às *{hora}* com *{medico}*.\n\nPara confirmar responde *SIM*, para cancelar responde *NÃO*.';

  return {
    name: `[${slug}] WA — Lembrete 24h`,
    nodes: [
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
