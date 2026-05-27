import React from 'react';
import { type OdontogramaMarcacao, DenteStatus } from '@clinicaplus/types';

interface CustomOdontogramProps {
  marcacoes: OdontogramaMarcacao[];
  onDenteClick: (numeroDente: number) => void;
  isReadOnly?: boolean;
}

// Cores por status
const STATUS_COLORS: Record<DenteStatus, string> = {
  SAUDAVEL: '#ffffff',
  CARIE: '#ef4444',
  FRATURA: '#f59e0b',
  TRATAMENTO_CANAL: '#8b5cf6',
  CANAL_TRATADO: '#a78bfa',
  TRATADO: '#60a5fa',
  AUSENTE: '#6b7280',
  PROTESE: '#10b981',
  DESTRUICAO: '#374151',
};

// Cores de borda por status
const BORDER_COLORS: Record<DenteStatus, string> = {
  SAUDAVEL: '#94a3b8',
  CARIE: '#b91c1c',
  FRATURA: '#b45309',
  TRATAMENTO_CANAL: '#6d28d9',
  CANAL_TRATADO: '#7c3aed',
  TRATADO: '#1d4ed8',
  AUSENTE: '#374151',
  PROTESE: '#047857',
  DESTRUICAO: '#111827',
};

// Obter status predominante do dente
const getDenteStatus = (marcacoes: OdontogramaMarcacao[], numeroDente: number): DenteStatus => {
  const marcacoesDente = marcacoes.filter((m) => m.numeroDente === numeroDente);
  if (marcacoesDente.length === 0) return DenteStatus.SAUDAVEL;
  
  // Prioridade: DESTRUICAO > AUSENTE > TRATAMENTO_CANAL > CARIE > FRATURA > CANAL_TRATADO > TRATADO > PROTESE > SAUDAVEL
  const priority: DenteStatus[] = [
    DenteStatus.DESTRUICAO,
    DenteStatus.AUSENTE,
    DenteStatus.TRATAMENTO_CANAL,
    DenteStatus.CARIE,
    DenteStatus.FRATURA,
    DenteStatus.CANAL_TRATADO,
    DenteStatus.TRATADO,
    DenteStatus.PROTESE,
    DenteStatus.SAUDAVEL,
  ];
  
  for (const status of priority) {
    if (marcacoesDente.some((m) => m.status === status)) {
      return status;
    }
  }
  return DenteStatus.SAUDAVEL;
};

// Componente de dente individual
const DenteSVG: React.FC<{
  numeroDente: number;
  status: DenteStatus;
  onClick: () => void;
  isReadOnly: boolean;
}> = ({ numeroDente, status, onClick, isReadOnly }) => {
  const fillColor = STATUS_COLORS[status];
  const strokeColor = BORDER_COLORS[status];
  
  // Posição baseada no número do dente (FDI)
  // Arcada superior: 18-11 (direita para esquerda), 21-28 (esquerda para direita)
  // Arcada inferior: 48-41 (direita para esquerda), 31-38 (esquerda para direita)
  
  let x = 0, y = 0;
  const size = 30;
  const gap = 5;
  
  if (numeroDente >= 18 && numeroDente <= 11) {
    // Arcada superior direita
    const pos = 18 - numeroDente;
    x = pos * (size + gap);
    y = 0;
  } else if (numeroDente >= 21 && numeroDente <= 28) {
    // Arcada superior esquerda
    const pos = numeroDente - 21;
    x = (8 + pos) * (size + gap);
    y = 0;
  } else if (numeroDente >= 48 && numeroDente <= 41) {
    // Arcada inferior direita
    const pos = 48 - numeroDente;
    x = pos * (size + gap);
    y = size + gap;
  } else if (numeroDente >= 31 && numeroDente <= 38) {
    // Arcada inferior esquerda
    const pos = numeroDente - 31;
    x = (8 + pos) * (size + gap);
    y = size + gap;
  }
  
  return (
    <g
      onClick={isReadOnly ? undefined : onClick}
      className={!isReadOnly ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
      style={{ cursor: isReadOnly ? 'default' : 'pointer' }}
    >
      {/* Dente (círculo simplificado) */}
      <circle
        cx={x + size / 2}
        cy={y + size / 2}
        r={size / 2 - 2}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={2}
      />
      {/* Número do dente */}
      <text
        x={x + size / 2}
        y={y + size / 2 + 4}
        textAnchor="middle"
        fontSize={10}
        fill={status === DenteStatus.SAUDAVEL ? '#374151' : '#ffffff'}
        fontWeight="bold"
        pointerEvents="none"
      >
        {numeroDente}
      </text>
    </g>
  );
};

export const CustomOdontogram: React.FC<CustomOdontogramProps> = ({
  marcacoes,
  onDenteClick,
  isReadOnly = false,
}) => {
  // Todos os dentes permanentes (FDI)
  const todosDentes = [
    // Arcada superior
    18, 17, 16, 15, 14, 13, 12, 11,
    21, 22, 23, 24, 25, 26, 27, 28,
    // Arcada inferior
    48, 47, 46, 45, 44, 43, 42, 41,
    31, 32, 33, 34, 35, 36, 37, 38,
  ];
  
  const width = 16 * (30 + 5) + 5;
  const height = 2 * (30 + 5) + 5;
  
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto"
    >
      {todosDentes.map((numeroDente) => (
        <DenteSVG
          key={numeroDente}
          numeroDente={numeroDente}
          status={getDenteStatus(marcacoes, numeroDente)}
          onClick={() => onDenteClick(numeroDente)}
          isReadOnly={isReadOnly}
        />
      ))}
    </svg>
  );
};
