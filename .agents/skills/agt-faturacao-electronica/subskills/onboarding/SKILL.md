# Onboarding AGT FE

## Objetivo

Preparar o sistema para integração com a API AGT FE com segurança e rastreabilidade.

## Checklist

1. Validar credenciais Basic Auth (`username/password`) com a AGT.
2. Separar variáveis por ambiente (`HML` e `PROD`).
3. Confirmar estratégia de assinatura JWS RS256.
4. Garantir armazenamento seguro de chaves (vault/secret manager).
5. Executar `scripts/check_env.*` antes de testes.

## Inputs mínimos esperados

- NIF do contribuinte.
- Dados do software (`productId`, `productVersion`, `softwareValidationNumber`).
- Chave privada do produtor para `jwsSoftwareSignature`.

## Referências a carregar

- `../../references/security/auth-jws-keys.md`
- `../../references/endpoints/catalog.md`
