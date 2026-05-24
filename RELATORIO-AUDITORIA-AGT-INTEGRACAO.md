# Relatório de Auditoria — Integração AGT (Facturação Electrónica)

Data: 2026-05-24  
Projecto: ClinicaPlus  
Escopo: Integração com API AGT e-Factura (séries, registo de documentos, polling assíncrono, assinaturas RSA/JWS, contingência, QR e tratamento de erros)

---

## 1) Resumo Executivo

### Estado geral
A integração está **bem estruturada** (camadas `utils` → `api` → `worker`, payload builders, polling com backoff, testes de contingência), mas há **inconsistências críticas** que podem fazer com que:

1) a API use **homologação** mesmo em produção;  
2) assinaturas e chaves de tenant falhem (especialmente no **worker**);  
3) o payload enviado à AGT tenha **mapeamentos errados** (ex.: `companyName`).

### Principais riscos (prioridade)
| Severidade | Tema | Impacto |
|---|---|---|
| **CRÍTICO** | Selecção de ambiente/baseURL no `AgtApiClient` | Produção pode apontar para HML; endpoints inconsistentes podem falhar |
| **CRÍTICO** | Worker não desencripta chaves guardadas na BD | Assinaturas inválidas → rejeição AGT / erros E9x |
| **CRÍTICO** | Payload `companyName` usa nome do cliente (provável) | Documento pode ser rejeitado / dados incorretos na AGT |
| **ALTO** | Assinatura (`jwsDocumentSignature`) usa tipos diferentes (número vs string) | Validação da assinatura pode falhar |
| **ALTO** | Arredondamento de IVA usa `Math.round` (não “por excesso”) | Totais/IVA podem divergir do esperado → erros de validação |

---

## 2) Mapa da Implementação (onde está o quê)

### Core (shared utils)
- Cliente HTTP AGT: `packages/utils/src/fiscal/AgtApiClient.ts`
- Assinaturas RSA/JWS: `packages/utils/src/fiscal/CertificationService.ts`
- Builders payload:
  - `packages/utils/src/fiscal/buildAgtRegistarFacturaPayload.ts`
  - `packages/utils/src/fiscal/buildAgtObterEstadoPayload.ts`
- Polling: `packages/utils/src/fiscal/pollAgtSubmissionStatus.ts`
- Tipos e erro: `packages/utils/src/fiscal/types.ts`

### API (Express)
- Cliente AGT (wrapper): `apps/api/src/services/fiscal/AgtApiClient.ts`
- Controlador endpoints fiscais: `apps/api/src/controllers/fiscal/FiscalController.ts`
- Envio a AGT: `apps/api/src/services/faturas.service.ts` (função `submeterParaAgt`)
- Contingência (drain + solicitar série C): `apps/api/src/services/fiscal/ContingencySyncService.ts`

### Worker (BullMQ)
- Job reporte AGT: `apps/worker/src/workers/report-agt.worker.ts`

### Documentação interna
- Runbook: `kit-faturacao/docs/10-runbooks/RUNBOOK-faturacao.md`

---

## 3) Achados por Área (com evidências)

### A) Ambiente / BaseURL / Endpoints

#### A1) **CRÍTICO** — Detecção de ambiente “sandbox vs produção” está errada no `AgtApiClient` (base)
**Evidência**
- `packages/utils/src/fiscal/AgtApiClient.ts:32-38`  
  ```ts
  const isSandbox = baseURL.includes('sandbox') || baseURL.includes('hml') || !baseURL.includes('sifp.minfin.gov.ao');
  const officialBaseURL = isSandbox ? 'https://sifphml.minfin.gov.ao/sigt/fe/v1' : 'https://sifp.minfin.gov.ao/sigt/fe/v1';
  ```
- `apps/api/src/services/fiscal/AgtApiClient.ts:10-13` passa `baseUrl = 'production'` quando em produção:
  ```ts
  const baseUrl = isSandbox ? 'sandbox' : 'production';
  super(baseUrl, logger, isMock);
  ```
Como `baseURL = "production"` **não contém** `sifp.minfin.gov.ao`, a condição `!baseURL.includes('sifp.minfin.gov.ao')` torna `isSandbox = true` → usa **HML**.

**Impacto**
- Em produção, pode estar a chamar **homologação** sem querer.

