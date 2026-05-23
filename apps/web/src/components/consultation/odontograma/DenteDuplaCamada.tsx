import { DenteFace, type OdontogramaMarcacao } from '@clinicaplus/types';
import { AnatomiaDenteSvg } from './AnatomiaDenteSvg';
import { GeometricFacesSvg } from './GeometricFacesSvg';
import { isArcadaSuperior } from './toothTypes';

interface DenteDuplaCamadaProps {
  numeroDente: number;
  marcacoes: OdontogramaMarcacao[];
  isReadOnly: boolean;
  activeDente: number | null;
  activeFace: DenteFace | null;
  onFaceClick: (numeroDente: number, face: DenteFace) => void;
}

export function DenteDuplaCamada({
  numeroDente,
  marcacoes,
  isReadOnly,
  activeDente,
  activeFace,
  onFaceClick,
}: DenteDuplaCamadaProps) {
  const superior = isArcadaSuperior(numeroDente);
  const isActive = activeDente === numeroDente;

  const anatomia = (
    <AnatomiaDenteSvg
      numeroDente={numeroDente}
      superior={superior}
      marcacoes={marcacoes}
      isReadOnly={isReadOnly}
      isActive={isActive}
      onFaceClick={onFaceClick}
    />
  );

  const geometrico = (
    <GeometricFacesSvg
      numeroDente={numeroDente}
      marcacoes={marcacoes}
      isReadOnly={isReadOnly}
      isActive={isActive}
      onFaceClick={onFaceClick}
    />
  );

  return (
    <div
      className={`flex flex-col items-center gap-0.5 min-w-[3rem] rounded px-0.5 py-1 transition-colors ${
        isActive ? 'bg-primary-50 ring-1 ring-primary-200' : ''
      }`}
      data-tooth={numeroDente}
      role="group"
      aria-label={`Dente ${numeroDente}`}
    >
      <span className="text-[9px] font-mono font-bold text-neutral-700 leading-none tabular-nums">
        {numeroDente}
      </span>
      {superior ? (
        <>
          {anatomia}
          {geometrico}
        </>
      ) : (
        <>
          {geometrico}
          {anatomia}
        </>
      )}
    </div>
  );
}
