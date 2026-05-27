# Integration AGT FE

## Objetivo

Implementar e/ou refactorar integrações dos serviços AGT FE com padrão resiliente.

## Fluxo recomendado

1. Preparar payload com `schemaVersion`, `submissionTimeStamp`, `taxRegistrationNumber`.
2. Popular `softwareInfo.softwareInfoDetail` e `jwsSoftwareSignature`.
3. Assinar `jwsSignature` do pedido.
4. Enviar endpoint com Basic Auth.
5. Persistir `requestID` e correlacionar com `submissionUUID` local.
6. Consultar estado por polling (modelo assíncrono).

## Regras de implementação

- Isolar cliente HTTP AGT em módulo único.
- Criar normalizador de erros de retorno.
- Definir retries com backoff para consultas de estado.
- Tratar `documentStatus` e lista de erros por documento.

## Referências a carregar

- `../../references/endpoints/catalog.md`
- `../../references/compliance/async-status-qrcode.md`
- `../../resources/examples/payload_minimo_registar_factura.json`
