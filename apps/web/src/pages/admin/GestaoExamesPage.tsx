import React, { useState } from 'react';
import { useExamesClinica } from '../../hooks/useTratamentos';
import { 
  Card, 
  Table, 
  Badge, 
  BadgeVariant,
  Button, 
  ErrorMessage,
  Avatar
} from '@clinicaplus/ui';
import { 
  Search, 
  FileText, 
  Download,
  Calendar,
  ExternalLink
} from 'lucide-react';
import { formatDate } from '@clinicaplus/utils';
import { EstadoExame } from '@clinicaplus/types';

interface ExameComPaciente {
  id: string;
  nome: string;
  dataPedido: string;
  estado: EstadoExame;
  laudoUrl?: string;
  pacienteId: string;
  paciente: {
    id: string;
    nome: string;
    numeroPaciente: string;
  };
}

export default function GestaoExamesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading, error } = useExamesClinica({
    estado: statusFilter || undefined,
    q: searchTerm || undefined
  });

  const exames = (data as ExameComPaciente[]) || [];

  const columns = [
    {
      header: 'Exame',
      accessor: (ex: ExameComPaciente) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-50 rounded-lg">
            <FileText className="h-4 w-4 text-primary-600" />
          </div>
          <div>
            <p className="font-semibold text-neutral-900">{ex.nome}</p>
            <p className="text-xs text-neutral-500 flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Pedido em {formatDate(ex.dataPedido)}
            </p>
          </div>
        </div>
      )
    },
    {
      header: 'Paciente',
      accessor: (ex: ExameComPaciente) => (
        <div className="flex items-center gap-2">
          <Avatar initials={(ex.paciente.nome || '?').charAt(0)} size="sm" />
          <div>
            <p className="text-sm font-medium text-neutral-900">{ex.paciente.nome}</p>
            <p className="text-[10px] text-neutral-500">{ex.paciente.numeroPaciente}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Estado',
      accessor: (ex: ExameComPaciente) => {
        const variants: Record<EstadoExame, BadgeVariant> = {
          PENDENTE: 'neutral',
          AGENDADO: 'info',
          REALIZADO: 'info',
          LAUDADO: 'success',
          CANCELADO: 'error'
        };
        return <Badge variant={variants[ex.estado] || 'neutral'}>{ex.estado}</Badge>;
      }
    },
    {
      header: 'Ações',
      className: 'text-right',
      accessor: (ex: ExameComPaciente) => (
        <div className="flex justify-end gap-2">
          {ex.laudoUrl && (
            <Button size="sm" variant="ghost" onClick={() => window.open(ex.laudoUrl, '_blank')}>
              <Download className="h-4 w-4 mr-1" /> Laudo
            </Button>
          )}
          <Button size="sm" variant="ghost" className="text-secondary-600" onClick={() => window.location.href = `/admin/pacientes/${ex.pacienteId}/historico`}>
            <ExternalLink className="h-4 w-4 mr-1" /> Prontuário
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Gestão de Exames</h1>
        <p className="text-neutral-600">Monitoramento global de pedidos e laudos da clínica</p>
      </div>

      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
            <input 
              type="text"
              placeholder="Pesquisar por paciente ou exame..."
              className="w-full h-10 pl-10 pr-4 text-sm border border-neutral-200 rounded-md outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full md:w-48">
            <select 
              className="w-full h-10 px-3 text-sm border border-neutral-200 rounded-md outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Todos os Estados</option>
              <option value="PENDENTE">Pendentes</option>
              <option value="REALIZADO">Realizados</option>
              <option value="LAUDADO">Laudados / Concluídos</option>
              <option value="CANCELADO">Cancelados</option>
            </select>
          </div>
        </div>

        {error ? (
          <ErrorMessage error={error} />
        ) : (
          <div className="overflow-x-auto -mx-4 px-4">
            <Table
              columns={columns}
              data={exames}
              isLoading={isLoading}
              keyExtractor={(ex: ExameComPaciente) => ex.id}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
