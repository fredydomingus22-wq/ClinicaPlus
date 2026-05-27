# Plano de Implementação: Select de Itens com Preço na Facturação

## Resumo Executivo

Implementar select de itens facturáveis com preço na facturação, com dedução automática de stock (apenas para produtos) e possibilidade de edição manual de preço. O sistema deve suportar múltiplos tipos de itens:
- **Produto:** Item ligado a um produto (auto-preenchimento, dedução de stock)
- **Tratamento:** Item ligado a TipoTratamento (auto-preenchimento, sem stock)
- **Exame:** Item ligado a TipoExameClinica (auto-preenchimento, sem stock)
- **Consulta:** Item ligado a Medico (preço da consulta, sem stock)
- **Serviço:** Item texto livre (comportamento actual, sem stock)

## Auditoria do Estado Actual

### Schema Prisma
- **ItemFatura:** Sem relação com Produto (apenas descricao livre)
- **Produto:** Tem precoVenda, taxaIva, codigoIva, motivoIsencao, gerenciaEstoque
- **TipoTratamento:** Tem preco (para tratamentos)
- **TipoExameClinica:** Tem preco (para exames)
- **Medico:** Tem preco (para consultas)
- **EstoqueLote:** Já existe gestão de stock por lote
- **MovimentacaoEstoque:** Já existe rastreio de movimentos

### Services Existentes
- `faturas.service.ts`: Cria itens com descricao/preco manual
- `produtos.service.ts`: Gestão de produtos com preços
- `estoque.service.ts`: Movimentação de stock com FIFO

### Schemas Zod
- `ItemFaturaSchema`: Descricao livre, precoUnit manual
- `FaturaCreateSchema`: Array de itens sem ligação a produtos

### Lacunas Identificadas
1. **ItemFatura** não tem campos polimórficos para ligar a diferentes tipos de itens
2. Não há lógica de auto-preenchimento a partir de Produto, Tratamento, Exame ou Consulta
3. Não há dedução automática de stock na emissão (apenas para produtos)
4. Frontend não tem select unificado de itens facturáveis

## Plano de Implementação (SDD + DDD + Clean Architecture)

### Fase 1: Schema e Contratos (SDD)

#### 1.1 Migration Prisma
**Arquivo:** `apps/api/prisma/schema.prisma`

**Alterações:**
```prisma
enum TipoItemFatura {
  PRODUTO
  TRATAMENTO
  EXAME
  CONSULTA
  SERVICO
}

model ItemFatura {
  id             String @id @default(cuid())
  faturaId       String
  tipoItem       TipoItemFatura @default(SERVICO)
  
  // Campos polimórficos (apenas um preenchido por tipo)
  produtoId      String?
  tratamentoId   String?
  exameId        String?
  medicoId       String?
  
  descricao      String
  quantidade     Int    @default(1)
  precoUnit      Int
  desconto       Int    @default(0)
  taxaIva        Float  @default(0)
  codigoIva      String @default("ISE")
  motivoIsencao  String?
  total          Int
  
  fatura         Fatura @relation(fields: [faturaId], references: [id], onDelete: Cascade)
  produto        Produto? @relation(fields: [produtoId], references: [id])
  tipoTratamento TipoTratamento? @relation(fields: [tratamentoId], references: [id])
  tipoExame      TipoExameClinica? @relation(fields: [exameId], references: [id])
  medico         Medico? @relation(fields: [medicoId], references: [id])

  @@index([produtoId])
  @@index([tratamentoId])
  @@index([exameId])
  @@index([medicoId])
  @@map("itens_fatura")
}

model Produto {
  // ... campos existentes ...
  itensFatura ItemFatura[]
}

model TipoTratamento {
  // ... campos existentes ...
  itensFatura ItemFatura[]
}

model TipoExameClinica {
  // ... campos existentes ...
  itensFatura ItemFatura[]
}

model Medico {
  // ... campos existentes ...
  itensFatura ItemFatura[]
}
```

**Comando:**
```bash
pnpm prisma migrate dev --name add_polymorphic_item_fatura
```

#### 1.2 Atualizar Schemas Zod
**Arquivo:** `packages/types/src/schemas/financial.schema.ts`

