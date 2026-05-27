import { DenteFace, DenteStatus, type OdontogramaMarcacao } from '@clinicaplus/types';
import { fillClassForStatus } from './odontogramaColors';
import { getAnatomiaPaths } from './toothAnatomyPaths';
import { getDenteTipo } from './toothTypes';

interface AnatomiaDenteSvgProps {
  numeroDente: number;
  superior: boolean;
  marcacoes: OdontogramaMarcacao[];
  isReadOnly: boolean;
  isActive: boolean;
  onFaceClick: (numeroDente: number, face: DenteFace) => void;
}

function statusRaiz(marcacoes: OdontogramaMarcacao[] | undefined, numeroDente: number): DenteStatus | undefined {
  if (!marcacoes) return undefined;
  return marcacoes.find((m) => m.numeroDente === numeroDente && m.face === DenteFace.R)?.status;
}

function statusCoroa(marcacoes: OdontogramaMarcacao[] | undefined, numeroDente: number): DenteStatus | undefined {
  if (!marcacoes) return undefined;
  return marcacoes.find((m) => m.numeroDente === numeroDente && m.face === DenteFace.G)?.status;
}

export function AnatomiaDenteSvg({
  numeroDente,
  superior,
  marcacoes,
  isReadOnly,
  isActive,
  onFaceClick,
}: AnatomiaDenteSvgProps) {
  const tipo = getDenteTipo(numeroDente);
  const paths = getAnatomiaPaths(tipo, superior);
  const raizStatus = statusRaiz(marcacoes, numeroDente);
  const coroaStatus = statusCoroa(marcacoes, numeroDente);

  const clickRaiz = () => {
    if (!isReadOnly) onFaceClick(numeroDente, DenteFace.R);
  };
  const clickCoroa = () => {
    if (!isReadOnly) onFaceClick(numeroDente, DenteFace.G);
  };

  const activeRing = isActive ? 'stroke-primary-500' : 'stroke-neutral-600';

  const clsRaiz = `${fillClassForStatus(raizStatus, DenteFace.R)} ${
    isReadOnly ? 'cursor-default' : 'cursor-pointer hover:opacity-90'
  } ${activeRing} stroke-[0.6]`;
  const clsCanal =
    raizStatus === DenteStatus.CANAL_TRATADO
      ? 'fill-orange-500 stroke-orange-700 stroke-[0.8]'
      : raizStatus === DenteStatus.TRATAMENTO_CANAL
        ? 'fill-red-500 stroke-red-800 stroke-[0.8]'
        : `fill-transparent stroke-neutral-400 stroke-[0.5] ${isReadOnly ? '' : 'cursor-pointer'}`;
  const clsCoroa = `${fillClassForStatus(coroaStatus, DenteFace.G)} ${
    isReadOnly ? 'cursor-default' : 'cursor-pointer hover:opacity-90'
  } ${activeRing} stroke-[0.7]`;

  const id = (part: string) => `dente-${numeroDente}-anat-${part}`;

  return (
    <svg
      viewBox="0 0 48 56"
      className="w-12 h-14 shrink-0 drop-shadow-sm"
      aria-label={`Anatomia dente ${numeroDente}`}
      data-tooth={numeroDente}
      data-layer="anatomic"
      data-tipo={tipo}
    >
      {paths.raizEsquerda && (
        <path
          id={id('raiz-esq')}
          className={clsRaiz}
          data-part="raiz-esquerda"
          d={paths.raizEsquerda}
          onClick={clickRaiz}
        />
      )}
      {paths.raizCentral && (
        <path
          id={id('raiz-centro')}
          className={clsRaiz}
          data-part="raiz-central"
          d={paths.raizCentral}
          onClick={clickRaiz}
        />
      )}
      {paths.raizDireita && (
        <path
          id={id('raiz-dir')}
          className={clsRaiz}
          data-part="raiz-direita"
          d={paths.raizDireita}
          onClick={clickRaiz}
        />
      )}
      <path
        id={id('canal')}
        className={clsCanal}
        data-part="canal"
        d={paths.canal}
        onClick={clickRaiz}
      />
      {paths.cervical && (
        <path
          d={paths.cervical}
          className="stroke-neutral-400 stroke-[0.8] fill-none pointer-events-none"
          data-part="cervical"
        />
      )}
      <path
        id={id('coroa')}
        className={clsCoroa}
        data-part="coroa"
        d={paths.coroa}
        onClick={clickCoroa}
      />
    </svg>
  );
}
