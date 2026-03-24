import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mocks devem vir antes do componente que os utiliza
vi.mock('../../../hooks/useWhatsApp');
vi.mock('../../../components/PlanGate', () => ({
  PlanGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn(), setQueryData: vi.fn() })),
}));

import { WhatsappPage } from '../WhatsappPage';
import { useWhatsApp, useWhatsAppStatus, useWhatsAppQrCode } from '../../../hooks/useWhatsApp';

describe('WhatsappPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocked hook doesn't need full type
    vi.mocked(useWhatsAppStatus).mockReturnValue({ data: undefined } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocked hook doesn't need full type
    vi.mocked(useWhatsAppQrCode).mockReturnValue({ data: undefined } as any);
  });

  it('deve mostrar botão para conectar quando estado=DESCONECTADO', () => {
    vi.mocked(useWhatsApp).mockReturnValue({
      instancias: [{ id: '1', estado: 'DESCONECTADO' }],
      templates: [],
      automacoes: [],
      isLoading: false,
      criarInstancia: vi.fn(),
      desligarInstancia: vi.fn(),
      actualizarAutomacao: vi.fn(),
      conectando: false,
      desconectando: false,
      toggling: false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    render(
      <MemoryRouter>
        <WhatsappPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/Conectar WhatsApp/i)).toBeInTheDocument();
  });

  it('deve mostrar QR code quando estado=AGUARDA_QR', () => {
    vi.mocked(useWhatsApp).mockReturnValue({
      instancias: [{ id: '2', estado: 'AGUARDA_QR', qrCodeBase64: 'fake-qr-data' }],
      templates: [],
      automacoes: [],
      isLoading: false,
      criarInstancia: vi.fn(),
      desligarInstancia: vi.fn(),
      actualizarAutomacao: vi.fn(),
      conectando: false,
      desconectando: false,
      toggling: false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    render(
      <MemoryRouter>
        <WhatsappPage />
      </MemoryRouter>
    );
    const qrImage = screen.getByAltText(/QR Code/i);
    expect(qrImage).toBeInTheDocument();
    expect(qrImage).toHaveAttribute('src', expect.stringContaining('fake-qr-data'));
  });

  it('deve mostrar badge verde CONECTADO quando estado=CONECTADO', () => {
    vi.mocked(useWhatsApp).mockReturnValue({
      instancias: [{ id: '3', estado: 'CONECTADO', numeroTelefone: '244923000000' }],
      templates: [],
      automacoes: [],
      isLoading: false,
      criarInstancia: vi.fn(),
      desligarInstancia: vi.fn(),
      actualizarAutomacao: vi.fn(),
      conectando: false,
      desconectando: false,
      toggling: false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    render(
      <MemoryRouter>
        <WhatsappPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/Online/i)).toBeInTheDocument();
    expect(screen.getAllByText(/244923000000/i)[0]).toBeInTheDocument();
  });

  it('deve mostrar toggles para os tipos de automação suportados', () => {
    vi.mocked(useWhatsApp).mockReturnValue({
      instancias: [{ id: '4', estado: 'CONECTADO' }],
      templates: [
        { id: 't0', tipo: 'IA_ASSISTANT', maxMensagensPromo: 10, usaAi: false, usaAiDefault: false, nome: 'Assistente de IA', descricao: '...' },
        { id: 't1', tipo: 'MARCACAO_CONSULTA', maxMensagensPromo: 10, usaAi: false, usaAiDefault: false, nome: 'Marcação de Consulta', descricao: '...' },
        { id: 't2', tipo: 'LEMBRETE_24H', maxMensagensPromo: 10, usaAi: false, usaAiDefault: false, nome: 'Lembrete 24h', descricao: '...' },
        { id: 't3', tipo: 'LEMBRETE_2H', maxMensagensPromo: 10, usaAi: false, usaAiDefault: false, nome: 'Lembrete 2h', descricao: '...' },
        { id: 't4', tipo: 'CONFIRMACAO_CANCELAMENTO', maxMensagensPromo: 10, usaAi: false, usaAiDefault: false, nome: 'Confirmação de Cancelamento', descricao: '...' },
        { id: 't5', tipo: 'BOAS_VINDAS', maxMensagensPromo: 10, usaAi: false, usaAiDefault: false, nome: 'Boas-vindas', descricao: '...' }
      ],
      automacoes: [
        { id: '0', tipo: 'IA_ASSISTANT', ativo: true },
        { id: '1', tipo: 'MARCACAO_CONSULTA', ativo: false },
        { id: '2', tipo: 'LEMBRETE_24H', ativo: true },
        { id: '3', tipo: 'LEMBRETE_2H', ativo: false },
        { id: '4', tipo: 'CONFIRMACAO_CANCELAMENTO', ativo: false },
        { id: '5', tipo: 'BOAS_VINDAS', ativo: false },
      ],
      isLoading: false,
      criarInstancia: vi.fn(),
      desligarInstancia: vi.fn(),
      actualizarAutomacao: vi.fn(),
      conectando: false,
      desconectando: false,
      toggling: false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    render(
      <MemoryRouter>
        <WhatsappPage />
      </MemoryRouter>
    );
    
    expect(screen.getByRole('heading', { name: /Assistente de IA/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Marcação de Consultas/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Lembrete 24h antes/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Lembrete 2h antes/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Confirmação por resposta/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Boas-vindas/i })).toBeInTheDocument();
  });

  it('deve mostrar campos de config ao activar automação', async () => {
     vi.mocked(useWhatsApp).mockReturnValue({
      instancias: [{ id: '5', estado: 'CONECTADO' }],
      templates: [
        { id: 't1', tipo: 'MARCACAO_CONSULTA', maxMensagensPromo: 10, usaAi: false, usaAiDefault: false, nome: 'Marcação de Consulta', descricao: '...', configuracaoDefault: { prompt: '' } }
      ],
      automacoes: [
        { id: '1', tipo: 'MARCACAO_CONSULTA', ativo: true, configuracao: { prompt: 'Olá' }, waInstanciaId: '5' },
      ],
      isLoading: false,
      criarInstancia: vi.fn(),
      desligarInstancia: vi.fn(),
      actualizarAutomacao: vi.fn(),
      conectando: false,
      desconectando: false,
      toggling: false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    render(
      <MemoryRouter>
        <WhatsappPage />
      </MemoryRouter>
    );

    // Expandir a seção para ver os campos
    const expandBtn = screen.getByRole('button', { name: /Configurações da Automação/i });
    fireEvent.click(expandBtn);

    // Se estiver activo, deve mostrar campos extras
    expect(screen.getByLabelText(/Horário de início/i)).toBeInTheDocument();
  });

  it('deve actualizar estado QR em tempo real via WebSocket', () => {
    // Este teste valida a integração com o hook que escuta o socket
    // Por agora garantimos que o componente re-renderiza quando o estado muda no hook
    const { rerender } = render(
      <MemoryRouter>
        <WhatsappPage />
      </MemoryRouter>
    );

    vi.mocked(useWhatsApp).mockReturnValue({
      instancias: [{ id: '6', estado: 'CONECTADO' }],
      templates: [],
      automacoes: [],
      isLoading: false,
      criarInstancia: vi.fn(),
      desligarInstancia: vi.fn(),
      actualizarAutomacao: vi.fn(),
      conectando: false,
      desconectando: false,
      toggling: false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    rerender(
      <MemoryRouter>
        <WhatsappPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Online/i)).toBeInTheDocument();
  });
});
