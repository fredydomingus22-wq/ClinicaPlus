# Reference — Especificações TDD: Módulo WhatsApp (~50 casos)

## Setup de mocks

```typescript
// apps/api/src/test/mocks/evolutionApi.mock.ts
import { vi } from 'vitest';

export const mockEvolutionApi = {
  criarInstancia:  vi.fn().mockResolvedValue({ instance: { instanceName: 'cp-test-abc', status: 'created' } }),
  obterQrCode:     vi.fn().mockResolvedValue({ base64: 'data:image/png;base64,iVBOR...', code: 'QR123' }),
  estadoConexao:   vi.fn().mockResolvedValue({ instance: { state: 'open' } }),
  enviarTexto:     vi.fn().mockResolvedValue({ key: { id: 'msg-test-1' }, status: 'PENDING' }),
  desligar:        vi.fn().mockResolvedValue(undefined),
  eliminar:        vi.fn().mockResolvedValue(undefined),
  actualizarWebhook: vi.fn().mockResolvedValue(undefined),
};
vi.mock('../../lib/evolutionApi', () => ({ evolutionApi: mockEvolutionApi }));

// apps/api/src/test/mocks/n8nApi.mock.ts
export const mockN8nApi = {
  criarWorkflow:  vi.fn().mockResolvedValue({ workflowId: 'wf-test-1', webhookPath: 'wa-marcacao-test' }),
  activar:        vi.fn().mockResolvedValue(undefined),
  desactivar:     vi.fn().mockResolvedValue(undefined),
  eliminar:       vi.fn().mockResolvedValue(undefined),
};
vi.mock('../../lib/n8nApi', () => ({ n8nApi: mockN8nApi }));
```

---

## wa-instancia.service.ts

```typescript
describe('waInstanciaService.criar', () => {
  it('deve criar instância na Evolution API com nome único', async () => {
    // Arrange: clínica com plano PRO, sem instância existente
    // Act: criar()
    // Assert: evolutionApi.criarInstancia chamado com nome começado por "cp-"
    // Assert: DB tem novo WaInstancia com estado AGUARDA_QR
  });

  it('deve incluir webhook URL correcta ao criar instância', async () => {
    // Assert: evolutionApi.criarInstancia chamado com webhookUrl incluindo /api/whatsapp/webhook
  });

  it('deve obter QR code e emitir via WebSocket após criar', async () => {
    // Assert: evolutionApi.obterQrCode chamado
    // Assert: publishEvent chamado com evento "whatsapp:qrcode"
  });

  it('deve falhar se clínica já tem instância', async () => {
    // Arrange: instância já existente na DB
    // Assert: lança AppError com código WA_INSTANCIA_EXISTS (409)
  });

  it('deve falhar se plano é BASICO', async () => {
    // Arrange: clinica.plano = 'BASICO'
    // Assert: lança AppError com código PLAN_UPGRADE_REQUIRED (402)
  });

  it('deve registar auditoria após criar instância', async () => {
    // Assert: auditLogService.log chamado com accao WA_INSTANCIA_CRIAR
  });
});

describe('waInstanciaService.processarQrCode', () => {
  it('deve actualizar qrCodeBase64 na DB', async () => {
    // Assert: prisma.waInstancia.update com qrCodeBase64 e qrExpiresAt
  });

  it('deve emitir evento whatsapp:qrcode via WebSocket', async () => {
    // Assert: publishEvent chamado com evento "whatsapp:qrcode"
  });
});

describe('waInstanciaService.processarConexao', () => {
  it('deve actualizar estado para CONECTADO quando state=open', async () => {
    // Assert: prisma.waInstancia.update com estado CONECTADO e numeroTelefone
  });

  it('deve limpar qrCodeBase64 quando conectado', async () => {
    // Assert: qrCodeBase64: null e qrExpiresAt: null no update
  });

  it('deve actualizar estado para DESCONECTADO quando state=close', async () => {
    // Assert: estado DESCONECTADO
  });

  it('deve emitir evento whatsapp:estado via WebSocket em qualquer mudança', async () => {
    // Assert: publishEvent chamado com evento "whatsapp:estado"
  });
});
```