**Novo schema polimórfico:**
```typescript
export enum TipoItemFatura {
  PRODUTO = 'PRODUTO',
  TRATAMENTO = 'TRATAMENTO',
  EXAME = 'EXAME',
  CONSULTA = 'CONSULTA',
  SERVICO = 'SERVICO',
}

export const ItemFaturaSchema = z.object({
  tipoItem: z.nativeEnum(TipoItemFatura).default(TipoItemFatura.SERVICO),
  
  // Campos polimórficos
  produtoId: z.string().optional(),
  tratamentoId: z.string().optional(),
  exameId: z.string().optional(),
  medicoId: z.string().optional(),
  
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  quantidade: z.number().int().min(1).default(1),
  precoUnit: z.number().int().min(0),
  desconto: z.number().int().min(0).default(0),
  taxaIva: z.number().min(0).max(14).default(0),
  codigoIva: z.string().default('ISE'),
  motivoIsencao: z.string().optional(),
}).refine(data => {
  // Validação: pelo menos um ID deve corresponder ao tipoItem
  if (data.tipoItem === TipoItemFatura.PRODUTO && !data.produtoId) {
    return false;
  }
  if (data.tipoItem === TipoItemFatura.TRATAMENTO && !data.tratamentoId) {
    return false;
  }
  if (data.tipoItem === TipoItemFatura.EXAME && !data.exameId) {
    return false;
  }
  if (data.tipoItem === TipoItemFatura.CONSULTA && !data.medicoId) {
    return false;
  }
  // SERVICO não requer ID
  return true;
}, {
  message: "ID do item é obrigatório para o tipo selecionado",
});
```

**Novo schema unificado para select:**
```typescript
export const ItemFacturavelSelectSchema = z.object({
  id: z.string(),
  tipo: z.nativeEnum(TipoItemFatura),
  nome: z.string(),
  codigo: z.string().nullable(),
  preco: z.number(),
  taxaIva: z.number(),
  codigoIva: z.string(),
  motivoIsencao: z.string().nullable(),
  estoqueAtual: z.number().optional(), // Apenas para PRODUTO
  gerenciaEstoque: z.boolean().optional(), // Apenas para PRODUTO
});

export type ItemFacturavelSelect = z.infer<typeof ItemFacturavelSelectSchema>;
```

### Fase 2: Domain Layer (DDD)

#### 2.1 Domain Service - ItemFaturaFactory
**Arquivo:** `apps/api/src/domain/faturacao/ItemFaturaFactory.ts`

```typescript
import { TipoItemFatura } from '@clinicaplus/types';

export class ItemFaturaFactory {
  static criarFromProduto(
    produto: any,
    quantidade: number,
    precoOverride?: number
  ) {
    const precoUnit = precoOverride ?? produto.precoVenda;
    
    return {
      tipoItem: TipoItemFatura.PRODUTO,
      produtoId: produto.id,
      descricao: produto.nome,
      quantidade,
      precoUnit,
      desconto: 0,
      taxaIva: produto.taxaIva,
      codigoIva: produto.codigoIva,
      motivoIsencao: produto.motivoIsencao,
      total: precoUnit * quantidade,
    };
  }

  static criarFromTratamento(
    tratamento: any,
    quantidade: number,
    precoOverride?: number
  ) {
    const precoUnit = precoOverride ?? tratamento.preco;
    
    return {
      tipoItem: TipoItemFatura.TRATAMENTO,
      tratamentoId: tratamento.id,
      descricao: tratamento.nome,
      quantidade,
      precoUnit,
      desconto: 0,
      taxaIva: 14, // Tratamentos geralmente com IVA
      codigoIva: 'IVA',
      motivoIsencao: null,
      total: precoUnit * quantidade,
    };
  }

  static criarFromExame(
    exame: any,
    quantidade: number,
    precoOverride?: number
  ) {
    const precoUnit = precoOverride ?? exame.preco;
    
    return {
      tipoItem: TipoItemFatura.EXAME,
      exameId: exame.id,
      descricao: exame.nome,
      quantidade,
      precoUnit,
      desconto: 0,
      taxaIva: 14, // Exames geralmente com IVA
      codigoIva: 'IVA',
      motivoIsencao: null,
      total: precoUnit * quantidade,
    };
  }

  static criarFromConsulta(
    medico: any,
    quantidade: number,
    precoOverride?: number
  ) {
    const precoUnit = precoOverride ?? medico.preco;
    
    return {
      tipoItem: TipoItemFatura.CONSULTA,
      medicoId: medico.id,
      descricao: `Consulta - ${medico.nome}`,
      quantidade,
      precoUnit,
      desconto: 0,
      taxaIva: 14, // Consultas geralmente com IVA
      codigoIva: 'IVA',
      motivoIsencao: null,
      total: precoUnit * quantidade,
    };
  }

  static criarLivre(
    descricao: string,
    quantidade: number,
    precoUnit: number,
    taxConfig: { taxaIva: number; codigoIva: string; motivoIsencao?: string }
  ) {
    return {
      tipoItem: TipoItemFatura.SERVICO,
      descricao,
      quantidade,
      precoUnit,
      desconto: 0,
      taxaIva: taxConfig.taxaIva,
      codigoIva: taxConfig.codigoIva,
      motivoIsencao: taxConfig.motivoIsencao,
      total: precoUnit * quantidade,
    };
  }
}
```

