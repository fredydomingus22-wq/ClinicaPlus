# Runbook — Tratamentos e Exames Clínicos

## Diagnóstico rápido

| Sintoma | Causa provável | Secção |
|---------|---------------|--------|
| POST /planos retorna 200 mas sessões não aparecem | Worker não está a correr ou job falhou | 1 |
| Sessões criadas mas sem agendamento na HojePage | Worker não criou o `Agendamento` vinculado | 2 |
| Upload de laudo falha com 403 | Signed URL expirou ou bucket privado mal configurado | 3 |
| `POST /exames/:id/laudo-upload-url` retorna 500 | Variável SUPABASE_SERVICE_KEY não definida no worker | 3 |
| Transição de estado retorna 400 inesperado | Máquina de estados — verificar estado actual vs. destino | 4 |
| Histórico clínico demora > 2s | Query sem índice ou N+1 | 5 |
| Sessões duplicadas no calendário | Job enfileirado mais de uma vez — `jobId` não idempotente | 6 |
| Plano com 0 sessões após criação | Worker falhou nas 3 tentativas — verificar logs | 7 |

---

## 1. Sessões não aparecem após criar plano

```bash
# Ver jobs na fila BullMQ
# No worker (apps/worker), inspeccionar a fila 'criar-sessoes-plano'

# Via BullMQ board (se configurado):
# http://localhost:3001/admin/queues

# Verificar logs do worker:
pnpm dev --filter=worker
# Procurar por: "[criar-sessoes-plano] Erro" ou "failed"

# Verificar se o job foi criado:
# No código de teste ou prisma studio, verificar que plano.id existe
# e que o job com jobId `sessoes-${plano.id}` foi adicionado à fila

# Solução rápida — re-enqueue manualmente (apenas em desenvolvimento):
# Via console na API:
await criarSessoesQueue.add('criar-sessoes-plano', dadosDoJob, {
  jobId: `sessoes-${planoId}-retry`,  // novo jobId para forçar
})
```

---

## 2. Agendamento não aparece na HojePage

```bash
# Verificar que o worker criou o registo Agendamento vinculado à SessaoTratamento
# Prisma Studio:
pnpm db:studio

# Na tabela sessao_tratamento: verificar que agendamentoId NÃO é NULL
# Na tabela agendamento: verificar que tipo = 'TRATAMENTO' e estado = 'CONFIRMADO'

# Se agendamentoId é NULL:
# O worker falhou na criação do agendamento.
# Verificar se o campo 'originadoPor' existe no model Agendamento.
# Se não existir, adicionar migração:
# originadoPor String? — ex: "plano:clkxxx..."

# Fix temporário — criar agendamentos manualmente para as sessões sem vínculo:
# Query para identificar:
SELECT s.id, s.dataHora, s.planoId
FROM sessao_tratamento s
WHERE s.agendamentoId IS NULL
  AND s.clinicaId = 'CLINICA_ID'
  AND s.estado = 'AGENDADO'
```

---

## 3. Upload de laudo falha

```bash
# Verificar configuração do bucket Supabase:
# Dashboard Supabase → Storage → Buckets → laudos
# Deve estar como: PRIVADO (não público)
# RLS policies devem permitir service_role fazer upload

# Erro 403 ao fazer upload com signed URL:
# 1. Signed URL expirou (validade padrão: 1h)
#    → Pedir nova URL ao endpoint /laudo-upload-url
# 2. MIME type não corresponde ao que foi enviado ao criar URL
#    → Verificar que o frontend usa o mesmo Content-Type

# Variável não definida (erro 500 no endpoint):
# apps/api/.env deve ter:
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...  # chave service_role, NÃO a anon key

# Testar o upload manualmente:
curl -X PUT "SIGNED_URL" \
  -H "Content-Type: application/pdf" \
  --data-binary "@/caminho/para/laudo-teste.pdf"
# Resposta esperada: 200 OK

# Verificar que o ficheiro aparece no dashboard do Supabase Storage
# depois de confirmar via /laudo-confirmar
```

---

## 4. Transição de estado retorna 400

```bash
# A máquina de estados para ExameSolicitado é:
# PENDENTE → AGENDADO, CANCELADO
# AGENDADO → REALIZADO, CANCELADO
# REALIZADO → LAUDADO
# LAUDADO → (sem transições — estado final)
# CANCELADO → (sem transições — estado final)

# A máquina de estados para PlanoTratamento é:
# ACTIVO → SUSPENSO, CONCLUIDO, CANCELADO
# SUSPENSO → ACTIVO, CANCELADO
# CONCLUIDO → (estado final)
# CANCELADO → (estado final)

# A máquina de estados para SessaoTratamento é:
# AGENDADO → REALIZADO, FALTOU, CANCELADO
# REALIZADO → (estado final)
# FALTOU → AGENDADO (pode ser re-agendado)
# CANCELADO → (estado final)

# Para verificar o estado actual antes de tentar transição:
# GET /api/clinica/exames/:id → campo 'estado'

# Erro frequente: tentar pôr exame LAUDADO sem passar por REALIZADO
# O frontend deve validar a máquina de estados antes de mostrar opções
```