**Recomendação**
- Alterar a lógica para aceitar:
  - um enum (`'sandbox' | 'production'`) **ou**
  - uma URL completa.
- Exemplo de regra segura:
  - `isSandbox = baseURL === 'sandbox' || baseURL.includes('sifphml') || baseURL.includes('/hml') || process.env.AGT_SANDBOX==='true'`
  - `isSandbox = false` quando `baseURL === 'production'` ou `baseURL.includes('sifp.minfin.gov.ao')`.

---

#### A2) **ALTO** — Inconsistência de paths (`/v1` vs `/ws/v1`) no sandbox
**Evidência**
- Runbook indica sandbox: `.../sigt/fe/ws/v1`  
  `kit-faturacao/docs/10-runbooks/RUNBOOK-faturacao.md:188-193`
- Código usa base `/sigt/fe/v1` sempre:
  `packages/utils/src/fiscal/AgtApiClient.ts:36-38`
- E “corrige” só alguns endpoints com URL absoluta em sandbox:
  - `registarFactura`: `.../sigt/fe/v1/registarFactura` (`packages/utils/src/fiscal/AgtApiClient.ts:96-104`)
  - `obterEstado`: `.../sigt/fe/v1/obterEstado` (`packages/utils/src/fiscal/AgtApiClient.ts:131-140`)
  - **mas** `listarFacturas` usa `.../sigt/fe/ws/v1/listarFacturas` (`packages/utils/src/fiscal/AgtApiClient.ts:168-176`)

**Impacto**
- Em HML, algumas rotas podem dar 404/405 dependendo do gateway AGT.

**Recomendação**
- Normalizar: definir `baseURL` por ambiente (HML/PROD) com a *base correcta* e usar sempre paths relativos (`/registarFactura`, etc.).

---

### B) Credenciais / Autenticação (Basic Auth)

#### B1) **ALTO** — Modelo de credenciais AGT (SSOT)
**Decisão aplicada**
- ✅ Credenciais AGT são **globais** (Basic Auth do produtor) via variáveis de ambiente (`AGT_USERNAME`/`AGT_PASSWORD`).
- ✅ O campo `Clinica.agtApiToken` foi **removido** do schema e do UI/API para eliminar ambiguidade.

**Nota**
- Mantém-se conforme documentação AGT: `Authorization: Basic <Base64(username:password)>`.

---

### C) Chaves / Certificados / Criptografia

#### C1) **CRÍTICO** — Worker não desencripta `agtPrivateKey/agtPublicKey` vindas da BD
**Evidência**
- API desencripta:
  - `apps/api/src/services/faturas.service.ts:360-363` usa `decryptSecret(...)`
  - `apps/api/src/services/fiscal/ContingencySyncService.ts:114-117` usa `decryptSecret(...)`
- Worker **não** desencripta:
  - `apps/worker/src/workers/report-agt.worker.ts:57-60` passa `fatura.clinica.agtPrivateKey` directamente.

**Impacto**
- Chave inválida → falha na assinatura JWS/documento → rejeição AGT (tipicamente E9x / 4xx).

**Recomendação**
- Implementar o mesmo mecanismo de desencriptação no worker (ou mover a desencriptação para um helper partilhado em `@clinicaplus/utils/server`).

---

### D) Assinaturas JWS (RS256) e payload assinado

#### D1) **ALTO** — Ambiguidade do campo `companyName` (cliente vs emitente) e consistência com a assinatura
**Evidência**
- Builder:
  - `packages/utils/src/fiscal/buildAgtRegistarFacturaPayload.ts:145`  
    `companyName: input.clienteNome,`
  - E também no documento enviado:
    `packages/utils/src/fiscal/buildAgtRegistarFacturaPayload.ts:179`  
    `companyName: input.clienteNome,`

**O que diz a “fonte de verdade” (docs AGT da skill)**
- Em `references/servico-registar-factura.md`, o exemplo e o payload da `jwsDocumentSignature` usam:
  - `customerTaxID`, `customerCountry` e `companyName` com valor de **cliente** (ex.: “Cliente Genérico”).
- Porém, na mesma referência, a descrição do campo `companyName` aparece como “Nome/denominação do contribuinte emissor”, o que é contraditório.

