# ADR-018 — Módulo de Faturação Fiscal Certificado AGT

**Data:** 2026-05-17
**Status:** ACEITE
**Decisores:** ClinicaPlus Core Team

---

## Contexto

O ClinicaPlus é candidato a **certificação AGT** como software de faturação para o mercado angolano (Portaria 679/2017 e atualizações 2024/2025). O módulo de faturação existente opera como CRUD básico sem respeitar os requisitos legais de integridade de dados, assinatura digital, imutabilidade documental, e reporte eletrónico obrigatório.

A AGT exige que todo software de faturação certificado:
- Numere documentos sequencialmente sem lacunas por série.
- Assine cada documento com RSA-2048 (hash chain vinculado ao documento anterior).
- Proíba alteração ou eliminação de documentos fiscais emitidos.
- Exporte dados no formato SAF-T AO (XML ISO 20022-AO).
- Suporte todos os tipos documentais: FT (Factura), FR (Factura/Recibo), NC (Nota de Crédito), ND (Nota de Débito), VD (Venda a Dinheiro).

---

## Decisões

### D1 — Imutabilidade Documental (Regra mais Crítica)

Toda Fatura com `estado !== RASCUNHO` torna-se **imutável**. Não se permitem edições, apenas anulação via emissão de uma Nota de Crédito (NC) vinculada que referencia a fatura original. O model Prisma terá um middleware de proteção que bloqueia `UPDATE` em documentos emitidos.

### D2 — Hash Chain RSA-2048

Ao emitir um documento fiscal, o sistema:
1. Concatena: `dataEmissao;dataDocumento;numero;total;fiscalHashAnterior`.
2. Assina com chave RSA-2048 privada (armazenada em variável de ambiente `AGT_PRIVATE_KEY`).
3. Guarda os primeiros 172 caracteres Base64 em `fiscalHash`.
4. O `hashControl` registra a versão do algoritmo (inicialmente `"1"`).

A chave pública é submetida à AGT como parte do processo de certificação do software.

### D3 — Séries Documentais e Numeração Sequencial

Cada tipo de documento fiscal (FT, NC, etc.) mantém a sua **própria série sequencial** por clínica e por ano fiscal. Formato: `FT CPLS/42` → `{TipoDoc} {Serie}/{Sequencial}`. Série sugerida: `CPLS` (configurável por clínica).

A numeração é gerida via tabela `SequenciaDocFiscal` com locking otimista (`SELECT FOR UPDATE`) para prevenir lacunas em contexto concorrente.

### D4 — Regime Fiscal Configurável

O regime fiscal é campo da Clinica (`regimeFiscal`):
- **GERAL** → IVA 14%
- **SIMPLIFICADO** → IVA 7%
- **ISENTO** → IVA 0% (requer `motivoIsencao` em cada item)

O UI providenciará um painel de Configurações Fiscais para o administrador da clínica definir o seu regime, NIF, razão social, endereço fiscal completo, e credenciais de integração AGT.

### D5 — Snapshot de Dados à Emissão

No momento da emissão, guarda-se um snapshot JSON com NIF, razão social e morada do emitente E do cliente. Isto garante que alterações futuras nos dados cadastrais não corrompem documentos históricos.

### D6 — SAF-T AO como Exportação Nativa

O sistema gera ficheiros SAF-T AO em XML usando `xmlbuilder2`. A norma angolana segue a estrutura SAF-T PT com adaptações locais (moeda AOA, campos AGT específicos). O export cobre: MasterFiles (clientes, produtos/serviços), SourceDocuments (facturas, NC), e GeneralLedgerEntries (quando futuro módulo contabilístico existir).

### D7 — Reporte AGT via API e-Factura

O sistema reporta documentos fiscais em tempo real à API e-Factura da AGT. Em caso de falha de rede, documentos ficam com `statusEnvio = PENDENTE` e um worker (BullMQ) retenta o envio com backoff exponencial. Documentos emitidos são válidos mesmo se o envio falhar temporariamente.

---

## Consequências

**Ganhos:**
- Conformidade total com requisitos AGT para certificação de software de faturação.
- Auditoria integral via hash chain — qualquer adulteração quebra a cadeia criptográfica.
- Exportação SAF-T AO permite integração com contabilidade e auditorias fiscais.

**Custos:**
- Anular documentos exige emissão de NC (workflow mais complexo para o utilizador).
- Necessidade de gerir chaves RSA e garantir que a chave privada nunca é exposta.
- O modelo de sequência documental exige locking de base de dados e pode ser um bottleneck em alta concorrência (mitigado pelo `SELECT FOR UPDATE`).

**Riscos:**
- Alterações futuras na regulamentação AGT podem exigir adaptações ao formato SAF-T ou ao protocolo de assinatura. A modularidade do serviço de certificação (`CertificationService`) visa mitigar isso.
