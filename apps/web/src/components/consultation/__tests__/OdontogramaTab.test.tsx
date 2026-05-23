import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OdontogramaTab } from '../OdontogramaTab';

vi.mock('../../../hooks/useOdontograma', () => ({
  useOdontogramaByAgendamento: vi.fn(() => ({
    data: null,
    isLoading: false,
  })),
  useCreateOdontograma: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useUpdateOdontograma: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

function renderTab() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <OdontogramaTab
        agendamentoId="ag-1"
        pacienteId="pac-1"
        medicoId="med-1"
        isReadOnly={false}
      />
    </QueryClientProvider>,
  );
}

describe('OdontogramaTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar odontograma de dupla camada com dente 16', () => {
    renderTab();
    expect(screen.getByLabelText('Dente 16')).toBeInTheDocument();
    expect(screen.getByLabelText('Faces geométricas dente 16')).toBeInTheDocument();
    expect(screen.getByLabelText('Anatomia dente 16')).toBeInTheDocument();
  });

  it('deve mostrar painel lateral ao clicar na face oclusal', async () => {
    renderTab();
    const oclusal = document.getElementById('dente-16-geo-O');
    expect(oclusal).toBeTruthy();
    fireEvent.click(oclusal!);

    await waitFor(() => {
      expect(screen.getByText('Marcação clínica')).toBeInTheDocument();
      expect(screen.getByText('Cárie')).toBeInTheDocument();
    });
  });

  it('deve aplicar marcação de cárie na face oclusal', async () => {
    renderTab();
    const oclusal = document.getElementById('dente-16-geo-O');
    fireEvent.click(oclusal!);

    await waitFor(() => screen.getByText('Cárie'));
    fireEvent.click(screen.getByText('Cárie'));

    await waitFor(() => {
      expect(oclusal).toHaveClass('fill-red-400');
    });
  });

  it('deve mostrar opções de raiz ao clicar no canal anatómico', async () => {
    renderTab();
    const canal = document.getElementById('dente-16-anat-canal');
    expect(canal).toBeTruthy();
    fireEvent.click(canal!);

    await waitFor(() => {
      expect(screen.getByText('Canal necessário')).toBeInTheDocument();
      expect(screen.getByText(/Camada anatómica/)).toBeInTheDocument();
    });
  });
});