**Impacto**
- Se a AGT interpretar `companyName` como **emitente**, o valor actual (cliente) pode causar rejeição/erros de validação.
- Se a AGT interpretar `companyName` como **cliente** (como sugere o exemplo), o comportamento actual está alinhado — mas o nome do campo no nosso código induz erro de manutenção.

**Recomendação**
- **Confirmar com a AGT** (ou com payloads aceites em ambiente HML) qual o significado real de `companyName`.
- Independentemente do significado:
  1) Garantir que **o valor em `companyName` no `document` é exactamente o mesmo valor incluído na `jwsDocumentSignature`** (aqui está OK porque ambos usam `input.clienteNome`).
  2) Renomear o campo interno (ex.: `customerNameForAgtCompanyName`) para evitar regressões.

---

#### D2) **ALTO** — Tipos diferentes entre dados assinados e dados enviados (totais)
**Evidência**
- Payload para assinatura usa números:
  - `packages/utils/src/fiscal/buildAgtRegistarFacturaPayload.ts:146-151`
    ```ts
    documentTotals: { taxPayable: centsToNumber(...), netTotal: centsToNumber(...), grossTotal: centsToNumber(...) }
    ```
- Documento enviado usa strings:
  - `packages/utils/src/fiscal/buildAgtRegistarFacturaPayload.ts:163-167`
    ```ts
    documentTotals: { taxPayable: "0.00", netTotal: "0.00", grossTotal: "0.00" }
    ```

**Impacto**
- Se a AGT valida a assinatura recompondo o payload a partir do documento, a comparação “string vs number” pode invalidar a assinatura.

**Recomendação**
- Alinhar o tipo (ex.: assinar e enviar sempre como **strings com 2 casas**, ou sempre como números se o schema permitir).

---

#### D3) **OK** — Header JWS usa `typ: "JWT"`
**Evidência**
- `packages/utils/src/fiscal/CertificationService.ts:92-95`

**Nota**
- A documentação da skill (`references/assinaturas-jws.md`) especifica explicitamente o cabeçalho `{"alg":"RS256","typ":"JWT"}` — portanto **está alinhado**.

---

#### D4) **CRÍTICO** — Payload da AGT (docs) usa números; implementação usa muitos campos como `string`
**Evidência**
- Docs da skill (ex.: `references/servico-registar-factura.md`) mostram campos numéricos como **number**:
  - `quantity`, `unitPriceBase`, `unitPrice`, `creditAmount`, `taxPercentage`, `taxContribution`, `taxPayable`, `netTotal`, `grossTotal`.
- O nosso modelo/geração usa strings para vários destes campos:
  - `packages/utils/src/fiscal/types.ts` define muitos valores monetários como `string`
  - `buildAgtRegistarFacturaPayload.ts` produz, por exemplo, `taxPayable/netTotal/grossTotal` como `"0.00"` no documento.

**Impacto**
- Se a API AGT for estrita quanto a tipos, pode retornar **E02 (formato inválido)** em HML/PROD.

**Recomendação**
- Alinhar os tipos para **number** onde a doc exige number, e garantir serialização JSON com números.
- Se houver motivo histórico para strings (compatibilidade com outra integração), validar em HML e documentar a decisão.

---

### E) Cálculos / IVA / Arredondamentos

#### E1) **ALTO** — Arredondamento do IVA usa `Math.round`, mas a regra costuma ser “por excesso”
**Evidência**
- `packages/utils/src/fiscal/buildAgtRegistarFacturaPayload.ts:81-83`
  ```ts
  return Math.round(base * (item.taxaIva / 100));
  ```

**Impacto**
- Diferenças de 0.01 podem levar a erro de validação (ex.: `grossTotal != netTotal + taxPayable`, ou erro em linhas).

**Recomendação**
- Aplicar arredondamento conforme regra AGT (normalmente `Math.ceil(...)` ao cêntimo) e centralizar isso num util para evitar divergências.

---

#### E2) **MÉDIO** — `quantity` pode ficar “0” no payload
**Evidência**
- `packages/utils/src/fiscal/buildAgtRegistarFacturaPayload.ts:93-94` cria `qty` defensivo,
  mas `line.quantity` usa o valor original (`String(item.quantidade)`) em `:117`.

**Impacto**
- Quantidade 0 pode ser rejeitada.

**Recomendação**
- Usar `String(qty)` no campo `quantity`.

---

### F) Fluxo assíncrono e estados (requestID + polling)

