# smoke-test.ps1 — ClinicaPlus pós-deploy
# Uso: .\smoke-test.ps1 [-BaseUrl http://...] [-Token eyJ...]
param(
  [string]$BaseUrl = "http://localhost:3000",
  [string]$Token   = $env:SMOKE_TEST_TOKEN
)

$Pass = 0; $Fail = 0
$Headers = @{ Authorization = "Bearer $Token"; "Content-Type" = "application/json" }

function Check {
  param([string]$Desc, [string]$Method, [string]$Path, [int]$Expected = 200, [string]$Body = "")
  try {
    $args = @{ Uri = "$BaseUrl$Path"; Method = $Method; Headers = $Headers; TimeoutSec = 10 }
    if ($Body) { $args.Body = $Body }
    $resp = Invoke-WebRequest @args -SkipHttpErrorCheck
    if ($resp.StatusCode -eq $Expected) {
      Write-Host "$(([char]0x2713)) $Desc ($($resp.StatusCode))" -ForegroundColor Green; $script:Pass++
    } else {
      Write-Host "$(([char]0x2717)) $Desc — esperado $Expected, recebeu $($resp.StatusCode)" -ForegroundColor Red; $script:Fail++
    }
  } catch {
    Write-Host "$(([char]0x2717)) $Desc — erro: $($_.Exception.Message)" -ForegroundColor Red; $script:Fail++
  }
}

Write-Host "`n════════════════════════════════════"
Write-Host " ClinicaPlus Smoke Test — $BaseUrl"
Write-Host "════════════════════════════════════"

Write-Host "`n[Core]"
Check "Health endpoint"           GET  "/health"
Check "Listar agendamentos"       GET  "/api/agendamentos"

Write-Host "`n[Financeiro]"
Check "Listar faturas"            GET  "/api/faturas"

Write-Host "`n[Subscrições]"
Check "Subscrição actual"         GET  "/api/subscricoes/actual"
Check "Uso actual"                GET  "/api/subscricoes/uso"

Write-Host "`n[WhatsApp]"
$waResp = Invoke-WebRequest "$BaseUrl/api/whatsapp/instancias/estado" `
  -Headers $Headers -SkipHttpErrorCheck -TimeoutSec 10
if ($waResp.StatusCode -in @(200, 402)) {
  Write-Host "$(([char]0x2713)) WhatsApp estado ($($waResp.StatusCode))" -ForegroundColor Green; $Pass++
} else {
  Write-Host "$(([char]0x2717)) WhatsApp estado — inesperado: $($waResp.StatusCode)" -ForegroundColor Red; $Fail++
}

Write-Host "`n════════════════════════════════════"
Write-Host " $(([char]0x2713)) $Pass passaram  $(([char]0x2717)) $Fail falharam"
Write-Host "════════════════════════════════════`n"
exit $(if ($Fail -gt 0) { 1 } else { 0 })
