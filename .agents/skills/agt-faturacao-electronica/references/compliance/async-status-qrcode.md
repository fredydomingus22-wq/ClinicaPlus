# Processamento Assíncrono, Estados e QR Code

## Processamento assíncrono

- Submissão devolve `requestID` de receção.
- Validação final ocorre depois em fila interna.
- Cliente deve consultar estado (`polling`) via `obterEstado`.
- Callback está indicado como disponível em próximas versões.
- Página: `/modelo.html`, `/index.html`.

## Estados e rastreabilidade

- Persistir `requestID` + `submissionUUID` localmente.
- Correlacionar `documentStatus`/erros por documento no retorno.

## QR Code para impressão

- Padrão: QR Code Model 2.
- Versão: 4 (33x33 módulos).
- Correção: nível M (15%).
- Codificação: UTF-8.
- Arquivo: PNG 350x350 px.
- URL base indicada na doc:
  `https://quiosqueagt.minfin.gov.ao/facturacao-eletronica/consultar-fe?emissor=nifEmissor&document=documentNo`
- Espaços em `documentNo`: substituir por `%20`.
- Página: `/qrcode.html`.
