param(
  [string]$EnvFile = ".env"
)

Write-Host "[AGT FE] Verificar ambiente"
if (-not (Test-Path $EnvFile)) {
  Write-Error "Ficheiro $EnvFile não encontrado"
  exit 1
}

$content = Get-Content $EnvFile -Raw
$required = @("AGT_FE_BASE_URL","AGT_FE_USERNAME","AGT_FE_PASSWORD","AGT_FE_TAX_REG_NUMBER")
$missing = @()
foreach ($k in $required) {
  if ($content -notmatch "(?m)^$k=") { $missing += $k }
}

if ($missing.Count -gt 0) {
  Write-Error ("Variáveis ausentes: " + ($missing -join ", "))
  exit 2
}
Write-Host "OK: variáveis mínimas encontradas"
