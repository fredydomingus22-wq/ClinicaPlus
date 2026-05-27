---
name: agt-faturacao-electronica
description: >
  Use esta skill para integração, auditoria, validação, troubleshooting e refactor
  de sistemas de facturação com a API de Facturação Electrónica da AGT (Angola).
  Trigger em pedidos como: integrar AGT, registar factura, validar documento,
  assinar JWS RS256, listar séries/facturas, auditar conformidade FE AGT,
  corrigir erros de submissão, rever payload/requestID/documentStatus,
  configurar homologação/produção, QR Code/ATCUD.
---

# AGT Facturação Electrónica

Skill especializada para integração robusta com a API de Facturação Electrónica da AGT.

## Fluxo obrigatório

1. Classificar pedido: `onboarding`, `integration`, `audit` ou `troubleshooting`.
2. Ler a subskill correspondente em `subskills/`.
3. Ler apenas as referências necessárias em `references/`.
4. Em implementação técnica, usar scripts em `scripts/` quando aplicável.
5. Confirmar sempre ambiente (`hml` vs `prod`) e versão de schema no payload.

## Seleção de subskill

- `subskills/onboarding/SKILL.md`: setup inicial, credenciais, chaves, ambiente.
- `subskills/integration/SKILL.md`: implementação de endpoints, fluxo assíncrono, polling.
- `subskills/audit/SKILL.md`: auditoria de conformidade, segurança, consistência de assinaturas.
- `subskills/troubleshooting/SKILL.md`: diagnóstico/correção de erros de integração.

## Referências principais

- `references/coverage.md`: páginas oficiais consumidas no diretório AGT FE.
- `references/endpoints/catalog.md`: mapa de endpoints AGT (hml/prod).
- `references/security/auth-jws-keys.md`: Basic Auth, JWS RS256, gestão de chaves.
- `references/compliance/async-status-qrcode.md`: processamento assíncrono, estados e QR.
- `references/compliance/error-patterns.md`: padrões de erro e ações corretivas.

## Scripts úteis

- `scripts/check_env.ps1`, `scripts/check_env.sh`, `scripts/check_env.py`
- `scripts/jws_sign.py`
- `scripts/audit_request.py`
- `scripts/sync_docs.py` (varre recursivamente subpáginas do diretório AGT FE)

## Regras de execução

- Não expor `username/password` nem chave privada em logs.
- Nunca enviar chave privada do produtor para AGT.
- Em caso de divergência entre payload local e doc AGT, priorizar doc oficial e sinalizar diferença.
- Ao corrigir integrações existentes, preservar compatibilidade retroativa sempre que possível.
