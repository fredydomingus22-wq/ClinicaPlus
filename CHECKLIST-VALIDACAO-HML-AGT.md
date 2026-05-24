# Checklist — Validação em Homologação (AGT FE)

Fonte de verdade: skill `agt-faturacao-electronica` (endpoints, assinaturas JWS, regras de payload e erros).

## 1) Pré-requisitos (config)

- [ ] `AGT_ENV=sandbox` (ou `AGT_SANDBOX=true`)
- [ ] `AGT_USERNAME` e `AGT_PASSWORD` configurados (credenciais **globais** do produtor — Basic Auth)
- [ ] `AGT_PRODUCT_ID`, `AGT_PRODUCT_VERSION`, `AGT_SOFTWARE_CERTIFICATE` (ou `AGT_VALIDATION_NUMBER`)
- [ ] Clínica com:
  - [ ] `nif` configurado (taxRegistrationNumber)
  - [ ] `razaoSocial` e `enderecoPostal` configurados
  - [ ] `agtPrivateKey` e `agtPublicKey` configurados (chaves do contribuinte — encriptadas em BD, desencriptadas em runtime)

## 2) Endpoints (sanity check)

- [ ] Base URL HML: `https://sifphml.minfin.gov.ao`
- [ ] Paths:
  - [ ] `POST /sigt/fe/v1/registarFactura`
  - [ ] `POST /sigt/fe/v1/obterEstado`
  - [ ] `POST /sigt/fe/v1/solicitarSerie`
  - [ ] `POST /sigt/fe/v1/listarSeries`
  - [ ] `POST /sigt/fe/v1/consultarFactura`
  - [ ] `POST /sigt/fe/v1/validarDocumento`
  - [ ] `POST /sigt/fe/ws/v1/listarFacturas` (somente HML)

## 3) Assinaturas (JWS / RS256)

- [ ] Header JWS: `{"alg":"RS256","typ":"JWT"}`
- [ ] JSON canónico (chaves ordenadas; sem espaços/newlines)
- [ ] Base64URL sem padding
- [ ] `jwsSoftwareSignature` assina **apenas** `{productId, productVersion, softwareValidationNumber}` com a chave do **produtor**
- [ ] `jwsDocumentSignature` assina o payload do documento com a chave do **contribuinte**

## 4) Registar factura (fluxo)

- [ ] Emitir uma factura (FT) e garantir snapshot fiscal criado (inclui `emitenteNome`)
- [ ] Submeter para AGT (`registarFactura`) e confirmar:
  - [ ] recebe `requestID`
  - [ ] `numberOfEntries` == `documents.length`
  - [ ] `grossTotal = netTotal + taxPayable`
  - [ ] `taxContribution` arredondado por excesso ao cêntimo
  - [ ] `companyName` no documento == `companyName` no payload assinado (JWS document)

## 5) Polling de estado (obterEstado)

- [ ] Polling com `requestID` até estado final
- [ ] Se `resultCode=0` → sucesso
- [ ] Se `resultCode=2` ou `documentStatus != V` → capturar `idError` + `descriptionError` + `documentNo`

## 6) Casos especiais por tipo de documento

- [ ] `AR`/`RC`/`RG`: não enviar `lines`; preencher `paymentReceipt`
- [ ] `NC`: `referenceInfo` obrigatório (documento base)
- [ ] `GF`/`FG`: `operationDate` obrigatório por linha
- [ ] Correcção: `documentStatus="C"` requer `rejectedDocumentNo`

## 7) Evidências para fechar validação

- [ ] Guardar 1 exemplo de payload aceite (request + response + requestID)
- [ ] Guardar 1 exemplo de payload rejeitado com `errorList` (idError/descriptionError)
- [ ] Validar impressão: `hashControl` exibido sem “derivações” do hash