---

## wa-automacao.service.ts

```typescript
describe('waAutomacaoService.activar', () => {
  it('deve criar workflow n8n com o template correcto por tipo', async () => {
    // Para MARCACAO_CONSULTA: n8nApi.criarWorkflow chamado com tipo correcto
    // Para LEMBRETE_24H: idem
  });

  it('deve guardar n8nWorkflowId e n8nWebhookPath no DB após criar', async () => {
    // Assert: prisma.waAutomacao.update com n8nWorkflowId = 'wf-test-1'
  });

  it('deve falhar se instância não está CONECTADA', async () => {
    // Arrange: instancia.estado = 'AGUARDA_QR'
    // Assert: lança AppError com código WA_INSTANCIA_DESCONECTADA (400)
  });

  it('deve gerar API key interna antes de criar workflow', async () => {
    // Assert: apiKeyService.getOrCreateInternal chamado antes de n8nApi.criarWorkflow
  });

  it('deve registar auditoria com accao WA_AUTOMACAO_ACTIVAR', async () => {
    // Assert: auditLogService.log chamado
  });

  it('deve activar cada um dos 5 tipos sem erro', async () => {
    // Testar MARCACAO, LEMBRETE_24H, LEMBRETE_2H, CONFIRMACAO, BOAS_VINDAS
    // Todos devem criar workflow com sucesso
  });
});

describe('waAutomacaoService.desactivar', () => {
  it('deve desactivar workflow no n8n', async () => {
    // Assert: n8nApi.desactivar chamado com workflowId correcto
  });

  it('deve marcar ativo=false no DB mesmo que n8n esteja em baixo', async () => {
    // Arrange: n8nApi.desactivar rejeita com erro de rede
    // Assert: prisma.waAutomacao.update com ativo: false AINDA executado
  });

  it('deve registar auditoria com accao WA_AUTOMACAO_DESACTIVAR', async () => {
    // Assert: auditLogService.log chamado
  });
});
```

---

## wa-conversa.service.ts

