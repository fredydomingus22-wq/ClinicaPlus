# Runbook — Módulo de Faturação Fiscal

## Diagnóstico rápido

| Sintoma | Causa provável | Secção |
|---------|---------------|--------|
| `POST /faturas/:id/emitir` retorna 400 | Fatura sem itens ou dados fiscais da clínica incompletos | 1 |
| Fatura emitida com `fiscalHash = null` | Chave RSA não configurada ou `AGT_PRIVATE_KEY` em falta | 2 |
| Hash chain quebrada — SAF-T export reporta erro | Documento eliminado manualmente da BD ou hash corrompida | 3 |
| Numeração com lacunas (FT CPLS/5 → FT CPLS/7) | Race condition na sequência ou documento eliminado | 4 |
| NC não vinculada à fatura original | Campo `faturaOriginalId` não enviado no body | 5 |
| SAF-T export XML inválido | Campo obrigatório em falta (NIF, razaoSocial, enderecoPostal) | 6 |
| Envio AGT retorna 401/403 | Token AGT ou certificação do software expirada | 7 |
| Envio AGT retorna 500 e `statusEnvio = ERRO` | API AGT indisponível — worker retentará automaticamente | 8 |

---

## 1. Emissão falha com 400

```bash
# A emissão requer:
# 1. Fatura em estado RASCUNHO
# 2. Pelo menos 1 ItemFatura associado
# 3. Clinica com nif, razaoSocial, enderecoPostal preenchidos
# 4. Paciente com nome preenchido

# Verificar dados fiscais da clínica:
pnpm db:studio
# Tabela clinica → campos: nif, razaoSocial, enderecoPostal, regimeFiscal

# Verificar se a fatura existe e tem itens:
# Tabela faturas → localizar pelo ID → contar itens_fatura

# Se a clínica não tem dados fiscais:
# O ADMIN deve ir a Definições > Dados Fiscais e preencher o formulário.
# NIF: 9 dígitos, obrigatório
# Razão Social: nome legal completo
# Endereço Postal: endereço fiscal completo
```

---

## 2. Hash não gerada na emissão

```bash
# Verificar se a variável AGT_PRIVATE_KEY existe no .env:
# apps/api/.env deve conter:
AGT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."
AGT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n..."

# Em modo desenvolvimento, se as chaves não existem:
# O sistema usa um par de teste gerado pelo seed.
# Em produção, as chaves DEVEM ser as submetidas à AGT.

# Gerar par de teste (development):
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem

# Converter para formato .env (linha única com \n):
cat private.pem | tr '\n' '\\' | sed 's/\\/\\n/g'
# Colar resultado em AGT_PRIVATE_KEY

# Verificar que o CertificationService carrega as chaves:
# Nos logs da API, procurar:
# "[CertificationService] Chaves RSA carregadas com sucesso"
# Se aparecer "AVISO: A operar sem assinatura fiscal":
# As variáveis de ambiente estão em falta.
```

---

## 3. Hash chain quebrada

```bash
# A integridade do hash chain é verificada pelo SAF-T export e por
# um endpoint de auditoria: GET /api/clinica/fiscal/audit/hash-chain

# Para diagnosticar:
# 1. Verificar se documentos foram eliminados manualmente:
SELECT numero_fatura, fiscal_hash, data_emissao
FROM faturas
WHERE clinica_id = 'ID' AND estado != 'RASCUNHO'
ORDER BY data_emissao ASC;

# 2. Verificar hash chain manualmente:
# O hash de cada documento é:
# RSA.sign(dataEmissao + ";" + dataDocumento + ";" + numero + ";" + total + ";" + hashAnterior)
# Se o primeiro documento não tem hashAnterior, usa string vazia.

# 3. Se a chain foi corrompida:
# NÃO TENTAR CORRIGIR MANUALMENTE  — isto é fraude fiscal.
# Documentar o incidente e reportar ao suporte AGT.
# O campo hashControl pode ser incrementado para indicar novo algoritmo.

# 4. Prevenir futuras corrupções:
# O middleware Prisma DEVE bloquear DELETE em faturas com estado != RASCUNHO.
# Nunca executar DELETE FROM faturas em produção.
```

---

## 4. Lacunas na numeração sequencial

```bash
# A numeração é gerida pela tabela sequencia_doc_fiscal
# com SELECT FOR UPDATE para prevenir race conditions.

# Verificar sequência actual:
SELECT * FROM sequencia_doc_fiscal
WHERE clinica_id = 'ID' AND tipo_doc = 'FT' AND ano_fiscal = 2026;

# Comparar com o último documento emitido:
SELECT numero_fatura, data_emissao FROM faturas
WHERE clinica_id = 'ID' AND tipo_doc_fiscal = 'FT' AND estado != 'RASCUNHO'
ORDER BY data_emissao DESC LIMIT 5;

# Se existem lacunas:
# Causas comuns:
# 1. Transação de emissão falhou DEPOIS de incrementar o sequencial
#    → Fix: usar transação Prisma que inclui seq + emissão no mesmo tx
# 2. Documento eliminado manualmente
#    → Criar NC de valor zero com justificativa documental
# 3. Bug de concorrência
#    → Verificar que o service usa $transaction com isolationLevel Serializable
```

