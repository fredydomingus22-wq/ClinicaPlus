# Referência: Padrões de UI — Faturação Fiscal

## Hierarquia de páginas

```
/admin/configuracao/fiscal                ← ConfiguracaoFiscalPage
/admin/financeiro                          ← FaturasPage (lista)
  └── /admin/financeiro/:id                ← FaturaDetalhePage
        ├── Preview A4                     ← FaturaPreview (print)
        ├── Modal: Registar Pagamento      ← PagamentoModal
        └── Dialog: Anular (NC)            ← AnularFaturaDialog
```

---

## Badges de Estado (Fatura)

```tsx
const FATURA_ESTADO_STYLES: Record<EstadoFatura, string> = {
  RASCUNHO: 'bg-neutral-100 text-neutral-600 border border-neutral-200',
  EMITIDA:  'bg-blue-100 text-blue-700',
  PAGA:     'bg-green-100 text-green-700',
  ANULADA:  'bg-red-50 text-red-600 line-through decoration-red-200',
}

function FaturaEstadoBadge({ estado }: { estado: EstadoFatura }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${FATURA_ESTADO_STYLES[estado]}`}>
      {estado === 'RASCUNHO' ? 'Rascunho' :
       estado === 'EMITIDA' ? 'Emitida' :
       estado === 'PAGA' ? 'Paga' : 'Anulada'}
    </span>
  )
}
```

---

## Formatação de Moeda (AOA/Kwanza)

```tsx
// packages/utils/src/formatters/moeda.ts

/**
 * Formata valor em Kwanza (inteiro) para exibição.
 * Ex: 17100 → "17.100,00 Kz"
 */
export function formatarKwanza(valor: number): string {
  return new Intl.NumberFormat('pt-AO', {
    style: 'currency',
    currency: 'AOA',
    minimumFractionDigits: 2,
  }).format(valor / 100)
}

