# migrate.ps1 — ClinicaPlus
param([string]$Name = "")

Write-Host "[migrate] A validar antes de migrar..."

# Testes
$testResult = & pnpm test --run --filter=api 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host "$(([char]0x2717)) Testes falharam — migração abortada" -ForegroundColor Red
  $testResult | Write-Host
  exit 1
}
Write-Host "$(([char]0x2713)) Testes passaram" -ForegroundColor Green

# Build
& pnpm build --filter=api | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host "$(([char]0x2717)) Build falhou — migração abortada" -ForegroundColor Red
  exit 1
}
Write-Host "$(([char]0x2713)) Build compilou" -ForegroundColor Green

# Migration
if ($Name) {
  & pnpm prisma migrate dev --name $Name
} else {
  & pnpm prisma migrate deploy
}
Write-Host "$(([char]0x2713)) Migration aplicada" -ForegroundColor Green

# Seeds
Write-Host "[migrate] A correr seeds..."
& npx tsx apps/api/src/seeds/plano-limites.seed.ts
Write-Host "$(([char]0x2713)) Seeds concluídos" -ForegroundColor Green
