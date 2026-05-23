import { X } from 'lucide-react';
import { DenteFace } from '@clinicaplus/types';
import { FACE_LABELS } from './constants';
import { getStatusOptionsForFace } from './statusOptions';
import type { DenteStatus } from '@clinicaplus/types';

interface ConditionSidePanelProps {
  numeroDente: number;
  face: DenteFace;
  onSelect: (status: DenteStatus) => void;
  onClose: () => void;
}

export function ConditionSidePanel({
  numeroDente,
  face,
  onSelect,
  onClose,
}: ConditionSidePanelProps) {
  const options = getStatusOptionsForFace(face);
  const faceLabel = FACE_LABELS[face] ?? face;
  const isRaiz = face === DenteFace.R || face === DenteFace.G;

  return (
    <aside
      className="lg:w-52 shrink-0 border border-primary-200 bg-primary-50/30 rounded-lg p-4 shadow-sm"
      aria-label="Painel de condição clínica"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-[10px] font-bold text-primary-600 uppercase tracking-widest">
            Marcação clínica
          </p>
          <p className="text-sm font-bold text-neutral-900 mt-1">
            Dente {numeroDente}
          </p>
          <p className="text-xs text-neutral-600">{faceLabel}</p>
          <p className="text-[10px] text-neutral-400 mt-0.5">
            {isRaiz ? 'Camada anatómica' : 'Face do dente (FDI)'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-neutral-400 hover:text-neutral-700 rounded"
          aria-label="Fechar painel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`w-full text-left text-xs font-medium px-3 py-2 rounded border transition-colors ${opt.chipClass}`}
            onClick={() => onSelect(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <p className="text-[10px] text-neutral-400 mt-3 leading-relaxed">
        A alteração guarda automaticamente após alguns segundos.
      </p>
    </aside>
  );
}
