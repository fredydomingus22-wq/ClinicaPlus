# Plano de Mitigação — Não Conformidades (Relatório de Auditoria AGT)

Data: 2026-05-24  
Base: `RELATORIO-AUDITORIA-AGT-INTEGRACAO.md`  
Fonte de verdade (padrão AGT): skill `agt-faturacao-electronica` (refs/subskills), incluindo:
- `references/servico-registar-factura.md`, `references/servico-obter-estado.md`, `references/servico-solicitar-serie.md`
- `references/exemplos-payloads.md`, `references/assinaturas-jws.md`
- `references/codigos-erro.md`, `references/tabelas-referencia.md`

---

## 1) Objectivo

Mitigar **todas** as não conformidades identificadas na auditoria, alinhando a integração com o padrão AGT:
- ambiente correcto (HML vs PROD) e endpoints correctos;
- autenticação Basic Auth consistente;
- chaves e assinaturas JWS correctas (produtor vs contribuinte);
- payload `registarFactura` consistente com a doc (campos, tipos e arredondamentos);
- tratamento de erros E01–E99 com diagnóstico rápido;
- QR Code e impressão conformes;
- testes que impeçam regressões.

---

## 2) Inventário de não conformidades (do relatório)

| ID | Severidade | Tema | Onde aparece |
|---|---|---|---|
| A1 | CRÍTICO | Detecção de ambiente/baseURL errada (PROD pode ir para HML) | `packages/utils/src/fiscal/AgtApiClient.ts`, wrapper em `apps/api/.../AgtApiClient.ts` |
| A2 | ALTO | Inconsistência `/v1` vs `/ws/v1` no sandbox | `packages/utils/src/fiscal/AgtApiClient.ts` + runbook |
| B1 | ALTO | Modelo de credenciais AGT (global vs por clínica) | API/controller/service/worker |
| C1 | CRÍTICO | Worker não desencripta chaves do tenant | `apps/worker/src/workers/report-agt.worker.ts` |
| D1 | ALTO | Ambiguidade/semântica de `companyName` e consistência com assinatura | builder `buildAgtRegistarFacturaPayload.ts` + doc AGT |
| D2 | ALTO | Tipos divergentes entre assinatura e documento (totais) | builder `buildAgtRegistarFacturaPayload.ts` |
| D4 | CRÍTICO | Doc AGT usa números; implementação usa strings em vários campos | `types.ts` + builders |
| E1 | ALTO | Arredondamento de IVA usa `Math.round` vs “por excesso” | builder `buildAgtRegistarFacturaPayload.ts` |
| E2 | MÉDIO | `quantity` pode ir como “0” (inconsistência do fallback) | builder `buildAgtRegistarFacturaPayload.ts` |
| G1 | MÉDIO | Parsing de erros pode perder `idError` (E01–E99) | `packages/utils/src/fiscal/AgtApiClient.ts` |
| H1 | OK/MÉDIO | UI do `hashControl` (impressão) não reflecte “hashControl” real | `apps/web/src/components/print/FaturaPrint.tsx` |

---

## 2.1) Estado actual (implementação no código — 2026-05-24)

> Nota: este estado reflecte as mudanças já aplicadas no repositório (SSOT em `@clinicaplus/utils/server` e refactor de API/worker).

