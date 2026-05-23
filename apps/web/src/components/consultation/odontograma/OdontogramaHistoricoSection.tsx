import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Smile } from 'lucide-react';
import { Spinner, Card, Button } from '@clinicaplus/ui';
import type { OdontogramaDTO } from '@clinicaplus/types';
import { formatDate } from '@clinicaplus/utils';
import { useAuthStore } from '../../../stores/auth.store';
import { Papel } from '@clinicaplus/types';
import { useOdontogramaByPaciente } from '../../../hooks/useOdontograma';
import { OdontogramaSvg } from './OdontogramaSvg';
import { OdontogramLegend } from './OdontogramLegend';
import { countMarcacoesClinicas, formatMarcacaoLine } from './marcacaoUtils';

interface OdontogramaHistoricoSectionProps {
  pacienteId: string;
}

function consultaLabel(record: OdontogramaDTO): string {
  const d = new Date(record.atualizadoEm);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  return `Consulta ${day}/${month}`;
}

export function OdontogramaHistoricoSection({ pacienteId }: OdontogramaHistoricoSectionProps) {
  const { data: records = [], isLoading, error } = useOdontogramaByPaciente(pacienteId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { utilizador } = useAuthStore();

  useEffect(() => {
    if (records.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !records.some((r) => r.id === selectedId)) {
      const first = records[0];
      if (first) setSelectedId(first.id);
    }
  }, [records, selectedId]);

  const selected = records.find((r) => r.id === selectedId) ?? records[0] ?? null;
  const canOpenConsulta =
    utilizador?.papel === Papel.MEDICO || utilizador?.papel === Papel.ADMIN;

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-8 text-center text-red-600 text-sm">
        Não foi possível carregar o histórico de odontogramas.
      </Card>
    );
  }

  if (records.length === 0) {
    return (
      <Card className="p-16 text-center border-dashed border-2 bg-neutral-50/50">
        <Smile className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
        <h3 className="font-bold text-neutral-900 mb-1">Sem odontogramas registados</h3>
        <p className="text-neutral-500 text-sm max-w-md mx-auto">
          Os odontogramas guardados nas consultas de odontologia aparecerão aqui, por data.
        </p>
      </Card>
    );
  }

  const marcacoesCount = selected ? countMarcacoesClinicas(selected.marcacoes) : 0;

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <aside className="lg:w-56 shrink-0 space-y-2">
        <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest px-1">
          Por consulta
        </p>
        {records.map((record) => {
          const n = countMarcacoesClinicas(record.marcacoes);
          const label = consultaLabel(record);
          const isActive = record.id === (selected?.id ?? '');
          return (
            <button
              key={record.id}
              type="button"
              aria-label={label}
              onClick={() => setSelectedId(record.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                isActive
                  ? 'border-primary-300 bg-primary-50 text-primary-900'
                  : 'border-neutral-200 bg-white hover:border-neutral-300'
              }`}
            >
              <span className="font-bold block">{label}</span>
              <span className="text-[10px] text-neutral-500">
                {formatDate(new Date(record.atualizadoEm))}
              </span>
              <span className="text-xs text-neutral-600 mt-0.5 block">
                {n} {n === 1 ? 'marcação' : 'marcações'}
              </span>
            </button>
          );
        })}
      </aside>

      <div className="flex-1 min-w-0 space-y-3">
        {selected && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-neutral-900">
                  Odontograma — {formatDate(new Date(selected.atualizadoEm))}
                </p>
                <p className="text-xs text-neutral-500">
                  {marcacoesCount}{' '}
                  {marcacoesCount === 1 ? 'marcação clínica' : 'marcações clínicas'} · só leitura
                </p>
              </div>
              {canOpenConsulta && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-[10px] font-bold uppercase tracking-widest"
                  onClick={() => navigate(`/medico/consulta/${selected.agendamentoId}`)}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Abrir consulta
                </Button>
              )}
            </div>

            <OdontogramLegend />

            <OdontogramaSvg
              marcacoes={selected.marcacoes}
              isReadOnly={true}
              activeDente={null}
              activeFace={null}
              onFaceClick={() => {}}
            />

            {selected.marcacoes.length > 0 && (
              <Card className="p-4">
                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2">
                  Detalhe das marcações
                </p>
                <ul className="space-y-1 text-xs text-neutral-700">
                  {selected.marcacoes.map((m, i) => (
                    <li key={`${m.numeroDente}-${m.face}-${i}`} className="font-mono">
                      {formatMarcacaoLine(m)}
                      {m.observacao ? ` — ${m.observacao}` : ''}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