#### 2.2 Domain Service - EstoqueDeductionService
**Arquivo:** `apps/api/src/domain/estoque/EstoqueDeductionService.ts`

```typescript
export class EstoqueDeductionService {
  static validarDisponibilidade(
    produto: { gerenciaEstoque: boolean },
    estoqueAtual: number,
    quantidade: number
  ): void {
    if (produto.gerenciaEstoque && estoqueAtual < quantidade) {
      throw new Error(
        `Estoque insuficiente. Disponível: ${estoqueAtual}, Solicitado: ${quantidade}`
      );
    }
  }
}
```

### Fase 3: Application Layer

#### 3.1 Use Case - AdicionarItemFacturavel
**Arquivo:** `apps/api/src/usecases/faturacao/AdicionarItemFacturavel.usecase.ts`

```typescript
import { TipoItemFatura } from '@clinicaplus/types';

export class AdicionarItemFacturavelUseCase {
  constructor(
    private produtoRepo: IProdutoRepository,
    private tratamentoRepo: ITipoTratamentoRepository,
    private exameRepo: ITipoExameRepository,
    private medicoRepo: IMedicoRepository,
    private estoqueService: EstoqueService
  ) {}

  async execute(
    clinicaId: string,
    tipoItem: TipoItemFatura,
    itemId: string,
    quantidade: number,
    precoOverride?: number
  ) {
    switch (tipoItem) {
      case TipoItemFatura.PRODUTO: {
        const produto = await this.produtoRepo.findById(clinicaId, itemId);
        if (!produto) throw new AppError('Produto não encontrado', 404);

        const estoqueAtual = await this.estoqueService.calcularEstoqueProduto(
          clinicaId,
          itemId
        );

        EstoqueDeductionService.validarDisponibilidade(
          produto,
          estoqueAtual,
          quantidade
        );

        return ItemFaturaFactory.criarFromProduto(
          produto,
          quantidade,
          precoOverride
        );
      }

      case TipoItemFatura.TRATAMENTO: {
        const tratamento = await this.tratamentoRepo.findById(clinicaId, itemId);
        if (!tratamento) throw new AppError('Tratamento não encontrado', 404);

        return ItemFaturaFactory.criarFromTratamento(
          tratamento,
          quantidade,
          precoOverride
        );
      }

      case TipoItemFatura.EXAME: {
        const exame = await this.exameRepo.findById(clinicaId, itemId);
        if (!exame) throw new AppError('Exame não encontrado', 404);

        return ItemFaturaFactory.criarFromExame(
          exame,
          quantidade,
          precoOverride
        );
      }

      case TipoItemFatura.CONSULTA: {
        const medico = await this.medicoRepo.findById(clinicaId, itemId);
        if (!medico) throw new AppError('Médico não encontrado', 404);

        return ItemFaturaFactory.criarFromConsulta(
          medico,
          quantidade,
          precoOverride
        );
      }

      default:
        throw new AppError('Tipo de item inválido', 400);
    }
  }
}
```

#### 3.2 Atualizar FaturasService
**Arquivo:** `apps/api/src/services/faturas.service.ts`

**Alterações no método `create`:**
```typescript
async create(data: z.infer<typeof FaturaCreateSchema>, clinicaId: string, criadoPor: string) {
  // ... código existente ...

  // NOVO: Processar itens polimórficos
  const itensProcessados = await Promise.all(
    data.itens.map(async (item) => {
      if (item.tipoItem === TipoItemFatura.PRODUTO && item.produtoId) {
        const produto = await prisma.produto.findFirst({
          where: { id: item.produtoId, clinicaId },
          select: {
            id: true,
            nome: true,
            precoVenda: true,
            taxaIva: true,
            codigoIva: true,
            motivoIsencao: true,
            gerenciaEstoque: true,
          },
        });

        if (!produto) throw new AppError('Produto não encontrado', 404);

        // Validar estoque se gerenciaEstoque
        if (produto.gerenciaEstoque) {
          const estoqueAtual = await estoqueCalculoService.calcularEstoqueProduto(
            clinicaId,
            produto.id
          );

          if (estoqueAtual < item.quantidade) {
            throw new AppError(
              `Estoque insuficiente para ${produto.nome}. Disponível: ${estoqueAtual}`,
              400
            );
          }
        }

        return {
          ...item,
          descricao: item.descricao || produto.nome,
          precoUnit: item.precoUnit || produto.precoVenda,
          taxaIva: item.taxaIva ?? produto.taxaIva,
          codigoIva: item.codigoIva || produto.codigoIva,
          motivoIsencao: item.motivoIsencao ?? produto.motivoIsencao,
        };
      }

      if (item.tipoItem === TipoItemFatura.TRATAMENTO && item.tratamentoId) {
        const tratamento = await prisma.tipoTratamento.findFirst({
          where: { id: item.tratamentoId, clinicaId },
          select: { id: true, nome: true, preco: true },
        });

        if (!tratamento) throw new AppError('Tratamento não encontrado', 404);

        return {
          ...item,
          descricao: item.descricao || tratamento.nome,
          precoUnit: item.precoUnit || tratamento.preco,
        };
      }

      if (item.tipoItem === TipoItemFatura.EXAME && item.exameId) {
        const exame = await prisma.tipoExameClinica.findFirst({
          where: { id: item.exameId, clinicaId },
          select: { id: true, nome: true, preco: true },
        });

        if (!exame) throw new AppError('Exame não encontrado', 404);

        return {
          ...item,
          descricao: item.descricao || exame.nome,
          precoUnit: item.precoUnit || exame.preco,
        };
      }

      if (item.tipoItem === TipoItemFatura.CONSULTA && item.medicoId) {
        const medico = await prisma.medico.findFirst({
          where: { id: item.medicoId, clinicaId },
          select: { id: true, nome: true, preco: true },
        });

        if (!medico) throw new AppError('Médico não encontrado', 404);

        return {
          ...item,
          descricao: item.descricao || `Consulta - ${medico.nome}`,
          precoUnit: item.precoUnit || medico.preco,
        };
      }

      // SERVICO - manter como está
      return item;
    })
  );

  // ... resto do código usando itensProcessados ...
}
```