// Alternativa sem divisão (se valores já são em centavos):
// Os valores ClinicaPlus são em Kwanza inteiros (centavos = 0).
// Ex: 17100 = 17.100 Kz
export function formatarKwanzaInteiro(valor: number): string {
  return new Intl.NumberFormat('pt-AO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor) + ' Kz'
}
```

---

## Configurações Fiscais — Layout de Cards

```tsx
// apps/web/src/pages/admin/ConfiguracaoFiscalPage.tsx (estrutura)

function ConfiguracaoFiscalPage() {
  const { data: config, isLoading } = useConfiguracaoFiscal()
  const { mutate: guardar, isPending } = useGuardarConfiguracaoFiscal()
  const form = useForm<ConfiguracaoFiscalDto>({
    resolver: zodResolver(ConfiguracaoFiscalSchema),
    values: config, // Preenche quando dados chegam
  })

  return (
    <form onSubmit={form.handleSubmit(data => guardar(data))}>
      {/* Banner se NIF não configurado */}
      {!config?.nif && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
          <strong>⚠️ Dados fiscais incompletos.</strong> Configure o NIF e Razão Social antes de emitir facturas.
        </div>
      )}

      {/* Card 1: Dados do Contribuinte */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 mb-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Dados do Contribuinte</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* NIF */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              NIF <span className="text-red-500">*</span>
            </label>
            <input
              {...form.register('nif')}
              maxLength={9}
              placeholder="123456789"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
            />
            {form.formState.errors.nif && (
              <p className="mt-1 text-xs text-red-500">{form.formState.errors.nif.message}</p>
            )}
          </div>
          {/* Razão Social */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Razão Social <span className="text-red-500">*</span>
            </label>
            <input
              {...form.register('razaoSocial')}
              placeholder="Clínica Saúde Plus Lda"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          {/* Endereço Fiscal */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Endereço Fiscal <span className="text-red-500">*</span>
            </label>
            <input
              {...form.register('endereco')}
              placeholder="Rua Major Kanhangulo, 200, Ingombota"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
            />
          </div>
          {/* Cidade + Província */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Cidade</label>
            <input {...form.register('cidade')} className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Província</label>
            <select {...form.register('provincia')} className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm">
              <option value="">(Seleccione)</option>
              {['Bengo','Benguela','Bié','Cabinda','Cuando Cubango','Cuanza Norte','Cuanza Sul',
                'Cunene','Huambo','Huíla','Icolo e Bengo','Luanda','Lunda Norte','Lunda Sul',
                'Malanje','Moxico','Namibe','Uíge','Zaire'].map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          {/* Regime Fiscal */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Regime Fiscal <span className="text-red-500">*</span>
            </label>
            <select {...form.register('regimeFiscal')} className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm">
              <option value="GERAL">Regime Geral (IVA 14%)</option>
              <option value="SIMPLIFICADO">Regime Simplificado (IVA 7%)</option>
              <option value="ISENTO">Isenção (IVA 0%)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Card 2: Certificação de Software */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 mb-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Certificação de Software</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Nº Certificação AGT</label>
            <input {...form.register('agtSoftwareCert')} className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Série Documental</label>
            <input {...form.register('serieDocFiscal')} placeholder="CPLS" className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
          </div>
          <div className="md:col-span-2">
            {config?.agtSoftwareCert ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm text-green-700">
                ✓ Software certificado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-700">
                ⚠ Certificação não configurada
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Card 3: Integração API e-Factura */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 mb-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Integração API e-Factura</h3>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Token de Acesso API AGT</label>
          <input
            type="password"
            {/* Credenciais AGT (Basic Auth) são globais e não são configuradas por clínica no UI. */}
            placeholder="••••••••"
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={() => /* testarConexao() */undefined}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
        >
          Testar Conexão
        </button>
      </div>

      {/* Botão Guardar */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {isPending ? 'A guardar...' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}
```

---

## Tabela de Itens Dinâmica (CriarFaturaForm)

```tsx
// Padrão de tabela de itens editável
function ItensTable({ fields, append, remove, register, regimeFiscal }: Props) {
  const taxaPadrao = regimeFiscal === 'GERAL' ? 14 : regimeFiscal === 'SIMPLIFICADO' ? 7 : 0

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="pb-2 font-medium">Descrição</th>
            <th className="pb-2 font-medium w-20">Qtd</th>
            <th className="pb-2 font-medium w-28">Preço (Kz)</th>
            <th className="pb-2 font-medium w-24">Desc. (Kz)</th>
            <th className="pb-2 font-medium w-20">IVA %</th>
            <th className="pb-2 font-medium w-28 text-right">Total</th>
            <th className="pb-2 w-10"></th>
          </tr>
        </thead>
        <tbody>
          {fields.map((field, index) => (
            <tr key={field.id} className="border-b border-neutral-100">
              <td className="py-2 pr-2">
                <input
                  {...register(`itens.${index}.descricao`)}
                  placeholder="Consulta Geral"
                  className="w-full rounded border border-neutral-200 px-2 py-1.5 text-sm"
                />
              </td>
              <td className="py-2 pr-2">
                <input type="number" min={1} {...register(`itens.${index}.quantidade`, { valueAsNumber: true })}
                  className="w-full rounded border border-neutral-200 px-2 py-1.5 text-sm text-center" />
              </td>
              <td className="py-2 pr-2">
                <input type="number" min={0} {...register(`itens.${index}.precoUnit`, { valueAsNumber: true })}
                  className="w-full rounded border border-neutral-200 px-2 py-1.5 text-sm text-right" />
              </td>
              <td className="py-2 pr-2">
                <input type="number" min={0} {...register(`itens.${index}.desconto`, { valueAsNumber: true })}
                  className="w-full rounded border border-neutral-200 px-2 py-1.5 text-sm text-right" />
              </td>
              <td className="py-2 pr-2">
                <span className="block text-center text-neutral-500">{taxaPadrao}%</span>
              </td>
              <td className="py-2 text-right font-medium text-neutral-900">
                {/* Calculado dinamicamente */}
              </td>
              <td className="py-2 text-center">
                <button type="button" onClick={() => remove(index)} className="text-red-400 hover:text-red-600">
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button
        type="button"
        onClick={() => append({ descricao: '', quantidade: 1, precoUnit: 0, desconto: 0 })}
        className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700"
      >
        + Adicionar Item
      </button>
    </div>
  )
}
```

---

## Preview A4 para Impressão

```tsx
// apps/web/src/components/faturas/FaturaPreview.tsx

function FaturaPreview({ fatura, snapshot }: Props) {
  return (
    <div className="bg-white mx-auto max-w-[210mm] min-h-[297mm] p-8 shadow-lg print:shadow-none print:p-0">
      {/* Header: Emitente (esq) + Logo (dir) */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-xl font-bold text-neutral-900">{snapshot.emitenteNome}</h2>
          <p className="text-sm text-neutral-600">NIF: {snapshot.emitenteNif}</p>
          <p className="text-sm text-neutral-600">{snapshot.emitenteEndereco}</p>
          <p className="text-sm text-neutral-600">{snapshot.emitenteCidade}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-neutral-900">{fatura.numeroFatura || 'S/N'}</p>
          <p className="text-sm text-neutral-500">Data: {formatDate(fatura.dataEmissao)}</p>
          <FaturaEstadoBadge estado={fatura.estado} />
        </div>
      </div>

      {/* Cliente */}
      <div className="mb-6 rounded-lg bg-neutral-50 p-4">
        <p className="text-xs font-medium uppercase text-neutral-400 mb-1">Cliente</p>
        <p className="font-medium text-neutral-900">{snapshot.clienteNome}</p>
        <p className="text-sm text-neutral-600">NIF: {snapshot.clienteNif}</p>
      </div>

      {/* Tabela de Itens */}
      <table className="w-full text-sm mb-6">
        <thead>
          <tr className="border-b-2 border-neutral-900 text-left">
            <th className="pb-2 font-semibold">Descrição</th>
            <th className="pb-2 font-semibold w-16 text-center">Qtd</th>
            <th className="pb-2 font-semibold w-24 text-right">Preço Unit.</th>
            <th className="pb-2 font-semibold w-20 text-center">IVA</th>
            <th className="pb-2 font-semibold w-28 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {fatura.itens.map(item => (
            <tr key={item.id} className="border-b border-neutral-200">
              <td className="py-2">{item.descricao}</td>
              <td className="py-2 text-center">{item.quantidade}</td>
              <td className="py-2 text-right">{formatarKwanzaInteiro(item.precoUnit)}</td>
              <td className="py-2 text-center">{item.taxaIva}%</td>
              <td className="py-2 text-right font-medium">{formatarKwanzaInteiro(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Resumo */}
      <div className="flex justify-end mb-6">
        <div className="w-64 space-y-1 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatarKwanzaInteiro(fatura.subtotal)}</span></div>
          <div className="flex justify-between"><span>IVA</span><span>{formatarKwanzaInteiro(fatura.totalIva)}</span></div>
          <div className="flex justify-between border-t border-neutral-900 pt-1 font-bold text-base">
            <span>Total</span><span>{formatarKwanzaInteiro(fatura.total)}</span>
          </div>
        </div>
      </div>

      {/* Total por extenso */}
      {fatura.valorExtenso && (
        <p className="mb-6 text-sm italic text-neutral-600">
          <strong>Por extenso:</strong> {fatura.valorExtenso}
        </p>
      )}

      {/* Footer */}
      <div className="mt-auto pt-8 border-t border-neutral-200 text-xs text-neutral-400">
        <p>Processado por computador — ClinicaPlus · Certificação AGT nº {fatura.snapshot?.agtSoftwareCert ?? 'N/A'}</p>
        <p>Hash: {fatura.fiscalHash?.substring(0, 20)}... · {fatura.hashControl}</p>
      </div>
    </div>
  )
}
```

---

## CSS de Impressão

```css
/* apps/web/src/styles/print.css */
@media print {
  body * { visibility: hidden; }
  .fatura-preview, .fatura-preview * { visibility: visible; }
  .fatura-preview { position: absolute; left: 0; top: 0; width: 100%; }

  @page {
    size: A4;
    margin: 1cm;
  }

  .no-print { display: none !important; }
}
```

---

## Empty State (sem facturas)

```tsx
<div className="flex flex-col items-center justify-center py-16 text-center">
  <div className="rounded-full bg-neutral-100 p-4 mb-4">
    <ReceiptIcon className="h-8 w-8 text-neutral-400" />
  </div>
  <h3 className="text-lg font-semibold text-neutral-900">Sem facturas</h3>
  <p className="mt-1 text-sm text-neutral-500">Crie a primeira factura usando o botão acima.</p>
</div>
```
