import React from 'react';
import { Odontogram } from 'react-odontogram';
import 'react-odontogram/style.css';
import type { OdontogramaMarcacao } from '@clinicaplus/types';
import { marcacoesToTeethConditions, fdiToTeethId } from './odontogramConverter';

interface ReactOdontogramWrapperProps {
  marcacoes: OdontogramaMarcacao[];
  /**
   * Se true, mostra apenas visualização (para PDFs)
   * Se false, não usado (mantemos OdontogramaSvg atual para edição)
   */
  readOnly?: boolean;
}

/**
 * Wrapper para react-odontogram usado APENAS para visualização/PDFs
 * 
 * NOTA: Para edição interativa com granularidade de faces,
 * continuamos usando OdontogramaSvg + DenteDuplaCamada
 * 
 * Este componente é usado especificamente para:
 * - Geração de PDFs (renderização SVG limpa)
 * - Visualização read-only em relatórios
 */
export const ReactOdontogramWrapper: React.FC<ReactOdontogramWrapperProps> = ({
  marcacoes,
  readOnly = true,
}) => {
  // Converter marcacoes para teethConditions
  const teethConditions = marcacoesToTeethConditions(marcacoes);

  // Determinar quais dentes devem ser selecionados
  const teethWithConditions = marcacoes
    .filter((m) => m.status !== 'SAUDAVEL')
    .map((m) => fdiToTeethId(m.numeroDente));

  return (
    <div className="p-4 bg-white rounded-lg">
      <Odontogram
        defaultSelected={teethWithConditions}
        readOnly={true}
        notation="FDI"
        showTooltip={true}
        showLabels={true}
        teethConditions={teethConditions}
        theme="light"
        tooltip={{
          placement: 'top',
          content: (payload) => (
            <div className="min-w-[140px]">
              <strong>Dente {payload?.notations.fdi}</strong>
              <div>{payload?.type}</div>
              <small>Universal: {payload?.notations.universal}</small>
            </div>
          ),
        }}
      />
    </div>
  );
};
