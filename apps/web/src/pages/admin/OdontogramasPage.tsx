import React, { useState } from 'react';
import { Card, Button, Avatar, Badge, ErrorMessage } from '@clinicaplus/ui';
import { Search, Calendar, Filter, MoreVertical, ExternalLink } from 'lucide-react';
import { useOdontogramasList } from '../../hooks/useOdontograma';
import { ReactOdontogramWrapper } from '../../components/consultation/odontograma/ReactOdontogramWrapper';
import { formatDate } from '@clinicaplus/utils';

export default function OdontogramasPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const { data: odontogramas, isLoading, error } = useOdontogramasList({ limit: 50 });

  // Filter odontogramas based on search and date
  const filteredOdontogramas = (odontogramas || []).filter((odo) => {
    const pacienteNome = odo.pacienteId.toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = pacienteNome.includes(searchLower);
    
    if (dateFilter) {
      const odoDate = new Date(odo.criadoEm).toISOString().split('T')[0];
      return matchesSearch && odoDate === dateFilter;
    }
    
    return matchesSearch;
  });

  const getStatusVariant = (marcacoes: NonNullable<typeof odontogramas>[number]['marcacoes']): "info" | "success" | "neutral" | "error" => {
    if (!marcacoes || marcacoes.length === 0) return 'neutral';
    const hasIssues = marcacoes.some((m) => m.status !== 'SAUDAVEL');
    return hasIssues ? 'info' : 'success';
  };

  const getStatusLabel = (marcacoes: NonNullable<typeof odontogramas>[number]['marcacoes']): string => {
    if (!marcacoes || marcacoes.length === 0) return 'Sem marcações';
    const hasIssues = marcacoes.some((m) => m.status !== 'SAUDAVEL');
    return hasIssues ? 'Com observações' : 'Saudável';
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Odontogramas</h1>
        <p className="text-neutral-600">Gestão de odontogramas e registos dentários.</p>
      </div>

      {/* Filters - Mobile First */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
            <input
              type="text"
              placeholder="Pesquisar por paciente..."
              className="w-full h-10 pl-10 pr-4 text-sm border border-neutral-200 rounded-md outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full md:w-48">
            <input
              type="date"
              className="w-full h-10 px-3 text-sm border border-neutral-200 rounded-md outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
          {(searchTerm || dateFilter) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setDateFilter('');
              }}
            >
              Limpar Filtros
            </Button>
          )}
        </div>
      </Card>

      {/* Odontograma Cards Grid - Mobile First */}
      {error ? (
        <ErrorMessage error={error} />
      ) : isLoading ? (
        <div className="flex items-center justify-center min-h-[200px] text-neutral-400 text-sm">
          A carregar odontogramas...
        </div>
      ) : filteredOdontogramas.length === 0 ? (
        <Card className="p-12 border-neutral-100 shadow-sm">
          <div className="text-center">
            <Filter className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
            <p className="text-neutral-400 font-medium">Nenhum odontograma encontrado</p>
            <p className="text-neutral-300 text-sm mt-2">
              {searchTerm || dateFilter ? 'Tente ajustar os filtros' : 'Ainda não existem registos'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOdontogramas.map((odontograma) => (
            <Card key={odontograma.id} className="p-4 shadow-sm hover:shadow-md transition-shadow">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Avatar 
                    initials={odontograma.pacienteId[0] || 'P'} 
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-neutral-900 truncate">
                      Paciente {odontograma.pacienteId}
                    </p>
                    <p className="text-xs text-neutral-500 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(odontograma.criadoEm)}
                    </p>
                  </div>
                </div>
                <Badge variant={getStatusVariant(odontograma.marcacoes)}>
                  {getStatusLabel(odontograma.marcacoes)}
                </Badge>
              </div>

              {/* Mini Odontograma */}
              <div className="bg-neutral-50 rounded-lg p-3 mb-3 overflow-hidden">
                <div className="transform scale-75 origin-top-left">
                  <ReactOdontogramWrapper 
                    marcacoes={odontograma.marcacoes || []} 
                    readOnly={true}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 min-h-[44px]"
                  onClick={() => window.location.href = `/medico/consulta/${odontograma.agendamentoId}`}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ver Consulta
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="min-h-[44px] min-w-[44px]"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