**Alterações no método `emitir`:**
```typescript
async emitir(id: string, clinicaId: string, criadoPor: string) {
  // ... código existente até actualizar fatura ...

  // NOVO: Deduzir stock apenas para PRODUTO após emissão bem-sucedida
  for (const item of fatura.itens) {
    if (item.tipoItem === TipoItemFatura.PRODUTO && item.produtoId) {
      await estoqueService.movimentar(clinicaId, {
        produtoId: item.produtoId,
        quantidade: item.quantidade,
        tipo: 'VENDA',
        motivo: `Venda na fatura ${fatura.numeroFatura}`,
        documentoRef: fatura.numeroFatura,
        utilizadorId: criadoPor,
      });
    }
  }

  // ... resto do código ...
}
```

#### 3.3 Nova Rota - Listar Itens Facturáveis (Unificado)
**Arquivo:** `apps/api/src/routes/faturas.ts`

```typescript
// NOVO endpoint unificado
router.get('/itens-facturaveis', authenticate, async (req, res) => {
  const clinicaId = req.user.clinicaId;
  const { busca, tipo } = req.query;

  const itens = await faturasService.listItensFacturaveis(
    clinicaId,
    busca as string,
    tipo as TipoItemFatura
  );

  res.json(itens);
});
```

**Service method:**
**Arquivo:** `apps/api/src/services/faturas.service.ts`

```typescript
async listItensFacturaveis(
  clinicaId: string,
  busca?: string,
  tipo?: TipoItemFatura
) {
  const itens: any[] = [];

  // Produtos
  if (!tipo || tipo === TipoItemFatura.PRODUTO) {
    const produtos = await prisma.produto.findMany({
      where: {
        clinicaId,
        ativo: true,
        ...(busca ? {
          OR: [
            { nome: { contains: busca, mode: 'insensitive' } },
            { codigo: { contains: busca, mode: 'insensitive' } },
          ],
        } : {}),
      },
      select: {
        id: true,
        nome: true,
        codigo: true,
        precoVenda: true,
        taxaIva: true,
        codigoIva: true,
        motivoIsencao: true,
        gerenciaEstoque: true,
      },
      orderBy: { nome: 'asc' },
    });

    const produtoIds = produtos.map(p => p.id);
    const estoqueBatch = await estoqueCalculoService.calcularEstoqueBatch(
      clinicaId,
      produtoIds
    );

    itens.push(...produtos.map(p => ({
      id: p.id,
      tipo: TipoItemFatura.PRODUTO,
      nome: p.nome,
      codigo: p.codigo,
      preco: p.precoVenda,
      taxaIva: p.taxaIva,
      codigoIva: p.codigoIva,
      motivoIsencao: p.motivoIsencao,
      estoqueAtual: estoqueBatch[p.id] || 0,
      gerenciaEstoque: p.gerenciaEstoque,
    })));
  }

  // Tratamentos
  if (!tipo || tipo === TipoItemFatura.TRATAMENTO) {
    const tratamentos = await prisma.tipoTratamento.findMany({
      where: {
        clinicaId,
        ativo: true,
        ...(busca ? {
          OR: [
            { nome: { contains: busca, mode: 'insensitive' } },
          ],
        } : {}),
      },
      select: {
        id: true,
        nome: true,
        preco: true,
      },
      orderBy: { nome: 'asc' },
    });

    itens.push(...tratamentos.map(t => ({
      id: t.id,
      tipo: TipoItemFatura.TRATAMENTO,
      nome: t.nome,
      codigo: null,
      preco: t.preco,
      taxaIva: 14,
      codigoIva: 'IVA',
      motivoIsencao: null,
    })));
  }

  // Exames
  if (!tipo || tipo === TipoItemFatura.EXAME) {
    const exames = await prisma.tipoExameClinica.findMany({
      where: {
        clinicaId,
        ativo: true,
        ...(busca ? {
          OR: [
            { nome: { contains: busca, mode: 'insensitive' } },
          ],
        } : {}),
      },
      select: {
        id: true,
        nome: true,
        preco: true,
      },
      orderBy: { nome: 'asc' },
    });

    itens.push(...exames.map(e => ({
      id: e.id,
      tipo: TipoItemFatura.EXAME,
      nome: e.nome,
      codigo: null,
      preco: e.preco,
      taxaIva: 14,
      codigoIva: 'IVA',
      motivoIsencao: null,
    })));
  }

  // Consultas (Médicos)
  if (!tipo || tipo === TipoItemFatura.CONSULTA) {
    const medicos = await prisma.medico.findMany({
      where: {
        clinicaId,
        ativo: true,
        ...(busca ? {
          OR: [
            { nome: { contains: busca, mode: 'insensitive' } },
          ],
        } : {}),
      },
      select: {
        id: true,
        nome: true,
        preco: true,
      },
      orderBy: { nome: 'asc' },
    });

    itens.push(...medicos.map(m => ({
      id: m.id,
      tipo: TipoItemFatura.CONSULTA,
      nome: `Consulta - ${m.nome}`,
      codigo: null,
      preco: m.preco,
      taxaIva: 14,
      codigoIva: 'IVA',
      motivoIsencao: null,
    })));
  }

  return itens;
}
```

