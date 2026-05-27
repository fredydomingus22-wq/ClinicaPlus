# Catálogo de Endpoints AGT FE (v1)

Fonte oficial base:
- https://quiosqueagt.minfin.gov.ao/doc-agt/faturacao-electronica/1/

## Endpoints identificados

1. Solicitar criação de série
- HML: `POST https://sifphml.minfin.gov.ao/sigt/fe/ws/v1/registarFactura` (como publicado na página)
- PROD: `POST https://sifp.minfin.gov.ao/sigt/fe/v1/solicitarSerie`
- Página: `/servicos/solicitar.html`

2. Listar séries
- HML: `POST https://sifphml.minfin.gov.ao/sigt/fe/v1/listarSeries`
- PROD: `POST https://sifp.minfin.gov.ao/sigt/fe/v1/listarSeries`
- Página: `/servicos/listar.html`

3. Registar factura
- HML: `POST https://sifphml.minfin.gov.ao/sigt/fe/v1/registarFactura`
- PROD: `POST https://sifp.minfin.gov.ao/sigt/fe/v1/registarFactura`
- Página: `/servicos/registar.html`

4. Consultar estado da fatura
- HML: `POST https://sifphml.minfin.gov.ao/sigt/fe/v1/obterEstado`
- PROD: `POST https://sifp.minfin.gov.ao/sigt/fe/v1/obterEstado`
- Página: `/servicos/consultar.html`

5. Consultar factura
- HML: `POST https://sifphml.minfin.gov.ao/sigt/fe/v1/consultarFactura`
- PROD: `POST https://sifp.minfin.gov.ao/sigt/fe/v1/consultarFactura`
- Página: `/servicos/consultar_fatura.html`

6. Listar facturas electrónicas
- HML: `POST https://sifphml.minfin.gov.ao/sigt/fe/ws/v1/listarFacturas`
- PROD: `POST https://sifp.minfin.gov.ao/sigt/fe/v1/listarFacturas`
- Página: `/servicos/listar_faturas.html`

7. Validar documento
- HML: `POST https://sifphml.minfin.gov.ao/sigt/fe/v1/validarDocumento`
- PROD: `POST https://sifp.minfin.gov.ao/sigt/fe/v1/validarDocumento`
- Página: `/servicos/validar.html`

## Nota de consistência

Há diferenças de path `ws/v1` vs `v1` em algumas páginas de homologação. Em integração real, validar com AGT se é regra oficial ou erro documental.
