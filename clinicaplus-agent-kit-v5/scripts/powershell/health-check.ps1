# health-check.ps1 — ClinicaPlus
# Uso: .\health-check.ps1 [-Env dev|staging|prod]
# Exit: 0 = tudo OK, 1 = alguma falha
param([string]$Env = "dev")

$Pass = 0; $Fail = 0; $Warn = 0

function Ok   { param($msg) Write-Host "$(([char]0x2713)) $msg" -ForegroundColor Green;  $script:Pass++ }
function Fail { param($msg) Write-Host "$(([char]0x2717)) $msg" -ForegroundColor Red;    $script:Fail++ }
function Warn { param($msg) Write-Host "$(([char]0x26A0)) $msg" -ForegroundColor Yellow; $script:Warn++ }

Write-Host "`n══════════════════════════════════"
Write-Host " ClinicaPlus Health Check — $Env"
Write-Host "══════════════════════════════════"

$ApiUrl = $env:API_URL ?? "http://localhost:3000"
$EvoUrl = $env:EVOLUTION_API_URL
$EvoKey = $env:EVOLUTION_API_KEY
$N8nUrl = $env:N8N_BASE_URL
$N8nKey = $env:N8N_API_KEY

# ── API ──────────────────────────────────────────────────────────────────────
Write-Host "`n[API]"
try {
  $health = Invoke-RestMethod "$ApiUrl/health" -TimeoutSec 5
  if ($health.database -eq "connected") { Ok "Database: $($health.database)" } else { Fail "Database: $($health.database)" }
  if ($health.redis -eq "connected")    { Ok "Redis: $($health.redis)" }    else { Warn "Redis: $($health.redis) (opcional)" }
} catch { Fail "API não responde em $ApiUrl/health" }

# ── Evolution API ─────────────────────────────────────────────────────────────
Write-Host "`n[Evolution API]"
if (-not $EvoUrl) {
  Warn "EVOLUTION_API_URL não configurado — a saltar"
} else {
  try {
    Invoke-RestMethod "$EvoUrl/manager/checkConnectionStatus" -Headers @{apikey=$EvoKey} -TimeoutSec 5 | Out-Null
    Ok "Evolution API responde"
    $instances = Invoke-RestMethod "$EvoUrl/instance/fetchInstances" -Headers @{apikey=$EvoKey}
    $connected = ($instances | Where-Object { $_.state -eq "open" }).Count
    Ok "Instâncias conectadas: $connected"
  } catch { Fail "Evolution API não responde em $EvoUrl" }
}

# ── n8n ───────────────────────────────────────────────────────────────────────
Write-Host "`n[n8n]"
if (-not $N8nUrl) {
  Warn "N8N_BASE_URL não configurado — a saltar"
} else {
  try {
    Invoke-RestMethod "$N8nUrl/healthz" -TimeoutSec 5 | Out-Null
    Ok "n8n responde"
    $wf = Invoke-RestMethod "$N8nUrl/api/v1/workflows?active=true" -Headers @{"X-N8N-API-KEY"=$N8nKey}
    Ok "Workflows activos: $($wf.count)"
  } catch { Fail "n8n não responde em $N8nUrl" }
}

# ── Resumo ────────────────────────────────────────────────────────────────────
Write-Host "`n══════════════════════════════════"
Write-Host " $(([char]0x2713)) $Pass  $(([char]0x2717)) $Fail  $(([char]0x26A0)) $Warn"
Write-Host "══════════════════════════════════`n"

exit $(if ($Fail -gt 0) { 1 } else { 0 })
