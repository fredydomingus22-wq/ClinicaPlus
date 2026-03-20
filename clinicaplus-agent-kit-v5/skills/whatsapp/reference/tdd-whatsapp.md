# Reference — TDD: Especificação de Testes por Service WhatsApp

## wa-instancia.service.ts

```typescript
describe('waInstanciaService.criar', () => {
  it('deve criar instância na Evolution API com nome gerado', ...)
  it('deve persistir instância no DB com estado AGUARDA_QR', ...)
  it('deve falhar se clínica já tem instância activa', ...)
  it('deve falhar se plano não é PRO ou ENTERPRISE', ...)
  it('deve configurar webhook URL correcta na Evolution API', ...)
});

describe('waInstanciaService.processarQrCode', () => {
  it('deve guardar qrCodeBase64 no DB quando recebe QRCODE_UPDATED', ...)
  it('deve publicar evento whatsapp:qrcode via WebSocket', ...)
});

describe('waInstanciaService.processarConexao', () => {
  it('deve actualizar estado para CONECTADO quando state=open', ...)
  it('deve actualizar estado para DESCONECTADO quando state=close', ...)
  it('deve limpar qrCodeBase64 quando CONECTADO', ...)
  it('deve publicar evento whatsapp:estado via WebSocket', ...)
});
```

## wa-automacao.service.ts

```typescript
describe('waAutomacaoService.activar', () => {
  it('deve criar workflow n8n com template correcto por tipo', ...)
  it('deve guardar n8nWorkflowId e n8nWebhookPath no DB', ...)
  it('deve falhar se instância não está CONECTADA', ...)
  it('deve gerar/reutilizar API key interna para o n8n', ...)
  it('deve registar auditoria de activação', ...)
  it('deve activar cada um dos 5 tipos de automação sem erro', ...)
});

describe('waAutomacaoService.desactivar', () => {
  it('deve desactivar workflow no n8n', ...)
  it('deve marcar automacao.ativo=false mesmo se n8n estiver em baixo', ...)
  it('deve registar auditoria de desactivação', ...)
});
```

## wa-conversa.service.ts — fluxo de marcação

```typescript
describe('waConversaService.etapaInicio', () => {
  it('deve enviar lista de especialidades da clínica', ...)
  it('deve criar conversa com etapa ESCOLHA_ESPECIALIDADE', ...)
  it('deve resetar contexto ao reiniciar conversa expirada', ...)
  it('deve incluir nome da clínica na saudação', ...)
});

describe('waConversaService.etapaEspecialidade', () => {
  it('deve avançar para ESCOLHA_MEDICO com input válido', ...)
  it('deve guardar especialidade no contexto da conversa', ...)
  it('deve repetir etapa com mensagem de erro em input inválido', ...)
  it('deve repetir etapa com mensagem de erro em número fora do range', ...)
  it('deve terminar fluxo após 3 erros consecutivos', ...)
});

describe('waConversaService.etapaMedico', () => {
  it('deve listar médicos da especialidade escolhida', ...)
  it('deve avançar para ESCOLHA_HORARIO com input válido', ...)
  it('deve guardar medicoId e medicoNome no contexto', ...)
  it('deve lidar com só 1 médico disponível (não pedir escolha)', ...)
});

describe('waConversaService.etapaHorario', () => {
  it('deve listar próximos 5 slots disponíveis', ...)
  it('deve avançar para AGUARDA_CONFIRMACAO com input válido', ...)
  it('deve mostrar data e hora formatada em pt-AO', ...)
  it('deve lidar com sem slots disponíveis (informar e terminar)', ...)
});

describe('waConversaService.etapaConfirmar', () => {
  it('deve criar agendamento quando resposta é "1" ou "sim"', ...)
  it('deve criar agendamento quando resposta é "S" (case insensitive)', ...)
  it('deve cancelar fluxo quando resposta é "2" ou "não"', ...)
  it('deve criar paciente se número não está associado a paciente', ...)
  it('deve marcar conversa como CONCLUIDA após confirmação', ...)
  it('deve marcar conversa como CONCLUIDA após cancelamento', ...)
  it('deve enviar mensagem de confirmação com data/hora formatada', ...)
  it('deve criar agendamento com campo canal="WHATSAPP"', ...)
  it('deve publicar evento WebSocket para admin ver em tempo real', ...)
});
```

## wa-webhook.service.ts

```typescript
describe('waWebhookService.processar', () => {
  it('deve ignorar mensagens enviadas pelo próprio bot (fromMe=true)', ...)
  it('deve ignorar mensagens de grupos (@g.us)', ...)
  it('deve processar QRCODE_UPDATED actualizando DB e WebSocket', ...)
  it('deve processar CONNECTION_UPDATE para estado open→CONECTADO', ...)
  it('deve processar CONNECTION_UPDATE para estado close→DESCONECTADO', ...)
  it('deve registar mensagem recebida no histórico WaMensagem', ...)
  it('deve rejeitar payload sem assinatura HMAC', ...)
  it('deve rejeitar payload com assinatura HMAC inválida', ...)
});
```

## Rotas — integration tests (supertest)

```typescript
describe('POST /api/whatsapp/instancias', () => {
  it('deve retornar 201 com qrCode para ADMIN autenticado com plano PRO', ...)
  it('deve retornar 402 para clínica com plano BASICO', ...)
  it('deve retornar 401 sem token JWT', ...)
  it('deve retornar 409 se clínica já tem instância', ...)
});

describe('POST /api/whatsapp/automacoes/:id/activar', () => {
  it('deve retornar 200 e activar automação', ...)
  it('deve retornar 400 se instância não está CONECTADA', ...)
  it('deve retornar 403 para role MEDICO', ...)
});

describe('POST /api/whatsapp/webhook', () => {
  it('deve retornar 200 para webhook válido com HMAC correcto', ...)
  it('deve retornar 401 para webhook sem assinatura HMAC', ...)
  it('deve retornar 200 mesmo para eventos desconhecidos (não crashar)', ...)
});

describe('POST /api/whatsapp/fluxo/inicio', () => {
  it('deve retornar 200 com API key válida', ...)
  it('deve retornar 401 com API key inválida', ...)
  it('deve retornar 401 com JWT (não aceita JWT neste endpoint)', ...)
});
```

## WhatsappPage.tsx — component tests

```typescript
describe('WhatsappPage', () => {
  it('deve mostrar QR code quando estado=AGUARDA_QR', ...)
  it('deve mostrar badge verde CONECTADO quando estado=CONECTADO', ...)
  it('deve mostrar toggles para os 5 tipos de automação', ...)
  it('deve mostrar campos de config ao activar automação', ...)
  it('deve actualizar estado QR em tempo real via WebSocket', ...)
  it('deve actualizar estado CONECTADO sem refresh', ...)
  it('deve mostrar actividade recente ao vivo', ...)
});
```
