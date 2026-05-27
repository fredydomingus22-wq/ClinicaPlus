# Padrões de Erro e Correções

## 400 Bad Request

Causas comuns:
- Campo obrigatório ausente.
- Formato inválido em timestamp/NIF.
- Assinatura JWS mal formada.

Ações:
- Validar contrato por endpoint antes de enviar.
- Regenerar assinatura com payload canónico.

## 401/403

Causas comuns:
- Basic Auth inválido.
- Credenciais erradas por ambiente.

Ações:
- Confirmar segredo e rotação de credenciais.
- Revalidar permissões com AGT.

## Rejeição funcional na validação

Causas comuns:
- Regras fiscais/série/documento não conformes.

Ações:
- Consultar `obterEstado` e inspecionar lista de erros por documento.
- Corrigir origem do payload e reenviar.

## Inconsistência endpoint/doc

Causa:
- Diferença publicada entre paths (`ws/v1` vs `v1`) em algumas páginas.

Ação:
- Confirmar endpoint efetivo com AGT e parametrizar por ambiente.
