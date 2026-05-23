import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DenteFace, DenteStatus } from '@clinicaplus/types';

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('../../../../stores/auth.store', () => ({
  useAuthStore: () => ({ utilizador: { papel: 'MEDICO' } }),
}));

import { OdontogramaHistoricoSection } from '../OdontogramaHistoricoSection';

const mockRecords = [
  {
    id: 'odo-1',
    clinicaId: 'c1',
    pacienteId: 'pac-1',
    medicoId: 'med-1',
    agendamentoId: 'ag-1',
    marcacoes: [
      { numeroDente: 16, face: DenteFace.O, status: DenteStatus.CARIE },
    ],
    criadoEm: '2026-05-20T10:00:00.000Z',
    atualizadoEm: '2026-05-20T10:05:00.000Z',
  },
  {
    id: 'odo-2',
    clinicaId: 'c1',
    pacienteId: 'pac-1',
    medicoId: 'med-1',
    agendamentoId: 'ag-2',
    marcacoes: [],
    criadoEm: '2026-05-10T10:00:00.000Z',
    atualizadoEm: '2026-05-10T10:00:00.000Z',
  },
];

vi.mock('../../../../hooks/useOdontograma', () => ({
  useOdontogramaByPaciente: vi.fn(),
}));

import { useOdontogramaByPaciente } from '../../../../hooks/useOdontograma';

function renderSection(pacienteId = 'pac-1') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <OdontogramaHistoricoSection pacienteId={pacienteId} />
    </QueryClientProvider>,
  );
}

describe('OdontogramaHistoricoSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve mostrar estado vazio quando não há registos', () => {
    vi.mocked(useOdontogramaByPaciente).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useOdontogramaByPaciente>);

    renderSection();
    expect(screen.getByText(/Sem odontogramas registados/i)).toBeInTheDocument();
  });

  it('deve listar consultas com marcações e permitir seleccionar', () => {
    vi.mocked(useOdontogramaByPaciente).mockReturnValue({
      data: mockRecords,
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useOdontogramaByPaciente>);

    renderSection();
    expect(screen.getByRole('button', { name: 'Consulta 20/05' })).toHaveTextContent('1 marcação');
    expect(screen.getByLabelText('Faces geométricas dente 16')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Consulta 10/05' }));
    expect(screen.getByRole('button', { name: 'Consulta 10/05' })).toHaveTextContent('0 marcações');
    expect(screen.queryByLabelText('Faces geométricas dente 16')).not.toBeInTheDocument();
  });
});
