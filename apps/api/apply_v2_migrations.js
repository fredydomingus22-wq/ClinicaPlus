const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function run() {
  const schemaPath = path.join(__dirname, 'prisma/schema.prisma');
  const v2DocsPath = path.join(__dirname, '../../clinicaplus-docs-v6/05-database/DATABASE_SCHEMA_v2.md');

  let schema = fs.readFileSync(schemaPath, 'utf8');

  // Aplicar EXTENSAO de ConfiguracaoClinica (migration_005)
  if (!schema.includes('logoUrl')) {
    schema = schema.replace(
      'fusoHorario       String   @default("Africa/Luanda")',
      'fusoHorario       String   @default("Africa/Luanda")\n  logoUrl         String?\n  enderecoFatura  String?\n  nif             String?\n  iban            String?\n  faturaAuto      Boolean  @default(false)\n  corPrimaria     String?'
    );
  }

  // Extrair Models do markdown, mas ignorar a migration 001
  const v2Content = fs.readFileSync(v2DocsPath, 'utf8');
  let modelsToAppend = '';
  
  // Pegar blocs de prisma manualmente pelo nome
  const modelsWeNeed = [
    'enum EscopoApiKey', 'model ApiKey', 'model Webhook', 'model WebhookEntrega', 'model PlanoLimite',
    'model Permissao', 'model RolePermissao', 'model UtilizadorPermissao', 'model AuditLog'
  ];

  for (let modelStart of modelsWeNeed) {
    if (schema.includes(modelStart)) continue; // Ja esta la
    
    // Quick regex to extract the block
    // We look for modelStart followed by { and then everything until } at start of line or with spaces
    // Since it's markdown, it might be easier to just split by line and extract block
    let capturing = false;
    let block = '';
    for (const line of v2Content.split('\\n')) {
      if (line.startsWith(modelStart)) {
        capturing = true;
      }
      if (capturing) {
        block += line + '\\n';
        if (line.startsWith('}')) {
          capturing = false;
          modelsToAppend += '\\n' + block;
        }
      }
    }
  }

  if (modelsToAppend.length > 0) {
    fs.writeFileSync(schemaPath, schema + '\\n// --- V2 SYSTEM MODELS ---' + modelsToAppend, 'utf8');
    console.log('Modelos do V2 inseridos com sucesso!');
  } else {
    console.log('Modelos do V2 ja presentes ou erro na extracao.');
  }
}

run();
