import React from 'react';
import { X } from 'lucide-react';
import { DenteFace, DenteStatus, type OdontogramaMarcacao } from '@clinicaplus/types';

interface OdontogramDetailModalProps {
  numeroDente: number;
  marcacoes: OdontogramaMarcacao[];
  onClose: () => void;
  onUpdateMarcacao: (face: DenteFace, status: DenteStatus) => void;
  onDeleteMarcacao: (face: DenteFace) => void;
  isReadOnly?: boolean;
}

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

export const OdontogramDetailModal: React.FC<OdontogramDetailModalProps> = ({
  numeroDente,
  marcacoes,
  onClose,
  onUpdateMarcacao,
  onDeleteMarcacao,
  isReadOnly = false,
}) => {
  const marcacoesDente = marcacoes.filter((m) => m.numeroDente === numeroDente);
  const todasFaces: DenteFace[] = [DenteFace.V, DenteFace.D, DenteFace.M, DenteFace.L, DenteFace.O, DenteFace.G, DenteFace.R];

  const handleStatusChange = (face: DenteFace, status: DenteStatus) => {
    if (isReadOnly) return;
    onUpdateMarcacao(face, status);
  };

  const handleRemove = (face: DenteFace) => {
    if (isReadOnly) return;
    onDeleteMarcacao(face);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200">
          <h3 className="text-lg font-semibold text-neutral-900">Dente {numeroDente}</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-neutral-100 rounded transition-colors"
          >
            <X className="h-5 w-5 text-neutral-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {todasFaces.map((face) => {
            const marcacao = marcacoesDente.find((m) => m.face === face);
            return (
              <div key={face} className="flex items-center gap-3">
                <span className="w-24 text-sm font-medium text-neutral-700">
                  {FACE_LABELS[face]}
                </span>
                {!isReadOnly ? (
                  <select
                    value={marcacao?.status || DenteStatus.SAUDAVEL}
                    onChange={(e) => handleStatusChange(face, e.target.value as DenteStatus)}
                    className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {Object.entries(STATUS_LABELS).map(([status, label]) => (
                      <option key={status} value={status}>
                        {label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className={`flex-1 px-3 py-2 rounded-lg text-sm ${STATUS_COLORS[marcacao?.status || DenteStatus.SAUDAVEL]}`}>
                    {STATUS_LABELS[marcacao?.status || DenteStatus.SAUDAVEL]}
                  </span>
                )}
                {marcacao && !isReadOnly && (
                  <button
                    onClick={() => handleRemove(face)}
                    className="text-xs text-neutral-500 hover:text-red-600 transition-colors"
                  >
                    Limpar
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            Concluído
          </button>
        </div>
      </div>
    </div>
  );
};
