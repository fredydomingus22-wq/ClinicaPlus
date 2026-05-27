# Segurança, Auth, JWS e Chaves

## Autenticação

- Método: Basic Authentication.
- Header: `Authorization: Basic <base64(username:password)>`.
- Página: `/api.html`.
- Contacto para credenciais: `produtores.dfe.dcrr.agt@minfin.gov.ao`.

## Assinaturas JWS

- Padrão: JWS com algoritmo `RS256`.
- Tipos:
  - `jwsSoftwareSignature`
  - `jwsDocumentSignature`
  - `jwsSignature`
- Recomendação: assinar objeto JSON canónico (sem espaços/quebras; aspas duplas).
- Página: `/estrutura.html`.

## Gestão de chaves

- RSA mínimo 2048 bits (recomendado 4096).
- Formato recomendado: PEM.
- A chave privada do produtor nunca deve ser enviada para AGT.
- Submissão da chave pública do software no portal do parceiro:
  - HML: `https://portaldoparceiro.hml.minfin.gov.ao/`
  - PROD: `https://portaldoparceiro.minfin.gov.ao/`
- Página: `/gestao.html`.