| ID | Estado | Evidência (fonte única / call sites) |
|---|---|---|
| A1 | ✅ Mitigado | `packages/utils/src/fiscal/agtEnv.ts` (`resolveAgtEnvFromProcessEnv`) + uso em `apps/api/src/services/fiscal/AgtApiClient.ts` e `apps/worker/src/workers/report-agt.worker.ts` |
| A2 | ✅ Mitigado (parcial) | `packages/utils/src/fiscal/agtEndpoints.ts` (HML: `listarFacturas` → `/sigt/fe/ws/v1`) |
| B1 | ✅ Mitigado | Decisão tomada: credenciais **globais** (Basic Auth via env). Campo `Clinica.agtApiToken` removido do schema e do UI/API. |
| C1 | ✅ Mitigado | `packages/utils/src/fiscal/agtKeys.ts` (`resolveAgtTenantKeys`) + uso em `apps/worker/src/workers/report-agt.worker.ts` e API (services/controller) |
| D1 | ⏳ Pendente | Requer validação/decisão sobre semântica do `companyName` (cliente vs emitente) e documentação |
| D2 | ⏳ Pendente | Ainda existem divergências “número vs string” em partes do contrato (assinatura vs documento) — requer alinhamento final do contrato |
| D4 | ⏳ Pendente | Contrato “numbers vs strings” deve ser formalizado e imposto por testes/validação |
| E1 | ✅ Mitigado | Rounding por excesso centralizado em `packages/utils/src/fiscal/money.ts` e aplicado no builder |
| E2 | ⏳ Pendente | Builder ainda deve garantir que `quantity` final nunca segue como `"0"` |
| G1 | ✅ Mitigado | Parsing normalizado em `packages/utils/src/fiscal/agtErrors.ts` + `AgtApiClient.mapAxiosError()` preserva `idError/descriptionError` |
| H1 | ⏳ Pendente | UI ainda precisa alinhar `hashControl`/impressão conforme regra definida |

### Notas de refactor (não-conformidades correlacionadas)

- ✅ Remoção de singletons problemáticos de `CertificationService` (evita env/chaves “presas” em runtime e elimina inconsistências entre API/worker/testes).
- ✅ SSOT explícito: ambiente, endpoints, basic auth, keys tenant, rounding e parsing de erros exportados por `@clinicaplus/utils/server`.

## 3) Estratégia de Mitigação (por fases)

### Fase 0 — Regras “fonte de verdade” que vamos seguir (AGT)

Consolidar (e aplicar em código/testes) as regras mais sensíveis da doc da skill:

1) **Endpoints oficiais** (ver refs):
   - `registarFactura`: HML/PROD em `/sigt/fe/v1/registarFactura` (`references/servico-registar-factura.md`)
   - `obterEstado`: HML/PROD em `/sigt/fe/v1/obterEstado` (`references/servico-obter-estado.md`)
   - `solicitarSerie`: HML/PROD em `/sigt/fe/v1/solicitarSerie` (`references/servico-solicitar-serie.md`)
   - `listarFacturas`: HML **pode** usar `/sigt/fe/ws/v1/listarFacturas` e PROD `/v1/listarFacturas` (`references/servicos-consulta.md`)

2) **JWS (RS256)** (ver `references/assinaturas-jws.md`):
   - header `{"alg":"RS256","typ":"JWT"}`
   - JSON canónico
   - `jwsSoftwareSignature`: chave do **produtor**
   - `jwsDocumentSignature` e `jwsSignature`: chave do **contribuinte**

3) **Cálculos e validações** (ver `references/servico-registar-factura.md`):
   - `taxContribution` arredondar **por excesso** ao cêntimo
   - `taxPayable = soma(taxContribution)`
   - `netTotal = soma(base)` (na doc aparece como soma de amounts)
   - `grossTotal = netTotal + taxPayable`

4) **Erros e diagnóstico** (ver `references/codigos-erro.md`):
   - mapear e logar `idError` + `descriptionError` para reduzir MTTR.

---

### Fase 1 — Hotfix (bloqueadores de produção)

#### 1.1 (A1) Corrigir detecção de ambiente/baseURL
**Acção**
- Refactor do construtor do `AgtApiClient` (base, em `packages/utils/src/fiscal/AgtApiClient.ts`) para suportar explicitamente:
  - `env = "sandbox" | "production"` (preferencial), ou
  - `baseURL` absoluto (caso avançado).

