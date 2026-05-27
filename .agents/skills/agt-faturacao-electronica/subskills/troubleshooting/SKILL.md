# Troubleshooting AGT FE

## Objetivo

Diagnosticar e corrigir erros de integração com foco em causa raiz.

## Sequência obrigatória

1. Identificar endpoint e ambiente (hml/prod).
2. Confirmar credenciais e cabeçalhos.
3. Validar JSON e assinaturas JWS.
4. Verificar `requestID` e estado assíncrono.
5. Mapear erro para ação corretiva.

## Padrões frequentes

- `401/403`: Basic Auth inválido ou credenciais ausentes.
- `400`: payload fora do contrato, timestamps/formato inválidos.
- `estado inválido`: assinatura incorreta ou regras fiscais violadas.

## Referências a carregar

- `../../references/compliance/error-patterns.md`
- `../../references/endpoints/catalog.md`