### Fase 4: Infrastructure Layer

#### 4.1 Atualizar DTOs
**Arquivo:** `packages/types/src/schemas/financial.schema.ts`

```typescript
export interface ItemFaturaDTO {
  id: string;
  faturaId: string;
  tipoItem: TipoItemFatura;
  
  // Campos polimórficos
  produtoId?: string;
  tratamentoId?: string;
  exameId?: string;
  medicoId?: string;
  
  // Dados do item relacionado (opcional, para display)
  produto?: {
    id: string;
    nome: string;
    codigo: string | null;
  };
  tipoTratamento?: {
    id: string;
    nome: string;
  };
  tipoExame?: {
    id: string;
    nome: string;
  };
  medico?: {
    id: string;
    nome: string;
  };
  
  descricao: string;
  quantidade: number;
  precoUnit: number;
  desconto: number;
  taxaIva: number;
  codigoIva: string;
  motivoIsencao?: string;
  total: number;
}
```

### Fase 5: Frontend (React + shadcn/ui)

#### 5.1 Componente - ItemFacturavelSelect
**Arquivo:** `apps/web/src/components/faturacao/ItemFacturavelSelect.tsx`

```typescript
import { useQuery } from '@tanstack/react-query';
import { Combobox } from '@clinicaplus/ui';
import { Badge } from '@clinicaplus/ui';
import type { ItemFacturavelSelect, TipoItemFatura } from '@clinicaplus/types';

interface ItemFacturavelSelectProps {
  clinicaId: string;
  value?: string;
  tipo?: TipoItemFatura;
  onChange: (item: ItemFacturavelSelect | null) => void;
  disabled?: boolean;
}

const TIPO_LABELS: Record<TipoItemFatura, string> = {
  PRODUTO: 'Produto',
  TRATAMENTO: 'Tratamento',
  EXAME: 'Exame',
  CONSULTA: 'Consulta',
  SERVICO: 'Serviço',
};

const TIPO_COLORS: Record<TipoItemFatura, string> = {
  PRODUTO: 'bg-blue-100 text-blue-800',
  TRATAMENTO: 'bg-purple-100 text-purple-800',
  EXAME: 'bg-green-100 text-green-800',
  CONSULTA: 'bg-orange-100 text-orange-800',
  SERVICO: 'bg-gray-100 text-gray-800',
};

export function ItemFacturavelSelect({ 
  clinicaId, 
  value, 
  tipo, 
  onChange, 
  disabled 
}: ItemFacturavelSelectProps) {
  const { data: itens, isLoading } = useQuery({
    queryKey: ['itens-facturaveis', clinicaId, tipo],
    queryFn: async () => {
      const params = new URLSearchParams({ clinicaId });
      if (tipo) params.append('tipo', tipo);
      const res = await fetch(`/api/faturas/itens-facturaveis?${params}`);
      return res.json() as Promise<ItemFacturavelSelect[]>;
    },
  });

  return (
    <Combobox
      options={itens || []}
      value={value}
      onChange={onChange}
      getLabel={(item) => item.nome}
      getSubtitle={(item) => {
        const preco = formatCurrency(item.preco);
        const estoque = item.tipo === 'PRODUTO' 
          ? `· ${item.estoqueAtual} un.` 
          : '';
        return `${preco} ${estoque}`;
      }}
      getBadge={(item) => (
        <Badge className={TIPO_COLORS[item.tipo]}>
          {TIPO_LABELS[item.tipo]}
        </Badge>
      )}
      disabled={disabled}
      loading={isLoading}
      placeholder="Seleccionar item..."
      emptyMessage="Nenhum item encontrado"
    />
  );
}
```

