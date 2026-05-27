# Análise Mobile e Acessibilidade - ClinicaPlus

## Data: 25/05/2026
## Objetivo: Garantir experiência mobile consistente em todas as páginas

---

## 1. Melhores Práticas UI/UX Mobile (Baseado em UI/UX Pro Max)

### Touch Targets (CRITICAL)
- **Mínimo 44×44px** para elementos clicáveis (iOS) / 48×48dp (Android)
- **Gap mínimo 8px** entre elementos tocáveis adjacentes
- **Evitar**: botões pequenos (w-6 h-6), elementos muito próximos

### Layout Responsivo
- **Mobile-first**: começar com estilos mobile, adicionar breakpoints (md:, lg:, xl:)
- **Viewport meta**: `width=device-width initial-scale=1` (já deve estar configurado)
- **Horizontal scroll**: evitar em mobile principal
- **Overflow-x-auto**: para tabelas e listas largas

### Performance Mobile
- **Touch-action: manipulation** para reduzir delay de 300ms
- **Overscroll-behavior: contain** onde não é necessário pull-to-refresh
- **Lazy loading** para componentes pesados

### Acessibilidade
- **Contraste 4.5:1** para texto normal
- **Aria-labels** em botões com ícones apenas
- **Navegação por teclado** (Tab order)
- **Focus states** visíveis (2-4px)

---

## 2. Estado Atual - Análise de Páginas

### Páginas Analisadas

#### GestaoTratamentosPage.tsx
**Status**: ✅ BOM
- Usa `flex-col lg:flex-row` para filtros (responsivo)
- Inputs com altura h-10 (touch-friendly)
- Botões com tamanho adequado
- **Melhoria possível**: Adicionar `overflow-x-auto` na tabela para mobile

#### GestaoExamesPage.tsx
**Status**: ✅ BOM
- Padrão similar a GestaoTratamentos
- Layout responsivo com `md:flex-row`
- **Melhoria possível**: Overflow em tabela

#### PerfilPage.tsx
**Status**: ✅ BOM
- Usa `grid-cols-1 lg:grid-cols-3`
- `md:flex-row` em várias seções
- **Melhoria possível**: Padding bottom ajustado para mobile

#### ServicosPrecosPage.tsx
**Status**: ⚠️ PRECISA REVISÃO
- Tabs funcionam bem
- **Problema**: Tabela sem overflow-x-auto pode quebrar layout mobile

#### CatalogoPage.tsx (Inventário)
**Status**: ⚠️ PRECISA REVISÃO
- Tabela de produtos pode ser muito larga
- **Necessário**: `overflow-x-auto` wrapper na tabela

---

## 3. Componentes de Odontograma - Estado Atual

### Componentes Existentes
1. **ReactOdontogramWrapper** - Wrapper para react-odontogram (visualização/PDF)
2. **OdontogramaTab** - Tab principal com edição de faces
3. **FaceOverlay** - Overlay para seleção de faces (posicionamento percentual)
4. **OdontogramLegend** - Legenda de cores
5. **DenteDuplaCamada** - Representação visual de dente com faces
6. **ConditionSidePanel** - Painel lateral para seleção de condições

### Problemas Mobile Identificados

#### FaceOverlay.tsx
- **Problema CRÍTICO**: Posicionamento percentual hardcoded não escala bem em mobile
- **Touch targets**: 40×40px é borderline (recomendado 44×44px)
- **Overlay absoluto**: pode não funcionar bem em scroll horizontal

#### OdontogramaTab.tsx
- **Layout**: `flex-col lg:flex-row` - bom para desktop
- **Problema**: Em mobile, o painel lateral (ConditionSidePanel) fica abaixo do odontograma
- **Touch**: Botões de seleção de face podem ser pequenos

#### ReactOdontogramWrapper
- **react-odontogram**: biblioteca externa, verificar responsividade
- **Container**: `p-4` pode ser insuficiente em mobile
- **Necessário**: Testar em viewport pequeno (375px)

---

## 4. Plano de Melhoria Mobile

### Fase 1: Correções Críticas (Imediato)

#### 4.1. Tabelas com Overflow
**Arquivos afetados**: Todas as páginas com Table
- Adicionar wrapper `overflow-x-auto` em todas as tabelas
- Exemplo:
```tsx
<div className="overflow-x-auto -mx-4 px-4">
  <Table ... />
</div>
```

#### 4.2. Touch Targets em Odontograma
**Arquivo**: `FaceOverlay.tsx`
- Aumentar de 40×40px para 48×48px
- Adicionar `touch-action: manipulation`

#### 4.3. Sidebar em Mobile
**Arquivo**: `Sidebar.tsx`
- Verificar se sidebar é collapsible em mobile
- Garantir que não bloqueia conteúdo

### Fase 2: Página de Odontogramas (Prioridade)

#### 4.4. Criar OdontogramasPage.tsx
**Funcionalidades**:
- Lista de odontogramas por paciente
- Filtros: paciente, data, tipo de tratamento
- Visualização com react-odontogram (read-only)
- Link para edição detalhada (ConsultaPage)

**Layout Mobile**:
- Header com filtros empilhados
- Cards para cada odontograma (em vez de tabela)
- Cada card mostra: paciente, data, mini-odongrama, status
- Swipe actions para ações rápidas

#### 4.5. Melhorar OdontogramaTab para Mobile
**Alterações**:
- Em mobile: ConditionSidePanel vira bottom sheet/modal
- Odontograma com zoom/pan em mobile
- Touch targets aumentados
- Legendas colapsáveis