**Padrão recomendado**
- `new AgtApiClient({ env: 'sandbox' })` → base `https://sifphml.minfin.gov.ao/sigt/fe/v1`
- `new AgtApiClient({ env: 'production' })` → base `https://sifp.minfin.gov.ao/sigt/fe/v1`

**Critério de aceitação**
- Em produção, nenhuma chamada vai para `sifphml`.
- Test unitário: “env=production → sifp”; “env=sandbox → sifphml”.

---

#### 1.2 (C1) Desencriptar chaves no worker (tenant keys)
**Acção**
- Replicar no worker o mesmo mecanismo usado na API (`decryptSecret`), antes de instanciar `CertificationService`.
- Alternativa preferida: mover helper para `@clinicaplus/utils/server` para evitar duplicação.

**Critério de aceitação**
- Worker consegue gerar `jwsDocumentSignature` e `jwsSignature` com chaves reais (desencriptadas) e passa em testes.

---

#### 1.3 (E1) Arredondamento “por excesso” em `taxContribution`
**Acção**
- Substituir `Math.round(...)` por arredondamento por excesso ao cêntimo:
  - `ceil(raw * 100) / 100`
- Centralizar num util (ex.: `roundUpToCents(value)`), usado em todos os cálculos de imposto.

**Critério de aceitação**
- `23.144 → 23.15` e casos de microvalores (`0.001844 → 0.01`) conforme doc (`subskills/04-registar-factura.md`).

---

### Fase 2 — Conformidade de payload e assinatura (registarFactura)

#### 2.1 (D4 + D2) Alinhar tipos numéricos vs strings no payload
**Problema**
- A doc da AGT (refs) mostra muitos campos como **number** (ex.: `quantity`, `unitPriceBase`, `taxPayable`), e o nosso código usa **string** em várias partes.

**Acção**
1) Definir um “contrato interno” único:
   - opção recomendada: payload enviado à AGT com **numbers** onde a doc usa numbers.
2) Ajustar:
   - `packages/utils/src/fiscal/types.ts`
   - `buildAgtRegistarFacturaPayload.ts`
3) Garantir consistência entre:
   - dados assinados no `jwsDocumentSignature`
   - dados enviados no `document` (principalmente `documentTotals`)

**Critério de aceitação**
- Teste de schema/validação local: payload serializa números (não strings) nos campos monetários e percentagens, e mantém máximo 2 casas.
- Teste de assinatura: o que é assinado reflecte o mesmo tipo/valor do payload.

---

#### 2.2 (D1) Clarificar semântica de `companyName` (e evitar regressões)
**Observação (doc AGT da skill)**
- Exemplos de payload usam `companyName` com valor “Cliente Genérico”, mas a descrição textual do campo diz “emitente” (contradição).

**Acção**
- Tratar como risco de conformidade:
  1) Criar um “flag de compatibilidade” em config (HML/PROD) se necessário.
  2) Renomear internamente o campo (ex.: `agtCompanyNameFieldValue`) para não induzir erro.
  3) Validar em HML com 2 variantes (se possível) e fixar a decisão (documentar no código).

**Critério de aceitação**
- O valor em `companyName` no documento e no payload assinado (`jwsDocumentSignature`) é **idêntico**.
- Decisão de semântica documentada no repositório (README técnico / comentário no builder).

---

#### 2.3 (E2) Garantir `quantity` válido
**Acção**
- Ajustar builder para usar o `qty` defensivo no campo final `quantity` (e não o valor original).

**Critério de aceitação**
- Nunca enviar quantity “0” quando o item tiver sido normalizado para 1 (ou quando a regra do produto exige >=1).

---

### Fase 3 — Endpoints & paths (sandbox vs produção)

#### 3.1 (A2) Normalizar paths por endpoint (v1 vs ws/v1)
**Acção**
- Tirar a lógica “mista” do `AgtApiClient` e declarar um mapa por endpoint, seguindo as referências:
  - HML: `listarFacturas` pode precisar de `/ws/v1/listarFacturas` (refs `servicos-consulta.md`)
  - Os restantes (`registarFactura`, `obterEstado`, `solicitarSerie`, etc.) seguem `/v1`

