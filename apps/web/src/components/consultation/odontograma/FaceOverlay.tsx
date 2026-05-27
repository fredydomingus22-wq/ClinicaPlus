import React from 'react';
import { DenteFace, type OdontogramaMarcacao } from '@clinicaplus/types';
import { DenteDuplaCamada } from './DenteDuplaCamada';

interface FaceOverlayProps {
  marcacoes: OdontogramaMarcacao[] | undefined;
  activeDente: number | null;
  activeFace: DenteFace | null;
  onFaceClick: (numeroDente: number, face: DenteFace) => void;
  isReadOnly: boolean;
}

/**
 * Overlay para seleção de faces sobre react-odontogram
 * 
 * Este componente posiciona elementos DenteDuplaCamada sobre os dentes
 * do react-odontogram para permitir seleção granular de faces.
 * 
 * NOTA: Implementação inicial - precisa de refinamento de posicionamento
 */
export const FaceOverlay: React.FC<FaceOverlayProps> = ({
  marcacoes,
  activeDente,
  activeFace,
  onFaceClick,
  isReadOnly,
}) => {
  // Mapeamento de dentes FDI para posições relativas (0-100%)
  // Estes valores são aproximados e precisam ser ajustados visualmente
  const getDentePosition = (numeroDente: number) => {
    // Quadrante superior direito (18-11)
    if (numeroDente >= 11 && numeroDente <= 18) {
      const index = 18 - numeroDente; // 0-7
      return {
        x: 50 + (index * 6), // 50% a 92%
        y: 10, // 10%
      };
    }
    // Quadrante superior esquerdo (21-28)
    if (numeroDente >= 21 && numeroDente <= 28) {
      const index = numeroDente - 21; // 0-7
      return {
        x: 8 + (index * 6), // 8% a 50%
        y: 10, // 10%
      };
    }
    // Quadrante inferior esquerdo (31-38)
    if (numeroDente >= 31 && numeroDente <= 38) {
      const index = numeroDente - 31; // 0-7
      return {
        x: 8 + (index * 6), // 8% a 50%
        y: 50, // 50%
      };
    }
    // Quadrante inferior direito (48-41)
    if (numeroDente >= 41 && numeroDente <= 48) {
      const index = 48 - numeroDente; // 0-7
      return {
        x: 50 + (index * 6), // 50% a 92%
        y: 50, // 50%
      };
    }
    return { x: 50, y: 50 };
  };

  // Lista de dentes para renderizar (todos os dentes permanentes)
  const dentes = [
    // Superior direito
    18, 17, 16, 15, 14, 13, 12, 11,
    // Superior esquerdo
    21, 22, 23, 24, 25, 26, 27, 28,
    // Inferior esquerdo
    31, 32, 33, 34, 35, 36, 37, 38,
    // Inferior direito
    48, 47, 46, 45, 44, 43, 42, 41,
  ];

  return (
    <div className="absolute inset-0 pointer-events-none">
      {dentes.map((numeroDente) => {
        const position = getDentePosition(numeroDente);
        const isActive = activeDente === numeroDente;

        return (
          <div
            key={numeroDente}
            className="absolute pointer-events-auto"
            style={{
              left: `${position.x}%`,
              top: `${position.y}%`,
              transform: 'translate(-50%, -50%)',
              width: '48px',
              height: '48px',
            }}
          >
            <DenteDuplaCamada
              numeroDente={numeroDente}
              marcacoes={marcacoes ?? []}
              activeDente={activeDente}
              activeFace={activeFace}
              onFaceClick={onFaceClick}
              isReadOnly={isReadOnly}
            />
          </div>
        );
      })}
    </div>
  );
};