---

## 5. Histórico clínico lento

```bash
# O endpoint GET /pacientes/:id/historico-clinico usa Promise.all
# mas pode ser lento se os índices não estiverem a funcionar

# Verificar índices na migração:
# @@index([clinicaId, pacienteId]) em todos os models
# @@index([clinicaId, criadoEm])
# @@index([clinicaId, dataInicio])

# Se índices existem mas ainda lento:
# Verificar no Supabase → Database → Query Performance
# Procurar queries com "Seq Scan" em vez de "Index Scan"

# Adicionar EXPLAIN a uma query de diagnóstico (Supabase SQL editor):
EXPLAIN ANALYZE
SELECT * FROM exame_solicitado
WHERE clinica_id = 'ID_CLINICA'
  AND paciente_id = 'ID_PACIENTE'
ORDER BY criado_em DESC
LIMIT 100;

# Limite de dados:
# O endpoint limita a 50 consultas e 100 exames por padrão
# Se o paciente tem histórico muito extenso, considerar paginação por sprint futuro
```

---

## 6. Sessões duplicadas no calendário

```bash
# Causa: o job foi adicionado à fila mais de uma vez sem jobId idempotente
# O BullMQ ignora jobs com jobId já existente na fila — desde que o jobId seja consistente

# Verificar no código de planos.service.ts:
# jobId DEVE ser: `sessoes-${plano.id}` — baseado no ID do plano
# Se for diferente (ex: com timestamp), jobs duplicados são criados

# Limpeza de agendamentos duplicados:
# 1. Identificar planoId com duplicados:
SELECT planoId, COUNT(*) as total
FROM sessao_tratamento
WHERE clinicaId = 'CLINICA_ID'
GROUP BY planoId
HAVING COUNT(*) > totalSessoes  -- valor esperado do plano

# 2. Para cada planoId duplicado, manter apenas os primeiros N registos
# (operação manual — fazer backup antes)

# 3. Cancelar agendamentos duplicados via Prisma Studio
```

---

## 7. Plano criado mas com 0 sessões após 5 minutos

```bash
# Worker falhou nas 3 tentativas. Verificar causa:

# Em desenvolvimento:
pnpm dev --filter=worker
# Procurar linhas com [FAILED] ou [ERROR]

# Em produção (Railway):
# Dashboard Railway → worker service → Logs
# Filtrar por: "criar-sessoes-plano"

# Causas comuns de falha do worker:
# 1. DATABASE_URL incorrecta no apps/worker/.env
# 2. REDIS_URL diferente entre API e worker (jobs não chegam)
# 3. Modelo Agendamento não tem campo 'originadoPor' (migração pendente)
# 4. pacienteId inválido passado no payload do job

# Solução se worker recuperável:
# 1. Corrigir a causa raiz
# 2. Re-adicionar o job manualmente com novo jobId
# 3. Verificar que sessões foram criadas após second run

# Solução de emergência — criar sessões directamente (sem worker):
# Usar pnpm db:studio → criar registos na tabela sessao_tratamento
# Depois criar agendamentos correspondentes
# ATENÇÃO: manter coerência plano.totalSessoes == COUNT(sessao_tratamento WHERE planoId=X)
```

---

## 8. Testar o módulo completo (ambiente de desenvolvimento)

```bash
# 1. Garantir que a API e o worker estão a correr
pnpm dev --filter=api
pnpm dev --filter=worker

# 2. Criar exame via curl:
curl -X POST http://localhost:3001/api/clinica/exames \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pacienteId":"ID","medicoId":"ID","tipo":"Hemograma Completo"}'

# 3. Criar plano com 6 sessões (2×/semana, 3 semanas):
curl -X POST http://localhost:3001/api/clinica/planos \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pacienteId":"ID","medicoId":"ID",
    "tipo":"Fisioterapia","totalSessoes":6,
    "frequenciaSemana":2,"dataInicio":"2026-04-10",
    "duracaoSessaoMin":45
  }'

# 4. Verificar após 3-5s que as sessões foram criadas:
curl http://localhost:3001/api/clinica/planos/PLANO_ID/sessoes \
  -H "Authorization: Bearer TOKEN"
# Deve retornar array com 6 sessões

# 5. Verificar histórico clínico:
curl http://localhost:3001/api/clinica/pacientes/PACIENTE_ID/historico-clinico \
  -H "Authorization: Bearer TOKEN"
# Deve retornar { consultas: [...], exames: [{...}], planos: [{...}] }
```
