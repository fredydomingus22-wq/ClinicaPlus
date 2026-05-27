# Cobertura de Leitura da Documentação AGT FE

Diretório base analisado:
- https://quiosqueagt.minfin.gov.ao/doc-agt/faturacao-electronica/1/

## Páginas consumidas

1. `/index.html`
2. `/api.html`
3. `/estrutura.html`
4. `/modelo.html`
5. `/gestao.html`
6. `/qrcode.html`
7. `/servicos/solicitar.html`
8. `/servicos/listar.html`
9. `/servicos/registar.html`
10. `/servicos/consultar.html`
11. `/servicos/consultar_fatura.html`
12. `/servicos/listar_faturas.html`
13. `/servicos/validar.html`

## Achados importantes incorporados na skill

- Modelo assíncrono com `requestID` e consulta posterior de estado.
- Basic Auth obrigatório em chamadas protegidas.
- JWS RS256 para assinatura de software, documento e requisição.
- Regras de chave RSA (mínimo 2048 bits) e gestão de chave pública no portal do parceiro.
- Diferenças documentadas de path em homologação (`ws/v1` vs `v1`) em endpoints específicos.
- Regras de QR code para impressão fiscal.
- Contratos de entrada/saída e padrões de erro (200/422/429 + estados internos de processamento).

## Observações de precisão

- Alguns exemplos na documentação apresentam valores ilustrativos e possíveis inconsistências de endpoint em homologação.
- A skill instrui a validar endpoint final com AGT quando houver divergência documental.
