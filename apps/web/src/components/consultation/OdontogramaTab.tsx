import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Save, Activity, X } from 'lucide-react';
import { Odontogram } from 'react-odontogram';
import 'react-odontogram/style.css';
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
import { OdontogramLegend } from './odontograma/OdontogramLegend';
import { marcacoesToTeethConditions, teethIdToFdi } from './odontograma/odontogramConverter';
import toast from 'react-hot-toast';

const FACE_LABELS: Record<DenteFace, string> = {
  V: 'Vestibular',
  D: 'Distal',
  M: 'Mesial',
  L: 'Lingual/Palatina',
  O: 'Oclusal/Incisal',
  G: 'Coroa',
  R: 'Raiz',
};

const STATUS_LABELS: Record<DenteStatus, string> = {
  SAUDAVEL: 'Saudável',
  CARIE: 'Cárie',
  FRATURA: 'Fratura',
  TRATAMENTO_CANAL: 'Trat. Canal',
  CANAL_TRATADO: 'Canal Tratado',
  TRATADO: 'Tratado',
  AUSENTE: 'Ausente',
  PROTESE: 'Prótese',
  DESTRUICAO: 'Destruição',
};

const STATUS_COLORS: Record<DenteStatus, string> = {
  SAUDAVEL: 'bg-neutral-100 text-neutral-700',
  CARIE: 'bg-red-100 text-red-700',
  FRATURA: 'bg-amber-100 text-amber-700',
  TRATAMENTO_CANAL: 'bg-purple-100 text-purple-700',
  CANAL_TRATADO: 'bg-violet-100 text-violet-700',
  TRATADO: 'bg-blue-100 text-blue-700',
  AUSENTE: 'bg-gray-100 text-gray-700',
  PROTESE: 'bg-emerald-100 text-emerald-700',
  DESTRUICAO: 'bg-gray-800 text-white',
};

interface OdontogramaTabProps {
  agendamentoId: string;
  pacienteId: string;
  medicoId: string;
  isReadOnly?: boolean;
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
  const [selectedDente, setSelectedDente] = useState<number | null>(null);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const isSavingRef = useRef(false);
  const pendingSaveRef = useRef(false);

  useEffect(() => {
    if (!initialLoaded) {
      if (loaded) {
        setMarcacoes(loaded.marcacoes ?? []);
        setActiveRecordId(loaded.id);
        setInitialLoaded(true);
      } else if (!isLoading) {
        setMarcacoes([]);
        setActiveRecordId(null);
        setInitialLoaded(true);
      }
    } else if (loaded && !activeRecordId) {
       // Se foi criado um novo registo, atualizar o ID
       setActiveRecordId(loaded.id);
    }
  }, [loaded, isLoading, initialLoaded, activeRecordId]);

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

  const handleUpdateMarcacao = (face: DenteFace, status: DenteStatus) => {
    if (selectedDente == null) return;
    
    // Remover marcacao existente para esta face
    const filtered = marcacoes.filter(
      (m) => !(m.numeroDente === selectedDente && m.face === face),
    );
    
    // Adicionar nova marcacao se não for SAUDAVEL
    if (status !== DenteStatus.SAUDAVEL) {
      filtered.push({
        numeroDente: selectedDente,
        face,
        status,
      });
    }
    
    setMarcacoes(filtered);
  };

  const handleDeleteMarcacao = (face: DenteFace) => {
    if (selectedDente == null) return;
    setMarcacoes((prev) =>
      prev.filter((m) => !(m.numeroDente === selectedDente && m.face === face)),
    );
  };

  const handleCloseModal = () => {
    setSelectedDente(null);
  };

  const handleDenteClick = (selected: Array<{ id: string; notations: { fdi: string } }>) => {
    if (isReadOnly || selected.length === 0) return;
    // Pegar o último dente selecionado
    const lastSelected = selected[selected.length - 1];
    if (lastSelected) {
      const numeroDente = parseInt(lastSelected.notations.fdi, 10);
      setSelectedDente(numeroDente);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // Converter marcacoes para formato do react-odontogram
  const teethConditions = marcacoesToTeethConditions(marcacoes);
  const teethWithConditions = marcacoes
    .filter((m) => m.status !== 'SAUDAVEL')
    .map((m) => `teeth-${m.numeroDente}`);

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
          Odontograma clínico
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

      <div className="flex gap-4">
        <div className="flex-1 p-4 bg-white rounded-lg border border-neutral-200">
          <div className="transform scale-50 origin-top">
            <Odontogram
              defaultSelected={teethWithConditions}
              readOnly={isReadOnly}
              notation="FDI"
              showTooltip={true}
              showLabels={true}
              teethConditions={teethConditions}
              theme="light"
              onChange={handleDenteClick}
              tooltip={{
                placement: 'top',
                content: (payload) => {
                  const numeroDente = teethIdToFdi(payload?.id || '');
                  const marcacoesDente = marcacoes.filter((m) => m.numeroDente === numeroDente);
                  return (
                    <div className="min-w-[140px]">
                      <strong>Dente {payload?.notations?.fdi}</strong>
                      {marcacoesDente.length > 0 && (
                        <div className="mt-1 text-xs">
                          {marcacoesDente.map((m, i) => (
                            <div key={i} className="flex items-center gap-1">
                              <span className="font-medium">{m.face}:</span>
                              <span>{m.status}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <small className="text-neutral-500">Universal: {payload?.notations?.universal}</small>
                    </div>
                  );
                },
              }}
            />
          </div>
        </div>

        {/* Painel lateral de detalhes */}
        {selectedDente && (
          <div className="w-72 p-4 bg-white rounded-lg border border-neutral-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-900">Dente {selectedDente}</h3>
              <button
                onClick={() => setSelectedDente(null)}
                className="p-1 hover:bg-neutral-100 rounded transition-colors"
              >
                <X className="h-5 w-5 text-neutral-500" />
              </button>
            </div>

            <div className="space-y-3">
              {([DenteFace.V, DenteFace.D, DenteFace.M, DenteFace.L, DenteFace.O, DenteFace.G, DenteFace.R] as DenteFace[]).map((face) => {
                const marcacao = marcacoes.find((m) => m.numeroDente === selectedDente && m.face === face);
                return (
                  <div key={face} className="flex items-center gap-2">
                    <span className="w-20 text-xs font-medium text-neutral-700">
                      {FACE_LABELS[face]}
                    </span>
                    {!isReadOnly ? (
                      <select
                        value={marcacao?.status || DenteStatus.SAUDAVEL}
                        onChange={(e) => handleUpdateMarcacao(face, e.target.value as DenteStatus)}
                        className="flex-1 px-2 py-1 border border-neutral-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        {Object.entries(STATUS_LABELS).map(([status, label]) => (
                          <option key={status} value={status}>
                            {label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className={`flex-1 px-2 py-1 rounded text-xs ${STATUS_COLORS[marcacao?.status || DenteStatus.SAUDAVEL]}`}>
                        {STATUS_LABELS[marcacao?.status || DenteStatus.SAUDAVEL]}
                      </span>
                    )}
                    {marcacao && !isReadOnly && (
                      <button
                        onClick={() => handleDeleteMarcacao(face)}
                        className="text-xs text-neutral-500 hover:text-red-600 transition-colors"
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
