$file = 'prisma/schema.prisma'
$lines = Get-Content $file

# Inject into Clinica — after movimentacoesEstoque line
$out = @()
for ($i = 0; $i -lt $lines.Length; $i++) {
  $out += $lines[$i]
  if ($lines[$i] -match 'movimentacoesEstoque' -and $lines[$i+1] -match '^\s*$') {
    $out += '  anamneses           Anamnese[]'
  }
  # Inject into Paciente — after planosTratamento
  if ($lines[$i] -match 'planosTratamento  PlanoTratamento') {
    $out += '  anamneses      Anamnese[]'
  }
  # Inject into Medico — after planosTratamento PlanoTratamento[]
  if ($lines[$i] -match 'planosTratamento PlanoTratamento\[\]') {
    $out += '  anamneses       Anamnese[]'
  }
  # Inject into Agendamento — after receita        Receita?
  if ($lines[$i] -match 'receita        Receita\?') {
    $out += '  anamnese       Anamnese?'
  }
}

Set-Content $file $out -Encoding UTF8
Write-Host 'Schema patched.'