**Critério de aceitação**
- Em HML, endpoints funcionam sem 404/405 por path errado.
- Em PROD, todos seguem `/v1`.

---

### Fase 4 — Credenciais (modelo global vs por clínica)

#### 4.1 (B1) Decidir e aplicar o modelo de credenciais
**Opção A (global — produtor)**
- `AGT_USERNAME/AGT_PASSWORD` no servidor e worker.
- ✅ Credenciais são globais. `Clinica.agtApiToken` foi removido.

**Opção B (por clínica)**
- (Não aplicável) Modelo por clínica foi descartado — credenciais AGT são globais via env.
  - `submeterParaAgt`
  - `FiscalController` (testar conexão, listar séries, etc.)
  - worker

**Critério de aceitação**
- Um único caminho de credenciais (sem “fallbacks silenciosos”).
- Logs indicam fonte do token (env vs clinica) de forma segura (sem imprimir segredo).

---

### Fase 5 — Erros E01–E99 e diagnóstico (observabilidade)

#### 5.1 (G1) Normalizar parsing de erros AGT
**Acção**
- No `AgtApiClient`:
  - detectar `idError` em múltiplos formatos:
    - `data.idError`
    - `data.errorList?.[0]?.idError`
    - `data.requestErrorList?.[0]?.idError`
  - incluir sempre `documentNo` quando existir.
- Expandir `AgtError.fromStatus` para incluir códigos mais comuns de FE (E01–E49, E93–E99) com mensagens accionáveis (a partir de `references/codigos-erro.md`).

**Critério de aceitação**
- Em qualquer erro 4xx/422/429, logs e resposta interna contém o `idError` real.

---

### Fase 6 — QR e impressão

#### 6.1 (H1) Corrigir “hashControl” na impressão
**Acção**
- Ajustar UI para exibir:
  - `hashControl` real (se existir no DTO/BD), ou “1” (se for fixo por design),
  - e exibir `fiscalHash` truncado conforme boas práticas fiscais.

**Critério de aceitação**
- A impressão não inventa `hashControl` derivando do hash.
- QR Code mantém padrões da doc (versão 4, ECC M, 350×350, URL AGT) — já está alinhado.

---

## 4) Testes e evidências (obrigatório para fechar não conformidade)

### 4.1 Unit tests (utils)
- `AgtApiClient`:
  - baseURL para `env=production/sandbox`
  - mapa de endpoints HML (v1 vs ws/v1)
- `buildAgtRegistarFacturaPayload`:
  - tipos numéricos correctos
  - rounding por excesso
  - quantity normalizada
- `CertificationService`:
  - JWS com header correto (`typ:"JWT"`)
  - JSON canónico (ordem/sem espaços) e Base64URL

### 4.2 Integration tests (api/worker)
- Worker desencripta e assina correctamente.
- Fluxo: emitir → enviar → obterEstado (polling) → status final.
- Cenários com erros: E22/E23/E24 e parsing correcto de `idError`.

---

## 5) Ordem de execução recomendada (curta)

1) A1 (baseURL) + C1 (worker decrypt) + E1 (rounding)  
2) D4/D2 (tipos numéricos e consistência assinatura↔payload) + E2 (quantity)  
3) A2 (paths por endpoint em HML)  
4) B1 (modelo de credenciais)  
5) G1 (erro parsing + mensagens)  
6) H1 (UI impressão/hashControl)

---

## 6) Entregáveis

1) PR com mudanças de código (utils + api + worker + web)  
2) Atualização de documentação interna (runbook + notas técnicas)  
3) Suíte de testes actualizada (unit + integration)  
4) Checklist de verificação em HML (com exemplos de payload) baseado em `references/exemplos-payloads.md`
