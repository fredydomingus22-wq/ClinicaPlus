# Plano de Migração: Odontograma + Relatórios PDF

## 1. Análise do Odontograma Atual

### Schema de Dados
```typescript
// OdontogramaMarcacao
{
  numeroDente: number (11-48)
  face: DenteFace (V, L, M, D, O, G, R)
  status: DenteStatus (SAUDAVEL, CARIE, FRATURA, TRATAMENTO_CANAL, CANAL_TRATADO, TRATADO, AUSENTE, PROTESE, DESTRUICAO)
  observacao?: string
}
```

### Componentes Atuais
- `OdontogramaSvg`: Layout das arcadas (quadrantes FDI)
- `DenteDuplaCamada`: Representação anatómica com faces clicáveis
- `ConditionSidePanel`: Painel lateral para seleção de status
- `OdontogramLegend`: Legenda de cores/estados

### Lógica de Funcionamento
1. Usuário clica em face específica do dente
2. Painel lateral mostra opções de status
3. Status selecionado é aplicado à face
4. Marcacoes são salvas com debounce (1.5s)
5. Dados persistidos em JSON no banco

## 2. Limitação do react-odontogram

**Problema**: `react-odontogram` não suporta seleção por faces nativamente.

- Seleciona dente inteiro (não faces individuais)
- Usa `teethConditions` para colorir dentes por condição
- Retorna array de teeth selecionados com notations (FDI, Universal, Palmer)

## 3. Estratégia de Migração

### 3.1 Arquitetura Híbrida

Manter a granularidade de faces usando uma abordagem híbrida:

```
┌─────────────────────────────────────────────────┐
│  ReactOdontogramWrapper (novo)                 │
│  ┌───────────────────────────────────────────┐  │
│  │  react-odontogram (base visual)          │  │
│  │  - Layout das arcadas                    │  │
│  │  - Notações FDI/Universal/Palmer         │  │
│  │  - teethConditions (status geral)       │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │  FaceOverlay (custom overlay)            │  │
│  │  - Reutiliza DenteDuplaCamada atual     │  │
│  │  - Sobreposto aos dentes selecionados   │  │
│  │  - Permite clique em faces específicas  │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### 3.2 Conversão de Dados

**Marcacoes → teethConditions**:
```typescript
function marcacoesToTeethConditions(marcacoes: OdontogramaMarcacao[]) {
  // Agrupar por dente, determinar status predominante
  // Ex: dente 18 com faces V=CARIE, L=SAUDAVEL → status geral CARIE
}
```

**teethConditions → Marcacoes**:
```typescript
function teethConditionsToMarcacoes(conditions: ToothConditionGroup[]) {
  // Preservar marcacoes existentes
  // Adicionar/actualizar status geral do dente
}
```

### 3.3 Preservação de Dados

- Schema atual permanece inalterado
- Conversão bidirecional entre formatos
- Marcacoes por faces continuam sendo armazenadas
- teethConditions usado apenas para visualização

## 4. Implementação

### Fase 1: Setup
1. Instalar `react-odontogram`
2. Criar `ReactOdontogramWrapper` component
3. Criar conversores de dados

### Fase 2: Integração
1. Atualizar `OdontogramaTab` para usar wrapper
2. Testar preservação de lógica de faces
3. Validar conversão de dados

### Fase 3: Cleanup
1. Remover componentes SVG antigos (se validado)
2. Atualizar testes
3. Documentar nova arquitetura

## 5. Relatórios PDF

### 5.1 Stack Tecnológica

**Opção A: jsPDF (client-side)**
- Vantagens: Simples, client-side, sem servidor
- Desvantagens: Limitado para layouts complexos

**Opção B: Puppeteer (server-side)**
- Vantagens: Full HTML/CSS, screenshots reais
- Desvantagens: Requer worker, mais complexo

**Recomendação**: Puppeteer para templates complexos com odontograma

### 5.2 Template Parametrizado por Tenant

```typescript
interface PdfTemplate {
  clinicaId: string;
  logo: string;
  cores: {
    primaria: string;
    secundaria: string;
    texto: string;
  };
  campos: {
    mostrarAnamnese: boolean;
    mostrarOdontograma: boolean;
    mostrarResumo: boolean;
    camposCustomizados?: Record<string, boolean>;
  };
}
```

### 5.3 Tipos de Relatórios

**Relatório de Consulta Completo**
- Logo da clínica
- Dados do paciente
- Sumário da anamnese
- Odontograma atual
- Diagnóstico/Tratamento
- Assinaturas

**Relatório de Resumo**
- Logo da clínica
- Dados do paciente
- Resumo da consulta
- Procedimentos realizados
- Recomendações

**Dossier Clínico (atualização)**
- Histórico de consultas
- Evolução do odontograma
- Documentos anexos

### 5.4 Implementação PDF

1. Criar serviço `pdf.service.ts` (API)
2. Criar templates HTML/CSS reutilizáveis
3. Endpoint `/api/pdf/consulta/:id`
4. Endpoint `/api/pdf/resumo/:id`
5. Endpoint `/api/pdf/dossier/:pacienteId`

## 6. Ordem de Implementação

1. ✅ Análise do odontograma atual
2. ⏳ Instalar react-odontogram
3. ⏳ Criar wrapper e conversores
4. ⏳ Integrar wrapper no OdontogramaTab
5. ⏳ Testar e validar
6. ⏳ Criar serviço PDF (Puppeteer)
7. ⏳ Criar templates parametrizados
8. ⏳ Implementar endpoint relatório consulta
9. ⏳ Implementar endpoint relatório resumo
10. ⏳ Atualizar dossier clínico

## 7. Riscos e Mitigações

**Risco**: Perda de granularidade de faces
**Mitigação**: Manter schema atual, usar overlay customizado

**Risco**: Performance do Puppeteer
**Mitigação**: Cache de templates, worker dedicado

**Risco**: Complexidade de templates PDF
**Mitigação**: Começar com template simples, iterar