---

## 5. Nota de Crédito sem vínculo

```bash
# A NC (Nota de Crédito) OBRIGATORIAMENTE referencia uma FT/FR original.
# O endpoint POST /api/clinica/faturas/:id/nota-credito cria uma NC que:
# 1. Duplica os itens da fatura original com valores negativos
# 2. Vincula via campo faturaOriginalId
# 3. Altera estado da fatura original para ANULADA

# Verificar vínculo:
# No model Fatura, campo faturaOriginalId deve apontar para a FT anulada
# E a FT deve ter estado = ANULADA

# Erro comum no frontend:
# Não enviar faturaOriginalId no body da criação da NC
# → O endpoint deve retornar 400 com mensagem clara em pt-AO
```

---

## 6. SAF-T export inválido

```bash
# O export SAF-T gera XML que deve passar validação XSD.
# Campos obrigatórios frequentemente em falta:

# Da Clinica (emitente):
# - nif (TaxRegistrationNumber) — 9 dígitos
# - razaoSocial (CompanyName) — nome legal
# - enderecoPostal (AddressDetail) — logradouro completo
# - cidade (City)
# - provincia (Region) → Mapeada para código de província angolana

# Do Paciente (cliente):
# - nome (CompanyName/CustomerName)
# - NIF do paciente (se particular: "999999990")

# Testar export:
curl -X GET "http://localhost:3001/api/clinica/fiscal/saft?ano=2026&mes=5" \
  -H "Authorization: Bearer TOKEN" \
  -o saft-test.xml

# Validar contra XSD (se disponível):
xmllint --schema saft-ao.xsd saft-test.xml --noout

# Se o endpoint retorna 500:
# Verificar logs por campos NULL em faturas emitidas.
# Causa comum: fatura emitida antes de dados fiscais preenchidos.
```

---

## 7. Autenticação AGT falha (401/403)

```bash
# Verificar credenciais no .env:
# AGT_API_URL=https://efatura.minfin.gov.ao/api/v1  (URL de produção)
# AGT_API_URL=https://efatura-staging.minfin.gov.ao/api/v1  (staging)
# AGT_SOFTWARE_ID=<ID do software certificado>
# AGT_API_TOKEN=<Token JWT ou API Key fornecida pela AGT>

# Se 401: Token expirado ou inválido → Regenerar no portal AGT
# Se 403: Software não certificado ou certificação expirada → Contactar AGT

# Em desenvolvimento, simular sem AGT real:
# NODE_ENV=development → O AgtApiClient opera em mode mock (log only)
# Verificar flag: AGT_MOCK=true (desativa envio real)
```

---

## 8. Testar o módulo completo (ambiente de desenvolvimento)

```bash
# 1. Garantir que a API está a correr:
pnpm dev --filter=api

# 2. Preencher dados fiscais da clínica:
curl -X PATCH http://localhost:3001/api/clinica/definicoes/fiscal \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nif": "123456789",
    "razaoSocial": "Clínica Saúde Plus Lda",
    "enderecoPostal": "Rua Major Kanhangulo, 200, Ingombota",
    "cidade": "Luanda",
    "provincia": "Luanda",
    "regimeFiscal": "GERAL"
  }'

# 3. Criar fatura rascunho:
curl -X POST http://localhost:3001/api/clinica/faturas \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pacienteId": "ID",
    "itens": [
      { "descricao": "Consulta Geral", "quantidade": 1, "precoUnit": 15000, "taxaIva": 14 }
    ]
  }'

# 4. Emitir fatura (assinar + numerar):
curl -X POST http://localhost:3001/api/clinica/faturas/FATURA_ID/emitir \
  -H "Authorization: Bearer TOKEN"
# Deve retornar fatura com: estado=EMITIDA, fiscalHash preenchido, numeroFatura sequencial

# 5. Registar pagamento:
curl -X POST http://localhost:3001/api/clinica/faturas/FATURA_ID/pagamentos \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"metodo": "DINHEIRO", "valor": 17100}'

# 6. Anular via NC:
curl -X POST http://localhost:3001/api/clinica/faturas/FATURA_ID/nota-credito \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"motivo": "Serviço não prestado"}'

# 7. Exportar SAF-T:
curl -X GET "http://localhost:3001/api/clinica/fiscal/saft?ano=2026&mes=5" \
  -H "Authorization: Bearer TOKEN" -o saft-maio.xml

# 8. Verificar integridade do hash chain:
curl -X GET http://localhost:3001/api/clinica/fiscal/audit/hash-chain \
  -H "Authorization: Bearer TOKEN"
# Deve retornar: { valida: true, totalDocumentos: N, ultimoHash: "..." }
```