#### 5.2 Componente - ItemFaturaForm
**Arquivo:** `apps/web/src/components/faturacao/ItemFaturaForm.tsx`

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ItemFaturaSchema, TipoItemFatura } from '@clinicaplus/types';
import { ItemFacturavelSelect } from './ItemFacturavelSelect';
import { Input, Select } from '@clinicaplus/ui';

interface ItemFaturaFormProps {
  clinicaId: string;
  onSubmit: (item: z.infer<typeof ItemFaturaSchema>) => void;
}

export function ItemFaturaForm({ clinicaId, onSubmit }: ItemFaturaFormProps) {
  const form = useForm({
    resolver: zodResolver(ItemFaturaSchema),
    defaultValues: {
      tipoItem: TipoItemFatura.SERVICO,
      quantidade: 1,
      desconto: 0,
    },
  });

  const tipoItem = form.watch('tipoItem');
  const itemId = form.watch('produtoId') || form.watch('tratamentoId') || 
                 form.watch('exameId') || form.watch('medicoId');

  // Auto-preencher quando item seleccionado
  const handleItemChange = (item: ItemFacturavelSelect | null) => {
    if (!item) {
      // Limpar todos os IDs
      form.setValue('produtoId', undefined);
      form.setValue('tratamentoId', undefined);
      form.setValue('exameId', undefined);
      form.setValue('medicoId', undefined);
      form.setValue('descricao', '');
      return;
    }

    // Definir tipoItem
    form.setValue('tipoItem', item.tipo);

    // Definir ID correspondente
    switch (item.tipo) {
      case TipoItemFatura.PRODUTO:
        form.setValue('produtoId', item.id);
        break;
      case TipoItemFatura.TRATAMENTO:
        form.setValue('tratamentoId', item.id);
        break;
      case TipoItemFatura.EXAME:
        form.setValue('exameId', item.id);
        break;
      case TipoItemFatura.CONSULTA:
        form.setValue('medicoId', item.id);
        break;
    }

    // Auto-preencher campos
    form.setValue('descricao', item.nome);
    form.setValue('precoUnit', item.preco);
    form.setValue('taxaIva', item.taxaIva);
    form.setValue('codigoIva', item.codigoIva);
    form.setValue('motivoIsencao', item.motivoIsencao || undefined);
  };

  // Limpar IDs quando tipo muda para SERVICO
  const handleTipoChange = (novoTipo: TipoItemFatura) => {
    if (novoTipo === TipoItemFatura.SERVICO) {
      form.setValue('produtoId', undefined);
      form.setValue('tratamentoId', undefined);
      form.setValue('exameId', undefined);
      form.setValue('medicoId', undefined);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-2">
          <Select
            {...form.register('tipoItem', { valueAsNumber: true })}
            onChange={(e) => handleTipoChange(e.target.value as TipoItemFatura)}
          >
            <option value={TipoItemFatura.PRODUTO}>Produto</option>
            <option value={TipoItemFatura.TRATAMENTO}>Tratamento</option>
            <option value={TipoItemFatura.EXAME}>Exame</option>
            <option value={TipoItemFatura.CONSULTA}>Consulta</option>
            <option value={TipoItemFatura.SERVICO}>Serviço</option>
          </Select>
        </div>

        {tipoItem !== TipoItemFatura.SERVICO && (
          <div className="col-span-5">
            <ItemFacturavelSelect
              clinicaId={clinicaId}
              tipo={tipoItem}
              value={itemId}
              onChange={handleItemChange}
            />
          </div>
        )}
        
        <div className={tipoItem === TipoItemFatura.SERVICO ? 'col-span-7' : 'col-span-4'}>
          <Input
            {...form.register('descricao')}
            placeholder="Descrição"
            disabled={tipoItem !== TipoItemFatura.SERVICO && !!itemId}
          />
        </div>

        <div className="col-span-1">
          <Input
            type="number"
            {...form.register('quantidade', { valueAsNumber: true })}
            placeholder="Qtd"
          />
        </div>

        <div className="col-span-2">
          <Input
            type="number"
            {...form.register('precoUnit', { valueAsNumber: true })}
            placeholder="Preço"
            prefix="Kz"
          />
        </div>
      </div>
    </form>
  );
}
```

### Fase 6: Testes (TDD)

#### 6.1 Unit Tests - FaturasService
**Arquivo:** `apps/api/src/__tests__/services/faturas.produtos.test.ts`

```typescript
describe('FaturasService - Integração com Produtos', () => {
  describe('create com produtoId', () => {
    it('deve criar item com dados do produto quando produtoId fornecido', async () => {
      // Arrange
      const produto = await createTestProduto({ precoVenda: 5000 });
      const input = {
        pacienteId: 'paciente-1',
        itens: [{
          produtoId: produto.id,
          quantidade: 2,
          precoUnit: 5000,
        }],
      };

      // Act
      const fatura = await faturasService.create(input, clinicaId, userId);

      // Assert
      expect(fatura.itens[0].produtoId).toBe(produto.id);
      expect(fatura.itens[0].descricao).toBe(produto.nome);
      expect(fatura.itens[0].taxaIva).toBe(produto.taxaIva);
    });

    it('deve permitir override de preço quando produtoId fornecido', async () => {
      // Arrange
      const produto = await createTestProduto({ precoVenda: 5000 });
      const input = {
        pacienteId: 'paciente-1',
        itens: [{
          produtoId: produto.id,
          quantidade: 1,
          precoUnit: 4500, // Preço diferente
        }],
      };

      // Act
      const fatura = await faturasService.create(input, clinicaId, userId);

      // Assert
      expect(fatura.itens[0].precoUnit).toBe(4500);
    });

    it('deve rejeitar quando estoque insuficiente', async () => {
      // Arrange
      const produto = await createTestProduto({ 
        gerenciaEstoque: true,
        estoqueMinimo: 10 
      });
      await createEstoqueLote(produto.id, 5); // Apenas 5 unidades

      const input = {
        pacienteId: 'paciente-1',
        itens: [{
          produtoId: produto.id,
          quantidade: 10, // Pede 10, tem 5
        }],
      };

      // Act & Assert
      await expect(
        faturasService.create(input, clinicaId, userId)
      ).rejects.toThrow('Estoque insuficiente');
    });

    it('deve ignorar validação de estoque quando gerenciaEstoque=false', async () => {
      // Arrange
      const produto = await createTestProduto({ 
        gerenciaEstoque: false 
      });

      const input = {
        pacienteId: 'paciente-1',
        itens: [{
          produtoId: produto.id,
          quantidade: 1000, // Quantidade arbitrária
        }],
      };

      // Act
      const fatura = await faturasService.create(input, clinicaId, userId);

      // Assert
      expect(fatura.itens[0].quantidade).toBe(1000);
    });
  });

  describe('emitir com dedução de stock', () => {
    it('deve deduzir do stock quando fatura emitida com produtoId', async () => {
      // Arrange
      const produto = await createTestProduto({ gerenciaEstoque: true });
      await createEstoqueLote(produto.id, 10);
      
      const fatura = await createFaturaRascunho({
        itens: [{
          produtoId: produto.id,
          quantidade: 3,
        }],
      });

      // Act
      await faturasService.emitir(fatura.id, clinicaId, userId);

      // Assert
      const estoqueFinal = await estoqueCalculoService.calcularEstoqueProduto(
        clinicaId,
        produto.id
      );
      expect(estoqueFinal).toBe(7); // 10 - 3
    });

    it('deve registar movimentação VENDA com referencia da fatura', async () => {
      // Arrange
      const produto = await createTestProduto({ gerenciaEstoque: true });
      await createEstoqueLote(produto.id, 10);
      
      const fatura = await createFaturaRascunho({
        itens: [{
          produtoId: produto.id,
          quantidade: 2,
        }],
      });

      // Act
      await faturasService.emitir(fatura.id, clinicaId, userId);

      // Assert
      const movimentacao = await prisma.movimentacaoEstoque.findFirst({
        where: {
          produtoId: produto.id,
          tipo: 'VENDA',
          documentoRef: fatura.numeroFatura,
        },
      });
      expect(movimentacao).toBeDefined();
      expect(movimentacao?.quantidade).toBe(2);
    });

    it('não deve deduzir stock quando produtoId ausente (modo livre)', async () => {
      // Arrange
      const fatura = await createFaturaRascunho({
        itens: [{
          descricao: 'Serviço avulso',
          quantidade: 1,
          precoUnit: 5000,
        }],
      });

      // Act
      await faturasService.emitir(fatura.id, clinicaId, userId);

      // Assert - não deve haver movimentações
      const movimentacoes = await prisma.movimentacaoEstoque.count({
        where: { documentoRef: fatura.numeroFatura },
      });
      expect(movimentacoes).toBe(0);
    });
  });
});
```

#### 6.2 Integration Tests - Endpoint Produtos Select
**Arquivo:** `apps/api/src/__tests__/routes/inventory.select.test.ts`

```typescript
describe('GET /api/inventory/produtos/select', () => {
  it('deve listar produtos com estoque actual', async () => {
    // Arrange
    const produto = await createTestProduto();
    await createEstoqueLote(produto.id, 15);

    // Act
    const res = await request(app)
      .get('/api/inventory/produtos/select')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // Assert
    expect(res.body.data[0]).toMatchObject({
      id: produto.id,
      nome: produto.nome,
      estoqueAtual: 15,
    });
  });

  it('deve filtrar por busca', async () => {
    // Arrange
    await createTestProduto({ nome: 'Paracetamol' });
    await createTestProduto({ nome: 'Ibuprofeno' });

    // Act
    const res = await request(app)
      .get('/api/inventory/produtos/select?busca=para')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // Assert
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].nome).toBe('Paracetamol');
  });
});
```

#### 6.3 E2E Tests - Frontend
**Arquivo:** `apps/web/e2e/faturacao-produtos.spec.ts`

```typescript
test('fluxo completo: seleccionar produto, editar preço, emitir fatura', async ({ page }) => {
  // Login
  await page.goto('/faturacao/nova');
  await page.fill('[name="pacienteId"]', 'paciente-1');

  // Selecionar produto
  await page.click('[data-testid="produto-select"]');
  await page.fill('[data-testid="produto-search"]', 'Paracetamol');
  await page.click('text=Paracetamol 500mg');

  // Verificar auto-preenchimento
  await expect(page.locator('[name="descricao"]')).toHaveValue('Paracetamol 500mg');
  await expect(page.locator('[name="precoUnit"]')).toHaveValue('500');

  // Editar preço
  await page.fill('[name="precoUnit"]', '450');

  // Adicionar item
  await page.click('text=Adicionar Item');

  // Emitir fatura
  await page.click('text=Emitir Fatura');

  // Verificar sucesso
  await expect(page.locator('text=Fatura emitida com sucesso')).toBeVisible();
});
```

## Ordem de Implementação

1. **Migration Prisma** (Fase 1.1)
2. **Atualizar Schemas Zod** (Fase 1.2)
3. **Domain Services** (Fase 2)
4. **Use Cases** (Fase 3.1)
5. **Atualizar FaturasService** (Fase 3.2)
6. **Novo Endpoint Produtos Select** (Fase 3.3)
7. **Atualizar DTOs** (Fase 4.1)
8. **Frontend Components** (Fase 5)
9. **Testes Unit** (Fase 6.1) - TDD: escrever antes de implementar
10. **Testes Integration** (Fase 6.2)
11. **Testes E2E** (Fase 6.3)

## Regras de Negocio

1. **Auto-preenchimento:** Quando um item é seleccionado (Produto, Tratamento, Exame ou Consulta), descricao, precoUnit, taxaIva, codigoIva e motivoIsencao são preenchidos automaticamente
2. **Override de preço:** O preço pode sempre ser editado manualmente, independentemente do tipo de item
3. **Validação de stock:** Apenas valida stock para PRODUTOS se `produto.gerenciaEstoque = true`. Tratamentos, Exames e Consultas não têm validação de stock
4. **Dedução de stock:** Ocorre apenas na emissão da fatura (não no rascunho) e apenas para PRODUTOS
5. **Modo livre (SERVICO):** Se tipoItem = SERVICO, comportamento actual (sem validação de stock, sem auto-preenchimento)
6. **Rollback:** Se emissão falhar, stock não é deduzido (transaction)
7. **Campos fiscais:** Tratamentos, Exames e Consultas usam IVA padrão (14%) e código IVA 'IVA' por defeito, mas podem ser editados

## Considerações Fiscais (AGT)

- ItemFatura mantém todos os campos fiscais (taxaIva, codigoIva, motivoIsencao)
- Quando produtoId presente, usa configuração fiscal do produto
- Override de preço não afecta campos fiscais (apenas valor monetário)
- Dedução de stock é operacional, não fiscal

## Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Stock negativo por race condition | Usar transaction com isolation level Serializable |
| Produto inactivo seleccionado | Validar produto.ativo = true no endpoint |
| Preço override não autorizado | Adicionar permissão `fatura:editar_preco` |
| Performance com muitos produtos | Paginação no select (debounce + 50 itens) |
| Regressão em facturas existentes | produtoId é opcional, migração backward compatible |

## Critérios de Aceite

- [ ] Select de produtos funcional com busca
- [ ] Auto-preenchimento de campos ao seleccionar produto
- [ ] Preço editável mesmo com produto seleccionado
- [ ] Validação de stock quando gerenciaEstoque=true
- [ ] Dedução automática de stock na emissão
- [ ] Modo livre continua funcional (sem produtoId)
- [ ] Testes unitários passando (coverage > 80%)
- [ ] Testes integration passando
- [ ] Testes E2E passando
- [ ] Documentação actualizada
