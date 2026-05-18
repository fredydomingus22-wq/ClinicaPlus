# Exportação SAF-T AO (Angola)

O software deve permitir a geração de um ficheiro XML no formato Standard Audit File for Tax (SAF-T AO) para auditoria tributária.

## Estrutura do Ficheiro

### 1. Header (Cabeçalho)
- `SoftwareCertificateNumber`: O número de certificação atribuído pela AGT à ClinicaPlus.
- `FiscalYear`: Ano a que se reportam os dados.
- `CompanyID`, `TaxRegistrationNumber` (NIF da Clínica).

### 2. MasterFiles (Dados Base)
- `GeneralLedgerAccounts`: Plano de contas (se aplicável).
- `Customers`: Cadastro de pacientes (NIF, Nome, Morada).
- `Products`: Catálogo de serviços/medicamentos (Código, Descrição, UN).
- `TaxTable`: Tabela de impostos definida no motor de cálculo.

### 3. SourceDocuments (Documentos de Origem)
- `SalesInvoices`: O coração do SAF-T. Contém todas as facturas, notas de crédito e débito.
- `Payments`: Registos de recebimentos (Recibos).

## Requisitos Críticos de Dados
- **Endereços Completo**: Morada, Cidade, Província são obrigatórios para o SAF-T.
- **NIF Válido**: O SAF-T valida o formato do NIF (9 dígitos).
- **Audit File Generation**: O ficheiro deve ser gerado mensalmente e estar disponível para exportação pelo utilizador.