#### F1) **OK** — Polling com backoff exponencial e “resultCode 8 = em processamento”
**Evidência**
- `packages/utils/src/fiscal/pollAgtSubmissionStatus.ts` implementa backoff e re-tenta apenas quando `resultCode === '8'`.

**Recomendação**
- Considerar ampliar a regra de retry caso a AGT use outros códigos “em processamento” (confirmar DS.120).

---

### G) Tratamento de erros AGT (E01–E99)

#### G1) **MÉDIO** — Parsing de erro pode perder `idError` e detalhes
**Evidência**
- `packages/utils/src/fiscal/AgtApiClient.ts:109-112` usa:
  `error.response.data?.idError`
- Porém muitos payloads AGT retornam `errorList[]` (ver tipos em `packages/utils/src/fiscal/types.ts:123-128`).

**Impacto**
- Mensagens genéricas e sem o código real (E01–E99), dificultando suporte.

**Recomendação**
- Normalizar parsing:
  - detectar `data.idError`, `data.errorList?.[0]?.idError`, `data.requestErrorList?.[0]?.idError`, etc.
- Expandir `AgtError.fromStatus` para mapear os códigos E01–E99 mais comuns ao contexto do produto.

---

### H) QR Code e impressão

#### H1) **OK/MÉDIO** — QR usa URL de consulta, mas `hashControl` no UI parece incorrecto
**Evidência**
- QR URL: `apps/web/src/components/print/FaturaPrint.tsx:20-22`
- `hashControl` UI: `apps/web/src/components/print/FaturaPrint.tsx:64` deriva dos primeiros 4 chars do hash.

**Recomendação**
- Exibir `hashControl` real (ex.: `"1"`) e o hash truncado (conforme regra fiscal/SAF-T), em vez de um prefixo arbitrário.

---

## 4) Plano de Correcção (ordem sugerida)

### Fase 1 — Hotfix (bloqueadores)
1) Corrigir detecção de ambiente no `packages/utils/src/fiscal/AgtApiClient.ts` (garantir PROD → `sifp`, HML → `sifphml`).  
2) Fazer o worker desencriptar chaves do tenant antes de assinar.  
3) Confirmar significado de `companyName` (cliente vs emitente) via HML/AGT e tornar o mapeamento explícito (campo interno renomeado + doc).  
4) Unificar arredondamento de IVA conforme regra AGT (por excesso ao cêntimo).  
5) Validar tipos numéricos vs strings no payload (`registarFactura`) conforme DS.120 e ajustar payload builder/types se necessário.

### Fase 2 — Robustez e consistência
5) Normalizar `schemaVersion` (evitar mistura 1.0/1.2 sem necessidade).  
6) Unificar modelo de credenciais (global vs por clínica) e remover dead paths.  
7) Melhorar parsing/mapeamento de erros E01–E99 e logging (com `requestID`, `submissionUUID`, `documentNo`).

### Fase 3 — Qualidade (testes)
8) Adicionar testes cobrindo:
   - selecção de baseURL por ambiente;
   - worker desencripta chaves e consegue assinar;
   - payload registarFactura contém emitente/cliente nos campos correctos;
   - arredondamentos e totais batem com as regras.

---

## 5) Checklist de Configuração (produção)

- [ ] `AGT_USERNAME` e `AGT_PASSWORD` configurados (ou token por clínica definido e usado consistentemente)  
- [ ] `AGT_PRODUCT_ID`, `AGT_PRODUCT_VERSION`, `AGT_SOFTWARE_CERTIFICATE/AGT_VALIDATION_NUMBER` configurados (sem defaults)  
- [ ] `AGT_PRIVATE_KEY` / `AGT_PUBLIC_KEY` (se usado como fallback)  
- [ ] `Clinica.agtPrivateKey` / `Clinica.agtPublicKey` válidos e desencriptáveis  
- [ ] `AGT_EAC_CODE` correcto para a actividade  
- [ ] Timeouts e polling (`AGT_TIMEOUT_MS`, `AGT_POLL_*`) ajustados para a latência real

---

## 6) Próximos passos (se quiseres)

Se confirmares, eu posso:
1) preparar um **PR de correcções** (sem mudar comportamento funcional além do necessário), ou  
2) criar um “modo auditoria” que valida payloads localmente antes de chamar a AGT (schema + consistência de assinatura + totais).
