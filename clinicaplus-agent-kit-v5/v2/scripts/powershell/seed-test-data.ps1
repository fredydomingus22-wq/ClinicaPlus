# seed-test-data.ps1 — ClinicaPlus
param([switch]$Reset)

if ($Reset) {
  Write-Host "[seed] A limpar dados de teste..."
  & npx tsx apps/api/src/seeds/reset-test.ts
}

Write-Host "[seed] A criar dados de teste..."
& npx tsx apps/api/src/seeds/test-data.seed.ts

Write-Host "[seed] $(([char]0x2713)) Concluído"
Write-Host "[seed] Credenciais de teste:"
Write-Host "  Admin:         admin@clinicateste.ao / Test1234!"
Write-Host "  Médico:        dr.carlos@clinicateste.ao / Test1234!"
Write-Host "  Recepcionista: recepcao@clinicateste.ao / Test1234!"
Write-Host "  Slug clínica:  clinica-teste"
