import { DenteFace, type OdontogramaMarcacao } from '@clinicaplus/types';
import { DenteDuplaCamada } from './DenteDuplaCamada';
import {
  FDI_QUADRANT_1,
  FDI_QUADRANT_2,
  FDI_QUADRANT_3,
  FDI_QUADRANT_4,
} from './constants';

interface OdontogramaSvgProps {
  marcacoes: OdontogramaMarcacao[];
  isReadOnly?: boolean;
  activeDente: number | null;
  activeFace: DenteFace | null;
  onFaceClick: (numeroDente: number, face: DenteFace) => void;
}

function QuadrantRow({
  teeth,
  marcacoes,
  isReadOnly,
  activeDente,
  activeFace,
  onFaceClick,
}: {
  teeth: readonly number[];
  marcacoes: OdontogramaMarcacao[];
  isReadOnly: boolean;
  activeDente: number | null;
  activeFace: DenteFace | null;
  onFaceClick: (numeroDente: number, face: DenteFace) => void;
}) {
  return (
    <div className="flex gap-0.5 justify-center items-end flex-wrap">
      {teeth.map((n) => (
        <DenteDuplaCamada
          key={n}
          numeroDente={n}
          marcacoes={marcacoes}
          isReadOnly={isReadOnly}
          activeDente={activeDente}
          activeFace={activeFace}
          onFaceClick={onFaceClick}
        />
      ))}
    </div>
  );
}

export function OdontogramaSvg({
  marcacoes,
  isReadOnly,
  activeDente,
  activeFace,
  onFaceClick,
}: OdontogramaSvgProps) {
  const readOnly = isReadOnly === true;

  return (
    <div className="rounded-xl border border-neutral-200 bg-gradient-to-b from-slate-50 via-white to-neutral-50 px-3 py-5 overflow-x-auto shadow-inner">
      <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest text-center mb-3">
        Arcada superior · Anatomia ↑ Faces ↓
      </p>
      <div className="flex justify-between gap-3 min-w-[760px] px-1">
        <QuadrantRow
          teeth={FDI_QUADRANT_1}
          marcacoes={marcacoes}
          isReadOnly={readOnly}
          activeDente={activeDente}
          activeFace={activeFace}
          onFaceClick={onFaceClick}
        />
        <div className="w-px bg-neutral-300 shrink-0 self-stretch min-h-[120px]" aria-hidden />
        <QuadrantRow
          teeth={FDI_QUADRANT_2}
          marcacoes={marcacoes}
          isReadOnly={readOnly}
          activeDente={activeDente}
          activeFace={activeFace}
          onFaceClick={onFaceClick}
        />
      </div>

      <div className="my-3 mx-4 border-y border-dashed border-neutral-300 relative h-4">
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-neutral-50 px-2 text-[9px] text-neutral-400 font-mono whitespace-nowrap">
          LINHA MEDIANA
        </span>
      </div>

      <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest text-center mb-3">
        Arcada inferior · Faces ↑ Anatomia ↓
      </p>
      <div className="flex justify-between gap-3 min-w-[760px] px-1">
        <QuadrantRow
          teeth={FDI_QUADRANT_4}
          marcacoes={marcacoes}
          isReadOnly={readOnly}
          activeDente={activeDente}
          activeFace={activeFace}
          onFaceClick={onFaceClick}
        />
        <div className="w-px bg-neutral-300 shrink-0 self-stretch min-h-[120px]" aria-hidden />
        <QuadrantRow
          teeth={FDI_QUADRANT_3}
          marcacoes={marcacoes}
          isReadOnly={readOnly}
          activeDente={activeDente}
          activeFace={activeFace}
          onFaceClick={onFaceClick}
        />
      </div>
    </div>
  );
}