### Fase 3: Padrões Globais

#### 4.6. Criar Componentes Reutilizáveis
- `MobileTableWrapper` - wrapper com overflow-x-auto
- `MobileCard` - card padrão para listas mobile
- `MobileFilterBar` - filtros empilhados em mobile

#### 4.7. Configuração Tailwind
- Adicionar utilitários customizados para touch targets
- Configurar breakpoints consistentes

#### 4.8. Testes E2E Mobile
- Adicionar testes Playwright para viewport mobile
- Testar navegação por teclado
- Verificar contraste em dark mode

---

## 5. Implementação - Página de Odontogramas

### Estrutura Proposta

```tsx
// OdontogramasPage.tsx
export default function OdontogramasPage() {
  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header com filtros */}
      <div className="flex flex-col md:flex-row gap-4">
        <SearchInput />
        <DateFilter />
        <TypeFilter />
      </div>

      {/* Lista de odontogramas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {odontogramas.map(odo => (
          <OdontogramaCard key={odo.id} odontograma={odo} />
        ))}
      </div>

      {/* Empty state */}
      {odontogramas.length === 0 && <EmptyState />}
    </div>
  );
}
```

### OdontogramaCard Componente

```tsx
// Mobile-first card
<div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-sm">
  <div className="flex items-start justify-between mb-3">
    <div className="flex items-center gap-3">
      <Avatar initials={paciente.nome[0]} />
      <div>
        <p className="font-semibold text-neutral-900">{paciente.nome}</p>
        <p className="text-xs text-neutral-500">{formatDate(data)}</p>
      </div>
    </div>
    <Badge variant={statusVariant}>{status}</Badge>
  </div>
  
  {/* Mini odontograma visual */}
  <div className="bg-neutral-50 rounded-lg p-3 mb-3">
    <ReactOdontogramWrapper marcacoes={marcacoes} readOnly />
  </div>
  
  {/* Actions */}
  <div className="flex gap-2">
    <Button size="sm" variant="outline" className="flex-1">
      Ver Detalhes
    </Button>
    <Button size="sm" variant="ghost">
      <MoreVertical className="h-4 w-4" />
    </Button>
  </div>
</div>
```

---

## 6. Checklist de Validação

### Antes de Implementar
- [ ] Verificar viewport meta tag
- [ ] Testar react-odontogram em mobile (375px)
- [ ] Revisar todas as tabelas para overflow

### Durante Implementação
- [ ] Usar mobile-first approach
- [ ] Touch targets ≥44×44px
- [ ] Gap ≥8px entre elementos tocáveis
- [ ] Contrast ratio ≥4.5:1
- [ ] Aria-labels em botões com ícones

### Após Implementação
- [ ] Testar em 375px (iPhone SE)
- [ ] Testar em 768px (tablet portrait)
- [ ] Testar navegação por teclado
- [ ] Testar dark mode
- [ ] Testar landscape orientation

---

## 7. Navegação Mobile - Estado Atual

### Problemas Identificados

#### Sidebar.tsx
- **Estado**: `hidden md:flex` - sidebar completamente oculta em mobile
- **Problema**: Sem acesso à navegação completa em mobile
- **Touch targets**: Botões têm `px-3 py-2` (≈32px altura) - abaixo do mínimo 44px

#### AppLayout.tsx - Bottom Navigation
- **Estado**: Bottom nav existe (`md:hidden fixed bottom-0`)
- **Problemas**:
  - Mostra apenas 5 itens com `priority: true`
  - Sem acesso a itens sem priority
  - Botão primário central pode ser difícil de alcançar em telas grandes
- **Touch targets**: `h-14` (56px) - OK
- **Spacing**: Gap entre itens parece adequado

#### TopBar.tsx
- **Estado**: Logo mobile existe, mas TopNav escondido em mobile
- **Problema**: Sem menu hamburger para acessar navegação completa
- **Breadcrumb**: Truncado em mobile (`max-w-[80px]`)

### Soluções Propostas

#### Opção 1: Menu Hamburger + Drawer (Recomendado)
- Adicionar botão hamburger no TopBar (mobile only)
- Criar MobileDrawer com navegação completa
- Manter bottom nav para itens priority
- Touch targets: 48×48px mínimo

#### Opção 2: Expandir Bottom Navigation
- Adicionar scroll horizontal no bottom nav
- Mostrar mais que 5 itens
- Adicionar indicador de scroll
- Menos ideal para UX

#### Opção 3: Hybrid Approach
- Bottom nav para 4-5 itens principais
- Menu hamburger para "Mais"
- Drawer com navegação completa

### Touch Targets Necessários

**Sidebar/Drawer Mobile:**
- Items de navegação: `min-h-[48px]`
- Botões de ação: `min-h-[44px]`
- Gap entre itens: `gap-1` (4px) mínimo

**Bottom Navigation:**
- Atualmente: `h-14` (56px) - OK
- Ícones: já têm tamanho adequado
- Labels: `text-[9px]` - OK

## 8. Próximos Passos

1. ✅ **Implementar OdontogramasPage** com cards mobile-first
2. ✅ **Adicionar overflow-x-auto** em todas as tabelas
3. ✅ **Melhorar FaceOverlay** para mobile (touch targets)
4. ⏳ **Criar menu hamburger + drawer mobile** para navegação completa
5. ⏳ **Ajustar touch targets** em sidebar/drawer mobile
6. ⏳ **Testes E2E** para mobile
