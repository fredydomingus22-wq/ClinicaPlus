# Configuração AGT (Facturação Electrónica)

## Visão Geral

O sistema ClinicaPlus integra com a AGT (Autoridade Tributária de Angola) para emissão de facturas electrónicas. A integração usa um worker BullMQ (`report-agt`) que processa as faturas assíncronamente.

## Fluxo de Emissão

1. **API**: Ao emitir uma fatura, o sistema:
   - Gera o hash fiscal RSA-2048
   - Cria o snapshot fiscal
   - Adiciona job à fila `reportAgtQueue`

2. **Worker**: O worker `report-agt`:
   - Busca a fatura e snapshot
   - Constrói payload AGT
   - Assina com chave RSA
   - Envia para API AGT
   - Atualiza status da fatura

## Variáveis de Ambiente Necessárias

### Apps/API e Apps/Worker

```bash
# Ambiente AGT
AGT_ENV=sandbox  # ou production

# Credenciais AGT (Basic Auth)
# Solicitar a: produtores.dfe.dcrr.agt@minfin.gov.ao
AGT_USERNAME=seu_username_agt
AGT_PASSWORD=sua_password_agt

# Chaves RSA (obtidas na certificação AGT)
AGT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."
AGT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n..."

# Identificação do software (certificação AGT)
AGT_PRODUCT_ID=DocAgen
AGT_PRODUCT_VERSION=1.0.0
AGT_SOFTWARE_CERTIFICATE=seu_certificado_jws

# Código EAC da actividade
AGT_EAC_CODE=86201

# Mock mode (desenvolvimento)
AGT_MOCK=true  # Em produção, remover ou setar false
```

## Dados da Clínica

A clínica precisa ter os seguintes dados fiscais configurados no banco:

- `nif` - Número de Identificação Fiscal
- `razaoSocial` - Razão Social
- `enderecoPostal` - Endereço para SAF-T
- `cidade` - Cidade
- `provincia` - Província
- `agtPrivateKey` - Chave privada do contribuinte (encriptada)
- `agtPublicKey` - Chave pública do contribuinte (encriptada)
- `serieDocFiscal` - Série documental (ex: CPLS)

## Troubleshooting

### Job falha com "Falha crítica no reporte à AGT"

Verifique:
1. Env vars AGT configuradas em ambos API e Worker
2. Credenciais AGT_USERNAME/AGT_PASSWORD válidas
3. Chaves RSA configuradas
4. Dados fiscais da clínica completos
5. AGT_MOCK=false em produção

### Fatura não é enviada para AGT

Verifique:
1. Worker está rodando? (logs devem mostrar "Worker is running")
2. Redis está conectado?
3. Fatura tem `fiscalHash` gerado?
4. Fatura tem `snapshot` criado?

### Erro 400 da AGT

Verifique:
1. Payload está completo (todos os campos obrigatórios)
2. Assinatura RSA válida
3. NIF do emitente e cliente corretos
4. Valores monetários no formato correto

## URLs da API AGT

- **Sandbox**: `https://sifphml.minfin.gov.ao/sigt/fe/ws/v1`
- **Produção**: `https://sifp.minfin.gov.ao/sigt/fe/v1`

## Contacto AGT

Para credenciais e suporte:
- Email: produtores.dfe.dcrr.agt@minfin.gov.ao
