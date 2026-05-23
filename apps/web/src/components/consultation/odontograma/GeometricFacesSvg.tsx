import { DenteFace, DenteStatus, type OdontogramaMarcacao } from '@clinicaplus/types';
import { fillClassForStatus } from './odontogramaColors';
import { GEO_CENTER, GEO_SEGMENTS } from './geometricFacePaths';

interface GeometricFacesSvgProps {
  numeroDente: number;
  marcacoes: OdontogramaMarcacao[];
  isReadOnly: boolean;
  isActive: boolean;
  onFaceClick: (numeroDente: number, face: DenteFace) => void;
}

function statusForFace(
  marcacoes: OdontogramaMarcacao[],
  numeroDente: number,
  face: DenteFace,
): DenteStatus | undefined {
  return marcacoes.find((m) => m.numeroDente === numeroDente && m.face === face)?.status;
}

const FACE_MAP: Record<(typeof GEO_SEGMENTS)[number]['face'], DenteFace> = {
  V: DenteFace.V,
  D: DenteFace.D,
  L: DenteFace.L,
  M: DenteFace.M,
};

export function GeometricFacesSvg({
  numeroDente,
  marcacoes,
  isReadOnly,
  isActive,
  onFaceClick,
}: GeometricFacesSvgProps) {
  const click = (face: DenteFace) => {
    if (!isReadOnly) onFaceClick(numeroDente, face);
  };

  const cls = (face: DenteFace) => {
    const base = fillClassForStatus(statusForFace(marcacoes, numeroDente, face), face);
    const hover = isReadOnly ? '' : 'hover:opacity-90';
    const ring = isActive ? 'stroke-primary-500 stroke-[1.2]' : '';
    return `${base} ${hover} ${ring} ${isReadOnly ? 'cursor-default' : 'cursor-pointer'}`;
  };

  const id = (suffix: string) => `dente-${numeroDente}-geo-${suffix}`;

  return (
    <svg
      viewBox="0 0 40 40"
      className="w-11 h-11 shrink-0 drop-shadow-sm"
      aria-label={`Faces geométricas dente ${numeroDente}`}
      data-tooth={numeroDente}
      data-layer="geometric"
    >
      <circle
        cx={GEO_CENTER.cx}
        cy={GEO_CENTER.cy}
        r={GEO_CENTER.r + 0.5}
        className="fill-neutral-50 stroke-neutral-300 stroke-[0.5]"
        pointerEvents="none"
      />
      {GEO_SEGMENTS.map((seg) => {
        const face = FACE_MAP[seg.face];
        return (
          <path
            key={seg.face}
            id={id(seg.face)}
            className={cls(face)}
            data-face={seg.face}
            d={seg.d}
            onClick={() => click(face)}
          />
        );
      })}
      <circle
        id={id('O')}
        className={cls(DenteFace.O)}
        data-face="O"
        cx={GEO_CENTER.cx}
        cy={GEO_CENTER.cy}
        r={GEO_CENTER.r}
        onClick={() => click(DenteFace.O)}
      />
    </svg>
  );
}
