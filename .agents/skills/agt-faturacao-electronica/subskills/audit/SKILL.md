# Audit AGT FE

## Objetivo

Auditar conformidade funcional, técnica e de segurança de integrações AGT FE.

## Matriz de auditoria

1. Segurança
- Basic Auth protegido e sem logs sensíveis.
- Chave privada fora de repositório.

2. Assinaturas
- Uso de RS256.
- Assinatura de objeto JSON (não concatenação ad-hoc).

3. Contrato
- Campos obrigatórios por endpoint.
- Coerência `schemaVersion`, timestamps e NIF.

4. Processamento
- Persistência de `requestID`.
- Polling implementado para decisão final.

5. Impressão fiscal
- QR Code com formato/padrões definidos.

## Execução automatizada

- Rodar `scripts/audit_request.py` com payloads de amostra.

## Referências a carregar

- `../../references/security/auth-jws-keys.md`
- `../../references/compliance/error-patterns.md`
