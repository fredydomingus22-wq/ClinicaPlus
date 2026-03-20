import { TemplateVars } from '../n8nApi';

export function templateBoasVindas(vars: TemplateVars): object {
  const slug = vars.clinicaSlug;
  const config = vars.configuracao as { mensagem?: string };
  const mensagem = config.mensagem
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
      {
        id: 'node-check-novo',
        name: 'É número novo?',
        type: 'n8n-nodes-base.httpRequest',
        position: [460, 300],
        typeVersion: 4.1,
        parameters: {
          method: 'POST',
          url: `${vars.apiBaseUrl}/api/whatsapp/fluxo/boas-vindas`,
          authentication: 'none',
          sendHeaders: true,
          headerParameters: { parameters: [{ name: 'x-api-key', value: vars.apiKey }] },
          sendBody: true,
          bodyParameters: {
            parameters: [
              { name: 'numero',       value: `={{ $json.body.data.key.remoteJid.replace('@s.whatsapp.net','').replace('@c.us','') }}` },
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
  };
}
