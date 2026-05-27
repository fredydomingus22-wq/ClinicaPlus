#!/usr/bin/env sh
set -eu
ENV_FILE="${1:-.env}"
echo "[AGT FE] Verificar ambiente"
[ -f "$ENV_FILE" ] || { echo "Erro: ficheiro $ENV_FILE não encontrado"; exit 1; }
missing=""
for k in AGT_FE_BASE_URL AGT_FE_USERNAME AGT_FE_PASSWORD AGT_FE_TAX_REG_NUMBER; do
  if ! grep -q "^${k}=" "$ENV_FILE"; then
    missing="$missing $k"
  fi
done
[ -z "$missing" ] || { echo "Variáveis ausentes:$missing"; exit 2; }
echo "OK: variáveis mínimas encontradas"
