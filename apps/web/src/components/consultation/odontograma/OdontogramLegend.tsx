export function OdontogramLegend() {
  const items = [
    { color: 'bg-red-400 border-red-600', label: 'Problema / Cárie / Canal pendente' },
    { color: 'bg-orange-400 border-orange-600', label: 'Canal tratado' },
    { color: 'bg-emerald-300 border-emerald-600', label: 'Tratado / Saudável' },
    { color: 'bg-neutral-500 border-neutral-700', label: 'Prótese / Destruição' },
    { color: 'bg-white border-neutral-300', label: 'Sem marcação' },
  ];

  return (
    <div
      className="flex flex-wrap gap-x-4 gap-y-2 px-3 py-2 bg-white border border-neutral-200 rounded-md text-[10px] text-neutral-600"
      role="note"
      aria-label="Legenda do odontograma"
    >
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span className={`inline-block w-3 h-3 rounded-sm border ${item.color}`} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