```typescript
describe('waConversaService.etapaInicio', () => {
  it('deve enviar lista de especialidades da clínica', async () => {
    // Arrange: clínica com médicos em 3 especialidades
    // Assert: evolutionApi.enviarTexto chamado com texto contendo todas as especialidades
  });

  it('deve criar conversa com etapa ESCOLHA_ESPECIALIDADE', async () => {
    // Assert: prisma.waConversa.upsert com etapaFluxo: 'ESCOLHA_ESPECIALIDADE'
  });

  it('deve incluir nome da clínica e nome do paciente na mensagem', async () => {
    // Assert: texto da mensagem contém nome da clínica e pushName
  });

  it('deve enviar mensagem de fora-de-horário quando fora do horário configurado', async () => {
    // Arrange: hora actual = 22:00, horarioFim = "18:00"
    // Assert: enviarTexto com texto de fora-de-horário, sem criar conversa em fluxo
  });

  it('deve resetar contexto ao reiniciar conversa expirada', async () => {
    // Arrange: conversa existente com estado EXPIRADA
    // Assert: upsert com contexto: {}
  });
});

describe('waConversaService.etapaEspecialidade', () => {
  it('deve avançar para ESCOLHA_MEDICO com input "1" válido', async () => {
    // Assert: etapaFluxo actualizado para ESCOLHA_MEDICO
  });

  it('deve listar médicos da especialidade escolhida', async () => {
    // Assert: enviarTexto com nomes dos médicos disponíveis
  });

  it('deve guardar especialidade e medicoIds no contexto', async () => {
    // Assert: contexto.especialidade = "Cardiologia" e contexto.medicosDisponiveis = [...]
  });

  it('deve repetir etapa com mensagem de erro em input inválido (1ª vez)', async () => {
    // Arrange: resposta = "99"
    // Assert: enviarTexto com "Opção inválida"
    // Assert: etapaFluxo mantém ESCOLHA_ESPECIALIDADE
    // Assert: contexto.errosEspecialidade = 1
  });

  it('deve terminar fluxo após 3 erros consecutivos', async () => {
    // Arrange: contexto.errosEspecialidade = 2 (vai para 3)
    // Assert: enviarTexto com "Não consegui perceber"
    // Assert: estado actualizado para CONCLUIDA
  });

  it('deve informar se não há médicos na especialidade', async () => {
    // Arrange: nenhum médico activo na especialidade escolhida
    // Assert: enviarTexto com "Não há médicos disponíveis"
  });
});

describe('waConversaService.etapaMedico', () => {
  it('deve listar próximos slots do médico escolhido', async () => {
    // Assert: enviarTexto com horários disponíveis
  });

  it('deve guardar medicoId e medicoNome no contexto', async () => {
    // Assert: contexto.medicoId e contexto.medicoNome guardados
  });

  it('deve voltar para ESCOLHA_MEDICO se médico não tem slots', async () => {
    // Arrange: agendamentosService.getSlotsDisponiveis retorna []
    // Assert: etapaFluxo volta para ESCOLHA_MEDICO
  });
});

describe('waConversaService.etapaConfirmar', () => {
  it('deve criar agendamento com canal=WHATSAPP quando confirma com "1"', async () => {
    // Assert: agendamentosService.create chamado com canal: 'WHATSAPP'
  });

  it('deve criar agendamento quando paciente responde "sim" (case insensitive)', async () => {
    // Arrange: resposta = "Sim"
    // Assert: agendamento criado
  });

  it('deve cancelar fluxo quando resposta é "2" ou "não"', async () => {
    // Assert: enviarTexto com "Marcação cancelada"
    // Assert: estado = CONCLUIDA, sem criar agendamento
  });

  it('deve criar paciente se número não está associado a nenhum paciente', async () => {
    // Arrange: nenhum Paciente com telefone = "+244923456789"
    // Assert: prisma.paciente.create chamado com origem: 'WHATSAPP'
  });

  it('deve reutilizar paciente existente se número já está registado', async () => {
    // Arrange: Paciente existente com telefone = "+244923456789"
    // Assert: prisma.paciente.create NÃO chamado
  });

  it('deve marcar conversa como CONCLUIDA após sucesso', async () => {
    // Assert: estado: 'CONCLUIDA', etapaFluxo: null
  });

  it('deve publicar evento WebSocket whatsapp:marcacao', async () => {
    // Assert: publishEvent chamado com evento 'whatsapp:marcacao' APÓS criar agendamento
  });

  it('deve enviar mensagem de confirmação com data/hora formatada em pt-AO', async () => {
    // Assert: texto contém data como "Segunda, 14 de Abril às 14:00"
  });
});

describe('waConversaService — comandos especiais', () => {
  it('deve reiniciar fluxo quando paciente escreve "marcar" em qualquer etapa', async () => {
    // Arrange: conversa em ESCOLHA_MEDICO
    // Act: enviar mensagem "marcar"
    // Assert: etapaFluxo volta para ESCOLHA_ESPECIALIDADE
  });

  it('deve reiniciar fluxo quando paciente escreve "oi"', async () => {
    // Idem
  });
});
```

---

## wa-webhook.service.ts

```typescript
describe('verificarHmacEvolution (middleware)', () => {
  it('deve rejeitar request sem header x-evolution-signature (401)', async () => {
    // Assert: lança AppError WEBHOOK_NO_SIGNATURE
  });

  it('deve rejeitar request com assinatura HMAC inválida (401)', async () => {
    // Arrange: assinatura gerada com secret errado
    // Assert: lança AppError WEBHOOK_INVALID_SIGNATURE
  });

  it('deve passar para next() com assinatura HMAC válida', async () => {
    // Arrange: assinatura correcta com config.EVOLUTION_WEBHOOK_SECRET
    // Assert: next() chamado sem erro
  });
});

describe('waWebhookService.processar', () => {
  it('deve ignorar mensagens enviadas pelo próprio bot (fromMe=true)', async () => {
    // Arrange: payload com data.key.fromMe = true
    // Assert: evolutionApi.enviarTexto NÃO chamado
  });

  it('deve ignorar mensagens de grupos (@g.us)', async () => {
    // Arrange: remoteJid termina em "@g.us"
    // Assert: processamento ignorado
  });

  it('deve actualizar QR code na DB ao receber QRCODE_UPDATED', async () => {
    // Assert: waInstanciaService.processarQrCode chamado com base64
  });

  it('deve actualizar estado para CONECTADO ao receber CONNECTION_UPDATE state=open', async () => {
    // Assert: waInstanciaService.processarConexao chamado com 'open'
  });

  it('deve actualizar estado para DESCONECTADO ao receber CONNECTION_UPDATE state=close', async () => {
    // Assert: processarConexao chamado com 'close'
  });

  it('deve registar mensagem de entrada no histórico WaMensagem', async () => {
    // Assert: prisma.waMensagem.create chamado com direcao: 'ENTRADA'
  });

  it('não deve falhar para eventos desconhecidos (log e ignorar)', async () => {
    // Arrange: payload com event: 'UNKNOWN_EVENT'
    // Assert: sem throw, retorna normalmente
  });
});
```

