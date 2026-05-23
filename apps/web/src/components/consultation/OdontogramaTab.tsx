import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Save, Activity, MousePointerClick } from 'lucide-react';
import {
  DenteFace,
  DenteStatus,
  type OdontogramaMarcacao,
} from '@clinicaplus/types';
import { useDebounce } from '../../hooks/useDebounce';
import {
  useOdontogramaByAgendamento,
  useCreateOdontograma,
  useUpdateOdontograma,
} from '../../hooks/useOdontograma';
import { OdontogramaSvg } from './odontograma/OdontogramaSvg';
import { OdontogramLegend } from './odontograma/OdontogramLegend';
import { ConditionSidePanel } from './odontograma/ConditionSidePanel';
import toast from 'react-hot-toast';

interface OdontogramaTabProps {
  agendamentoId: string;
  pacienteId: string;
  medicoId: string;
  isReadOnly?: boolean;
}

function mergeMarcacao(
  marcacoes: OdontogramaMarcacao[],
  nova: OdontogramaMarcacao,
): OdontogramaMarcacao[] {
  const filtered = marcacoes.filter(
    (m) => !(m.numeroDente === nova.numeroDente && m.face === nova.face),
  );
  if (nova.status === DenteStatus.SAUDAVEL) {
    return filtered;
  }
  return [...filtered, nova];
}

export const OdontogramaTab: React.FC<OdontogramaTabProps> = ({
  agendamentoId,
  pacienteId,
  medicoId,
  isReadOnly = false,
}) => {
  const { data: loaded, isLoading } = useOdontogramaByAgendamento(agendamentoId);
  const createMutation = useCreateOdontograma();
  const updateMutation = useUpdateOdontograma();

  const [marcacoes, setMarcacoes] = useState<OdontogramaMarcacao[]>([]);
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null);
  const [activeDente, setActiveDente] = useState<number | null>(null);
  const [activeFace, setActiveFace] = useState<DenteFace | null>(null);
  const isSavingRef = useRef(false);
  const pendingSaveRef = useRef(false);

  useEffect(() => {
    if (loaded) {
      setMarcacoes(loaded.marcacoes ?? []);
      setActiveRecordId(loaded.id);
    } else if (!isLoading) {
      setMarcacoes([]);
      setActiveRecordId(null);
    }
  }, [loaded, isLoading]);

  const debouncedMarcacoes = useDebounce(marcacoes, 1500);

  const performSave = useCallback(
    async (current: OdontogramaMarcacao[]) => {
      if (isReadOnly) return;
      if (isSavingRef.current) {
        pendingSaveRef.current = true;
        return;
      }
      isSavingRef.current = true;
      try {
        if (!activeRecordId) {
          const created = await createMutation.mutateAsync({
            agendamentoId,
            pacienteId,
            medicoId,
            marcacoes: current,
          });
          setActiveRecordId(created.id);
        } else {
          await updateMutation.mutateAsync({
            id: activeRecordId,
            payload: { marcacoes: current },
          });
        }
      } catch {
        toast.error('Erro ao guardar odontograma. Tente novamente.');
      } finally {
        isSavingRef.current = false;
        if (pendingSaveRef.current) {
          pendingSaveRef.current = false;
          performSave(marcacoes);
        }
      }
    },
    [
      isReadOnly,
      activeRecordId,
      agendamentoId,
      pacienteId,
      medicoId,
      createMutation,
      updateMutation,
      marcacoes,
    ],
  );

  useEffect(() => {
    if (isReadOnly || isLoading) return;
    if (debouncedMarcacoes.length === 0 && !activeRecordId) return;
    const unchanged =
      JSON.stringify(debouncedMarcacoes) === JSON.stringify(loaded?.marcacoes ?? []);
    if (!unchanged) {
      performSave(debouncedMarcacoes);
    }
  }, [debouncedMarcacoes, isReadOnly, isLoading, activeRecordId, loaded, performSave]);

  const handleFaceClick = (numeroDente: number, face: DenteFace) => {
    if (isReadOnly) return;
    setActiveDente(numeroDente);
    setActiveFace(face);
  };

  const handleStatusSelect = (status: DenteStatus) => {
    if (activeDente == null || activeFace == null) return;
    setMarcacoes((prev) =>
      mergeMarcacao(prev, {
        numeroDente: activeDente,
        face: activeFace,
        status,
      }),
    );
  };

  const clearSelection = () => {
    setActiveDente(null);
    setActiveFace(null);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-neutral-400 text-sm">
        A carregar odontograma...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-widest flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary-500" />
          Odontograma clínico (por faces)
        </h3>
        {!isReadOnly && (
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1">
            <Save
              className={`h-3.5 w-3.5 ${isSaving ? 'animate-spin text-primary-500' : 'text-success-500'}`}
            />
            {isSaving ? 'A guardar...' : 'Sincronizado'}
          </span>
        )}
      </div>

      <OdontogramLegend />

      <div className="flex flex-col lg:flex-row gap-4 items-start">
        <div className="flex-1 min-w-0 w-full">
          <OdontogramaSvg
            marcacoes={marcacoes}
            isReadOnly={isReadOnly}
            activeDente={activeDente}
            activeFace={activeFace}
            onFaceClick={handleFaceClick}
          />
        </div>

        {!isReadOnly &&
          (activeDente != null && activeFace != null ? (
            <ConditionSidePanel
              numeroDente={activeDente}
              face={activeFace}
              onSelect={handleStatusSelect}
              onClose={clearSelection}
            />
          ) : (
            <aside className="lg:w-52 shrink-0 border border-dashed border-neutral-200 rounded-lg p-4 bg-neutral-50/50 text-center">
              <MousePointerClick className="h-8 w-8 text-neutral-300 mx-auto mb-2" />
              <p className="text-xs text-neutral-500 leading-relaxed">
                Clique numa <strong>face</strong> do círculo ou na <strong>raiz/coroa</strong>{' '}
                anatómica para registar a condição clínica.
              </p>
            </aside>
          ))}
      </div>
    </div>
  );
};
