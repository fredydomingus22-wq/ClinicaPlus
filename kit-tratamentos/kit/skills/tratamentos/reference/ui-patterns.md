# Referência: Padrões de UI — Tratamentos e Exames

## Hierarquia de páginas

```
/admin/pacientes/:id                    ← PacienteDetailPage (existente)
  └── /historico                        ← HistoricoClinicoPage (novo)
        ├── tab: Consultas              ← lista de consultas passadas
        ├── tab: Exames                 ← ExamesTab
        └── tab: Tratamentos            ← PlanosTab
              └── /planos/:planoId      ← PlanoDetalheModal (ou page)
```

---

## Formulário de criação de Tratamento e Exame com Catálogos Configuráveis

```tsx
// apps/web/src/components/tratamentos/CriarExameForm.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CriarExameSchema, type CriarExameDto } from '@clinicaplus/types'
import { useCriarExame, useTiposExameClinica } from '../../hooks/useTratamentos'

export function CriarExameForm({ pacienteId, medicoId, onSuccess }: Props) {
  const { mutate, isPending } = useCriarExame()
  const { data: tipos } = useTiposExameClinica() // Dropdown populado da BD

  const form = useForm<CriarExameDto>({
    resolver: zodResolver(CriarExameSchema),
    defaultValues: { pacienteId, medicoId },
  })

  return (
    <form onSubmit={form.handleSubmit(data => mutate(data, { onSuccess }))} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          Selecione o Exame / Serviço <span className="text-red-500">*</span>
        </label>
        {/* Renderiza Dropdown dos catálogos configuradas da clínica ao invés de input type="text" */}
        <select
          {...form.register('tipoExameId')}
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:ring-primary-500"
        >
          <option value="">(Seleccione do seu catálogo)</option>
          {tipos?.map(t => (
             <option key={t.id} value={t.id}>{t.nome}</option>
          ))}
        </select>
        {form.formState.errors.tipoExameId && (
          <p className="mt-1 text-xs text-red-500">{form.formState.errors.tipoExameId.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          Indicação clínica / Observações
        </label>
        <textarea
          {...form.register('descricao')}
          rows={2}
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg px-4 py-2"
      >
        Solicitar exame
      </button>
    </form>
  )
}
```

---

## Feedback de upload de laudo (Supabase SignedURLs)

```tsx
// Padrão de upload inline num ExameCard:
function UploadLaudoButton({ exameId }: { exameId: string }) {
  const [uploading, setUploading] = useState(false)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
     // A request gerará a url assinada com auth, que em seguida subirá por PUT request direto e invocará o Confirm LaudoUrl
     // Logica de upload permanece a mesma do design offline PWA
  }

  return (
    <label className="cursor-pointer inline-flex items-center gap-1.5 text-sm">
        {uploading ? 'A carregar...' : 'Carregar laudo'}
        <input type="file" accept=".pdf,image/*" className="sr-only" onChange={handleFileChange} />
    </label>
  )
}
```