---

## Rotas — integration tests (supertest)

```typescript
describe('POST /api/whatsapp/instancias', () => {
  it('deve criar instância e retornar 201 com qrCode para ADMIN PRO', async () => {
    // Assert: status 201
    // Assert: body.data.qrCode não é null
  });

  it('deve retornar 402 para clínica BASICO', async () => {
    // Assert: status 402, código PLAN_UPGRADE_REQUIRED
  });

  it('deve retornar 401 sem JWT', async () => {
    // Assert: status 401
  });

  it('deve retornar 409 se clínica já tem instância', async () => {
    // Assert: status 409, código WA_INSTANCIA_EXISTS
  });
});

describe('POST /api/whatsapp/automacoes/:id/activar', () => {
  it('deve retornar 200 e activar automação', async () => {
    // Assert: status 200, automação.ativo = true na DB
  });

  it('deve retornar 400 se instância não está CONECTADA', async () => {
    // Assert: status 400, código WA_INSTANCIA_DESCONECTADA
  });

  it('deve retornar 403 para role MEDICO', async () => {
    // Assert: status 403
  });
});

describe('POST /api/whatsapp/webhook', () => {
  it('deve retornar 200 para webhook com HMAC válido', async () => {
    // Assert: status 200
  });

  it('deve retornar 401 para webhook sem assinatura', async () => {
    // Assert: status 401
  });

  it('deve retornar 200 para eventos desconhecidos (não crashar)', async () => {
    // Assert: status 200, sem erro
  });
});

describe('POST /api/whatsapp/fluxo/inicio', () => {
  it('deve retornar 200 com API key válida', async () => {
    // Assert: status 200
  });

  it('deve retornar 401 com token JWT (não aceita JWT neste endpoint)', async () => {
    // Assert: status 401
  });

  it('deve retornar 401 com API key inválida', async () => {
    // Assert: status 401
  });
});
```

---

## Component tests — WhatsappPage.tsx

```typescript
describe('WhatsappPage', () => {
  it('deve mostrar QR code quando estado=AGUARDA_QR', async () => {
    // Assert: elemento <img> com src contendo "base64" visível
  });

  it('deve mostrar badge "Conectado" em verde quando estado=CONECTADO', async () => {
    // Assert: texto "Conectado" com cor verde e número de telefone
  });

  it('deve mostrar 5 cards de automação (um por tipo)', async () => {
    // Assert: 5 WaAutomacaoCard rendererizados
  });

  it('deve mostrar campos de configuração ao activar toggle', async () => {
    // Act: clicar toggle de MARCACAO_CONSULTA
    // Assert: campos horarioInicio e horarioFim visíveis
  });

  it('deve actualizar QR code em tempo real via WebSocket', async () => {
    // Act: emitir evento "whatsapp:qrcode" via socket mock
    // Assert: img src actualizado sem refresh
  });

  it('deve actualizar para Conectado em tempo real via WebSocket', async () => {
    // Act: emitir evento "whatsapp:estado" com estado: CONECTADO
    // Assert: badge muda para verde
  });

  it('deve desactivar toggles se instância não está CONECTADA', async () => {
    // Arrange: estado = AGUARDA_QR
    // Assert: toggles de automação disabled
  });
});
```
