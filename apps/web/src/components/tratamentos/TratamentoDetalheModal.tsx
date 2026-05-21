import React, { useState } from 'react';
import { 
  Modal, 
  Button, 
  Badge, 
  Spinner, 
  ErrorMessage,
  Textarea
} from '@clinicaplus/ui';
import { 
  useTratamento, 
  useUpdateSessao 
} from '../../hooks/useTratamentos';
import { 
  Activity, 
  Calendar, 
  Clock,
  User,
  ExternalLink
} from 'lucide-react';
import { formatDate } from '@clinicaplus/utils';
import { PlanoProgressBar } from './PlanoTratamentoCard';
import { useAuthStore } from '../../stores/auth.store';
import { Papel } from '@clinicaplus/types';

interface TratamentoDetalheModalProps {
  id: string;
  isOpen: boolean;
  onClose: () => void;
}

export function TratamentoDetalheModal({ id, isOpen, onClose }: TratamentoDetalheModalProps) {
  const { data: plano, isLoading, error } = useTratamento(id);
  const { mutate: updateSessao, isPending: isUpdating } = useUpdateSessao();
  const { utilizador } = useAuthStore();
  const [selectedSessaoId, setSelectedSessaoId] = useState<string | null>(null);
  const [sessionNotes, setSessionNotes] = useState('');

  const isMedico = utilizador?.papel === Papel.MEDICO || utilizador?.papel === Papel.ADMIN;

  const handleUpdateSessao = (sessaoId: string, estado: 'REALIZADO' | 'FALTOU') => {
    updateSessao({
      id: sessaoId,
      payload: { 
        estado, 
        notas: sessionNotes 
      }
    }, {
      onSuccess: () => {
        setSelectedSessaoId(null);
        setSessionNotes('');
      }
    });
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isLoading ? 'Carregando Tratamento...' : `Detalhes: ${plano?.tipoTratamento?.nome}`}
      size="xl"
    >
      {isLoading ? (
        <div className="py-20 flex justify-center">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <ErrorMessage error={error} />
      ) : (
        <div className="space-y-6">
          {/* Header Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-neutral-50 p-4 rounded-xl border border-neutral-100">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-neutral-600">
                <User className="h-4 w-4" />
                <span className="text-sm font-medium">Paciente: <span className="text-neutral-900">{plano.paciente?.nome}</span></span>
              </div>
              <div className="flex items-center gap-2 text-neutral-600">
                <Calendar className="h-4 w-4" />
                <span className="text-sm font-medium">Início: <span className="text-neutral-900">{formatDate(plano.dataInicio)}</span></span>
              </div>
              <div className="flex items-center gap-2 text-neutral-600">
                <Activity className="h-4 w-4" />
                <span className="text-sm font-medium">Médico: <span className="text-neutral-900">{plano.medico?.nome}</span></span>
              </div>
            </div>
            <div>
              <PlanoProgressBar 
                sessoesRealizadas={plano.sessoes?.filter((s: any) => s.estado === 'REALIZADO').length ?? plano.sessoesRealizadas ?? 0} 
                totalSessoes={plano.totalSessoes} 
              />
              <div className="mt-4 flex justify-between items-center text-xs text-neutral-500">
                <span>Estado: <Badge variant={plano.estado === 'ACTIVO' ? 'info' : 'success'}>{plano.estado}</Badge></span>
                <span>Frequência: {plano.frequenciaSemana}x / semana</span>
              </div>
            </div>
          </div>

          {/* Descrição */}
          {plano.descricao && (
            <div className="border-l-4 border-primary-500 pl-4 py-1">
              <h4 className="text-xs font-bold uppercase text-neutral-400 mb-1">Descrição Clínica</h4>
              <p className="text-sm text-neutral-700 leading-relaxed">{plano.descricao}</p>
            </div>
          )}

          {/* Listagem de Sessões */}
          <div className="space-y-4">
            <h4 className="flex items-center gap-2 text-sm font-bold text-neutral-900">
              <Clock className="h-4 w-4" /> Cronograma de Sessões
            </h4>
            
            <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
              {(plano.sessoes || []).map((sessao: any) => (
                <div 
                  key={sessao.id} 
                  className={`flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border transition-all ${
                    sessao.estado === 'REALIZADO' ? 'bg-success-50/30 border-success-100' : 'bg-white border-neutral-100'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      sessao.estado === 'REALIZADO' ? 'bg-success-100 text-success-700' : 'bg-neutral-100 text-neutral-600'
                    }`}>
                      {sessao.numeroSessao}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-neutral-800">
                          Sessão {sessao.numeroSessao}
                        </span>
                        <Badge variant={
                          sessao.estado === 'REALIZADO' ? 'success' : 
                          sessao.estado === 'FALTOU' ? 'error' : 'neutral'
                        }>
                          {sessao.estado}
                        </Badge>
                      </div>
                      <p className="text-xs text-neutral-500 flex items-center gap-1 mt-1">
                        <Calendar className="h-3 w-3" /> {formatDate(sessao.dataHora)}
                        {sessao.agendamento && <span className="text-primary-600 font-medium ml-1 flex items-center gap-1"><ExternalLink className="h-3 w-3" /> Marcado</span>}
                      </p>
                    </div>
                  </div>

                  {/* Ações para o Médico */}
                  {isMedico && sessao.estado === 'AGENDADO' && (
                    <div className="flex items-center gap-2 mt-3 md:mt-0">
                      {selectedSessaoId === sessao.id ? (
                        <div className="w-full space-y-2">
                          <Textarea 
                            placeholder="Notas da sessão..." 
                            value={sessionNotes}
                            onChange={(e) => setSessionNotes(e.target.value)}
                            rows={2}
                            className="bg-white text-sm"
                          />
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={() => setSelectedSessaoId(null)}>Cancelar</Button>
                            <Button 
                              size="sm" 
                              variant="danger" 
                              onClick={() => handleUpdateSessao(sessao.id, 'FALTOU')}
                              loading={isUpdating}
                            >Não Compareceu</Button>
                            <Button 
                              size="sm" 
                              onClick={() => handleUpdateSessao(sessao.id, 'REALIZADO')}
                              loading={isUpdating}
                            >Concluir</Button>
                          </div>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setSelectedSessaoId(sessao.id)}>
                          Actualizar Sessão
                        </Button>
                      )}
                    </div>
                  )}

                  {sessao.notas && sessao.estado !== 'AGENDADO' && (
                    <div className="mt-2 md:mt-0 text-[11px] text-neutral-600 bg-neutral-50 p-2 rounded italic border border-neutral-100 md:max-w-[250px]">
                      "{sessao.notas}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end pb-2">
            <Button variant="ghost" onClick={onClose}>Fechar</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default TratamentoDetalheModal;
