import type { TemplateVars } from '../n8nApi';

export function templateMarcacao(vars: TemplateVars): object {
  const slug = vars.clinicaSlug;
  const instanceClean = vars.instanceName.toLowerCase().replace(/[^a-z0-h0-9]/g, '-');
  const webhookPath = `wa-marcacao-${instanceClean}-${vars.automacaoId.slice(-4)}`;

  return {
    name: `[${slug}] WA — Marcação de Consulta (${vars.instanceName})`,
    nodes: [
      {
        id: 'node-webhook',
        name: 'Receber Mensagem',
        type: 'n8n-nodes-base.webhook',
        position: [240, 300],
        typeVersion: 2,
        parameters: {
          path: webhookPath,
          responseMode: 'responseNode',
          httpMethod: 'POST',
        },
        webhookId: webhookPath,
      },
      {
        id: 'node-filtro',
        name: 'É mensagem válida?',
        type: 'n8n-nodes-base.if',
        position: [460, 300],
        typeVersion: 2,
        parameters: {
          conditions: {
            options: { caseSensitive: true },
            conditions: [
              {
                id: 'cond-from-me',
                leftValue: '={{ $json.body.data.key.fromMe }}',
                rightValue: true,
                operator: { type: 'boolean', operation: 'notEquals' },
              },
              {
                id: 'cond-grupo',
                leftValue: '={{ $json.body.data.key.remoteJid }}',
                rightValue: '@g.us',
                operator: { type: 'string', operation: 'notContains' },
              },
            ],
            combinator: 'and',
          },
        },
      },
      {
        id: 'node-buscar-conversa',
        name: 'Buscar Estado Conversa',
        type: 'n8n-nodes-base.httpRequest',
        position: [680, 200],
        typeVersion: 4.1,
        parameters: {
          method: 'GET',
          url: `${vars.apiBaseUrl}/api/whatsapp/fluxo/conversa`,
          authentication: 'none',
          sendHeaders: true,
          headerParameters: {
            parameters: [{ name: 'x-api-key', value: vars.apiKey }],
          },
          sendQuery: true,
          queryParameters: {
            parameters: [
              {
                name: 'numero',
                value: `={{ $('Receber Mensagem').item.json.body.data.key.remoteJid.replace('@s.whatsapp.net','').replace('@c.us','') }}`,
              },
            ],
          },
        },
      },
      {
        id: 'node-router',
        name: 'Qual a etapa?',
        type: 'n8n-nodes-base.switch',
        position: [900, 200],
        typeVersion: 3,
        parameters: {
          value1: '={{ $json.data?.etapaFluxo || "INICIO" }}',
          rules: {
            rules: [
              { value2: 'ESCOLHA_ESPECIALIDADE', operation: 'equals' },
              { value2: 'ESCOLHA_MEDICO', operation: 'equals' },
              { value2: 'ESCOLHA_HORARIO', operation: 'equals' },
              { value2: 'AGUARDA_CONFIRMACAO', operation: 'equals' },
            ],
          },
        },
      },
      {
        id: 'node-inicio',
        name: 'Etapa: Início',
        type: 'n8n-nodes-base.httpRequest',
        position: [1120, 0],
        typeVersion: 4.1,
        parameters: {
          method: 'POST',
          url: `${vars.apiBaseUrl}/api/whatsapp/fluxo/inicio`,
          authentication: 'none',
          sendHeaders: true,
          headerParameters: { parameters: [{ name: 'x-api-key', value: vars.apiKey }] },
          sendBody: true,
          bodyParameters: {
            parameters: [
              { name: 'numero', value: `={{ $('Receber Mensagem').item.json.body.data.key.remoteJid.replace('@s.whatsapp.net','') }}` },
              { name: 'instanceName', value: vars.instanceName },
              { name: 'pushName', value: `={{ $('Receber Mensagem').item.json.body.data.pushName ?? '' }}` },
            ],
          },
        },
      },
      {
        id: 'node-especialidade',
        name: 'Etapa: Especialidade',
        type: 'n8n-nodes-base.httpRequest',
        position: [1120, 100],
        typeVersion: 4.1,
        parameters: {
          method: 'POST',
          url: `${vars.apiBaseUrl}/api/whatsapp/fluxo/especialidade`,
          authentication: 'none',
          sendHeaders: true,
          headerParameters: { parameters: [{ name: 'x-api-key', value: vars.apiKey }] },
          sendBody: true,
          bodyParameters: {
            parameters: [
              { name: 'numero', value: `={{ $('Receber Mensagem').item.json.body.data.key.remoteJid.replace('@s.whatsapp.net','') }}` },
              { name: 'instanceName', value: vars.instanceName },
              { name: 'resposta', value: `={{ $('Receber Mensagem').item.json.body.data.message?.conversation ?? $('Receber Mensagem').item.json.body.data.message?.extendedTextMessage?.text ?? '' }}` },
            ],
          },
        },
      },
      {
        id: 'node-medico',
        name: 'Etapa: Médico',
        type: 'n8n-nodes-base.httpRequest',
        position: [1120, 200],
        typeVersion: 4.1,
        parameters: {
          method: 'POST',
          url: `${vars.apiBaseUrl}/api/whatsapp/fluxo/medico`,
          authentication: 'none',
          sendHeaders: true,
          headerParameters: { parameters: [{ name: 'x-api-key', value: vars.apiKey }] },
          sendBody: true,
          bodyParameters: {
            parameters: [
              { name: 'numero', value: `={{ $('Receber Mensagem').item.json.body.data.key.remoteJid.replace('@s.whatsapp.net','') }}` },
              { name: 'instanceName', value: vars.instanceName },
              { name: 'resposta', value: `={{ $('Receber Mensagem').item.json.body.data.message?.conversation ?? $('Receber Mensagem').item.json.body.data.message?.extendedTextMessage?.text ?? '' }}` },
            ],
          },
        },
      },
      {
        id: 'node-horario',
        name: 'Etapa: Horário',
        type: 'n8n-nodes-base.httpRequest',
        position: [1120, 300],
        typeVersion: 4.1,
        parameters: {
          method: 'POST',
          url: `${vars.apiBaseUrl}/api/whatsapp/fluxo/horario`,
          authentication: 'none',
          sendHeaders: true,
          headerParameters: { parameters: [{ name: 'x-api-key', value: vars.apiKey }] },
          sendBody: true,
          bodyParameters: {
            parameters: [
              { name: 'numero', value: `={{ $('Receber Mensagem').item.json.body.data.key.remoteJid.replace('@s.whatsapp.net','') }}` },
              { name: 'instanceName', value: vars.instanceName },
              { name: 'resposta', value: `={{ $('Receber Mensagem').item.json.body.data.message?.conversation ?? $('Receber Mensagem').item.json.body.data.message?.extendedTextMessage?.text ?? '' }}` },
            ],
          },
        },
      },
      {
        id: 'node-confirmar',
        name: 'Etapa: Confirmar',
        type: 'n8n-nodes-base.httpRequest',
        position: [1120, 400],
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
              { name: 'numero', value: `={{ $('Receber Mensagem').item.json.body.data.key.remoteJid.replace('@s.whatsapp.net','') }}` },
              { name: 'instanceName', value: vars.instanceName },
              { name: 'resposta', value: `={{ $('Receber Mensagem').item.json.body.data.message?.conversation ?? $('Receber Mensagem').item.json.body.data.message?.extendedTextMessage?.text ?? '' }}` },
            ],
          },
        },
      },
      {
        id: 'node-resposta',
        name: 'Responder 200',
        type: 'n8n-nodes-base.respondToWebhook',
        position: [1400, 300],
        typeVersion: 1.1,
        parameters: {
          respondWith: 'json',
          responseBody: '={ "ok": true }',
          options: { responseCode: 200 },
        },
      },
    ],
    connections: {
      'Receber Mensagem': { main: [[{ node: 'É mensagem válida?', type: 'main', index: 0 }]] },
      'É mensagem válida?': { main: [[{ node: 'Buscar Estado Conversa', type: 'main', index: 0 }], [{ node: 'Responder 200', type: 'main', index: 0 }]] },
      'Buscar Estado Conversa': { main: [[{ node: 'Qual a etapa?', type: 'main', index: 0 }]] },
      'Qual a etapa?': {
        main: [
          [{ node: 'Etapa: Especialidade', type: 'main', index: 0 }],
          [{ node: 'Etapa: Médico', type: 'main', index: 0 }],
          [{ node: 'Etapa: Horário', type: 'main', index: 0 }],
          [{ node: 'Etapa: Confirmar', type: 'main', index: 0 }],
          [{ node: 'Etapa: Início', type: 'main', index: 0 }],
        ],
      },
      'Etapa: Início': { main: [[{ node: 'Responder 200', type: 'main', index: 0 }]] },
      'Etapa: Especialidade': { main: [[{ node: 'Responder 200', type: 'main', index: 0 }]] },
      'Etapa: Médico': { main: [[{ node: 'Responder 200', type: 'main', index: 0 }]] },
      'Etapa: Horário': { main: [[{ node: 'Responder 200', type: 'main', index: 0 }]] },
      'Etapa: Confirmar': { main: [[{ node: 'Responder 200', type: 'main', index: 0 }]] },
    },
    settings: {
      executionOrder: 'v1',
      saveManualExecutions: true,
      callerPolicy: 'workflowsFromSameOwner',
    },
  };
}
