const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function run() {
  const schemaPath = path.join(__dirname, 'prisma/schema.prisma');
  let schema = fs.readFileSync(schemaPath, 'utf8');

  // Adicionar campos na model Paciente para associacao
  if (!schema.includes('waConversas')) {
    schema = schema.replace('documentos   Documento[]', 'documentos   Documento[]\n  waConversas WaConversa[]');
  }

  // Pegar Enums e Models do WhatsApp
  const waModels = `
// --- WHATSAPP MODELS ---
enum WaEstadoInstancia {
  DESCONECTADO
  AGUARDA_QR
  CONECTADO
  ERRO
}

enum WaTipoAutomacao {
  MARCACAO_CONSULTA
  BEM_VINDO
  LEMBRETE
  FAQ
}

enum WaEstadoConversa {
  AGUARDA_INPUT
  ESPECIALIDADE
  MEDICO
  HORARIO
  CONFIRMAR
  FINALIZADA
  ESCALADA
}

enum WaDirecao {
  IN
  OUT
}

model WaInstancia {
  id             String            @id @default(cuid())
  clinicaId      String            @unique
  evolutionName  String            @unique
  evolutionToken String?
  estado         WaEstadoInstancia @default(DESCONECTADO)
  numeroTelefone String?
  qrCodeBase64   String?
  criadoEm       DateTime          @default(now())
  atualizadoEm   DateTime          @updatedAt
  clinica        Clinica           @relation(fields: [clinicaId], references: [id])
  @@map("wa_instancias")
}

model WaAutomacao {
  id             String          @id @default(cuid())
  clinicaId      String
  tipo           WaTipoAutomacao
  ativo          Boolean         @default(false)
  n8nWebhookUrl  String?
  n8nWorkflowId  String?
  configuracao   Json?
  criadoEm       DateTime        @default(now())
  atualizadoEm   DateTime        @updatedAt
  clinica        Clinica         @relation(fields: [clinicaId], references: [id])
  @@unique([clinicaId, tipo])
  @@map("wa_automacoes")
}

model WaConversa {
  id             String           @id @default(cuid())
  clinicaId      String
  instanciaId    String
  pacienteId     String?
  numeroWhatsapp String
  estado         WaEstadoConversa @default(AGUARDA_INPUT)
  etapaFluxo     String?
  contexto       Json?
  ultimaMensagemEm DateTime?
  criadoEm       DateTime         @default(now())
  mensagens      WaMensagem[]
  paciente       Paciente?         @relation(fields: [pacienteId], references: [id])
  @@unique([instanciaId, numeroWhatsapp])
  @@index([instanciaId, estado])
  @@index([pacienteId])
  @@map("wa_conversas")
}

model WaMensagem {
  id             String     @id @default(cuid())
  conversaId     String
  conversa       WaConversa @relation(fields: [conversaId], references: [id])
  direcao        WaDirecao
  conteudo       String
  tipo           String     @default("text")
  evolutionMsgId String?
  entregue       Boolean    @default(false)
  lida           Boolean    @default(false)
  criadoEm       DateTime   @default(now())
  @@index([conversaId, criadoEm])
  @@map("wa_mensagens")
}
`;

  if (!schema.includes('WaConversa {')) {
     fs.writeFileSync(schemaPath, schema + '\\n' + waModels, 'utf8');
     console.log('Modelos do WhatsApp anexados!');
  } else {
     console.log('Modelos do WhatsApp já presentes.');
  }
  
  execSync('npx prisma format', { stdio: 'inherit' });
  console.log('Formatado com sucesso!');
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('Cliente gerado com sucesso!');
}

run();
