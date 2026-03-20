import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SubscricaoPage } from '../SubscricaoPage';
import { useClinicaMe } from '../../../hooks/useClinicas';
import { useBilling } from '../../../hooks/useBilling';
import { EstadoSubscricao, Plano } from '@clinicaplus/types';
import { MemoryRouter } from 'react-router-dom';

// Mocks
vi.mock('../../../hooks/useClinicas', () => ({
  useClinicaMe: vi.fn(),
}));

vi.mock('../../../hooks/useBilling', () => ({
  useBilling: vi.fn(),
}));

const mockClinica = {
  id: 'clinica-1',
  nome: 'Clínica de Teste',
  plano: Plano.PRO,
  subscricaoEstado: EstadoSubscricao.ACTIVA,
  subscricaoValidaAte: '2026-04-13T10:00:00Z',
};

const mockBilling = {
  subscricaoActual: {
    plano: 'PRO',
    estado: 'ACTIVA',
    diasRestantes: 31,
    validaAte: '2026-04-13T10:00:00Z',
    limites: {
      medicos: { maximo: 10, actual: 4, percentagem: 40 },
      consultas: { maximo: -1, actual: 150, percentagem: null },
      pacientes: { maximo: -1, actual: 1000, percentagem: null },
      apiKeys: { maximo: 3, actual: 1, percentagem: 33 },
    },
    features: {
      telemedicina: true,
      faturacao: true,
      relatorios: true,
    },
  },
  subscricaoUso: {
    medicos: { maximo: 10, actual: 4, percentagem: 40 },
    consultas: { maximo: -1, actual: 150, percentagem: null },
    pacientes: { maximo: -1, actual: 1000, percentagem: null },
    apiKeys: { maximo: 3, actual: 1, percentagem: 33 },
  },
  historico: [
    {
      id: 'h-1',
      plano: 'PRO',
      estado: 'ACTIVA',
      criadoEm: '2026-03-13T10:00:00Z',
      valorKz: 50000,
    }
  ],
  isLoading: false,
};

describe('SubscricaoPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with active subscription', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useClinicaMe as any).mockReturnValue({ data: mockClinica, isLoading: false });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useBilling as any).mockReturnValue(mockBilling);

    render(
      <MemoryRouter>
        <SubscricaoPage />
      </MemoryRouter>
    );

    // Section 1
    expect(screen.getByText(/PLANO PRO/i)).toBeInTheDocument();
    expect(screen.getByText(/Vence em:/i)).toBeInTheDocument();
    expect(screen.getByText(/31 dias/i)).toBeInTheDocument();

    // Section 2 - Usage
    expect(screen.getByText('Médicos')).toBeInTheDocument();
    expect(screen.getByText('4 / 10')).toBeInTheDocument();
    expect(screen.getByText('API Keys')).toBeInTheDocument();
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
    expect(screen.getAllByText(/ilimitado/i).length).toBeGreaterThan(0);

    // Section 3 - Features
    expect(screen.getByText(/Telemedicina/i)).toBeInTheDocument();

    // Section 4 - History
    expect(screen.getByText('50000 Kz')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useClinicaMe as any).mockReturnValue({ data: null, isLoading: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useBilling as any).mockReturnValue({ ...mockBilling, isLoading: true });

    render(
      <MemoryRouter>
        <SubscricaoPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
  });

  it('handles unlimited limits correctly', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useClinicaMe as any).mockReturnValue({ data: mockClinica, isLoading: false });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useBilling as any).mockReturnValue({
      ...mockBilling,
      subscricaoActual: {
        ...mockBilling.subscricaoActual,
        limites: {
          ...mockBilling.subscricaoActual.limites,
          medicos: { maximo: -1, actual: 4, percentagem: null },
        }
      }
    });

    render(
      <MemoryRouter>
        <SubscricaoPage />
      </MemoryRouter>
    );

    const medicosSection = screen.getAllByText(/∞/);
    expect(medicosSection.length).toBeGreaterThan(0);
  });
});
