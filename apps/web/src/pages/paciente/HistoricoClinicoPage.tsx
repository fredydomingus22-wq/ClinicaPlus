import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { Papel, PlanoTratamentoDTO, ExameDTO, AgendamentoDTO, EstadoAgendamento } from '@clinicaplus/types';
import { 
  ArrowLeft, 
  Activity, 
  Layers, 
  FileText, 
  Calendar,
  ClipboardList,
  Stethoscope,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { useHistoricoClinico } from '../../hooks/useTratamentos';
import { 
  Card, 
  Spinner, 
  ErrorMessage,
  Tabs,
  HeroBanner,
  KpiCard,
  Table,
  Badge,
  StatusBadge,
  Button
} from '@clinicaplus/ui';
import { PlanoTratamentoCard } from '../../components/tratamentos/PlanoTratamentoCard';
import { TratamentoDetalheModal } from '../../components/tratamentos/TratamentoDetalheModal';
import { formatDate, formatTime } from '@clinicaplus/utils';

interface TimelineEvent {
  id: string;
  type: 'EXAME' | 'PLANO' | 'CONSULTA';
  date: Date;
  title: string;
  subtitle: string;
  status: string;
  icon: any;
  color: string;
  raw: any;
}

export function HistoricoClinicoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { utilizador } = useAuthStore();
  const [selectedPlanoId, setSelectedPlanoId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('tratamentos');
  
  const pacienteId = id || utilizador?.paciente?.id || '';
  const { data, isLoading, error } = useHistoricoClinico(pacienteId);

  // Lógica de Timeline Unificada
  const timelineEvents = useMemo(() => {
    if (!data) return [];

    const events: TimelineEvent[] = [];

    // 1. Mapear Exames
    data.exames?.forEach((ex: ExameDTO) => {
      events.push({
        id: ex.id,
        type: 'EXAME',
        date: new Date(ex.criadoEm),
        title: ex.tipoCatalogo?.nome || ex.nome || 'Exame',
        subtitle: `Solicitado (ID: ${ex.medicoId || 'N/A'})`,
        status: ex.estado,
        icon: Layers,
        color: 'text-blue-500',
        raw: ex
      });
    });

    // 2. Mapear Planos
    data.planos?.forEach((pl: PlanoTratamentoDTO) => {
      events.push({
        id: pl.id,
        type: 'PLANO',
        date: new Date(pl.criadoEm),
        title: `Novo Plano: ${pl.tipoTratamento?.nome || 'Tratamento'}`,
        subtitle: `Iniciado em ${formatDate(new Date(pl.dataInicio))}`,
        status: pl.estado,
        icon: Activity,
        color: 'text-teal-500',
        raw: pl
      });
    });

    // 3. Mapear Consultas (Filtro: Concluídas e Futuras Confirmadas)
    data.consultas?.forEach((con: AgendamentoDTO) => {
      const isConcluido = con.estado === EstadoAgendamento.CONCLUIDO;
      const isFuturaConfirmada = con.estado === EstadoAgendamento.CONFIRMADO && new Date(con.dataHora) > new Date();
      
      if (isConcluido || isFuturaConfirmada) {
        events.push({
          id: con.id,
          type: 'CONSULTA',
          date: new Date(con.dataHora),
          title: `Consulta com ${con.medico?.nome}`,
          subtitle: `${con.medico?.especialidade?.nome || 'Clínica'} • ${formatTime(new Date(con.dataHora))}`,
          status: con.estado,
          icon: Stethoscope,
          color: isConcluido ? 'text-green-500' : 'text-primary-500',
          raw: con
        });
      }
    });

    // Ordenar por data decrescente
    return events.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [data]);

  // Derivar métricas para KPIs
  const planosAtivos = data?.planos?.filter((p: PlanoTratamentoDTO) => p.estado === 'ACTIVO').length || 0;
  const totalExames = data?.exames?.length || 0;
  const consultasConcluidas = data?.consultas?.filter(c => c.estado === EstadoAgendamento.CONCLUIDO).length || 0;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <Spinner size="lg" />
        <p className="text-neutral-500 font-medium animate-pulse">A carregar o seu prontuário clínico...</p>
      </div>
    );
  }

  if (error) {
    return <ErrorMessage error={error} />;
  }

  return (
    <div className="animate-fade-in pb-10">
      <HeroBanner 
        title="Histórico Clínico"
        subtitle="Portal do Paciente | Central de acompanhamento de saúde"
        action={
          (utilizador?.papel === Papel.ADMIN || utilizador?.papel === Papel.MEDICO) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="font-bold text-[10px] uppercase tracking-widest gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar
            </Button>
          )
        }
      />

      <div className="space-y-8">
        {/* Métricas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KpiCard 
            label="Planos de Tratamento" 
            value={planosAtivos} 
            icon={Activity} 
            color="blue"
            badgeText={planosAtivos > 0 ? 'Em Curso' : 'Mantenha-se Ativo'}
          />
          <KpiCard 
            label="Total de Exames" 
            value={totalExames} 
            icon={FileText} 
            color="slate"
            badgeText="Acervo Digital"
          />
          <KpiCard 
            label="Consultas Médicas" 
            value={consultasConcluidas} 
            icon={Stethoscope} 
            color="green"
            badgeText="Ciclos de Saúde"
          />
        </div>

        <Tabs 
          items={[
            { id: 'cronologia', label: 'CRONOLOGIA' },
            { id: 'tratamentos', label: 'TRATAMENTOS' },
            { id: 'exames', label: 'EXAMES' }
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        <div className="min-h-[400px]">
          {activeTab === 'cronologia' && (
            <div className="max-w-4xl mx-auto py-4">
              {timelineEvents.length > 0 ? (
                <div className="relative border-l-2 border-neutral-100 ml-6 pl-10 space-y-12 pb-10">
                  {timelineEvents.map((event) => (
                    <div key={event.id} className="relative group">
                      {/* Círculo do Timeline */}
                      <div className={`absolute -left-[54px] top-0 w-10 h-10 rounded-full bg-white border-2 border-neutral-100 flex items-center justify-center shadow-sm group-hover:border-primary-500 transition-colors z-10`}>
                        <event.icon className={`w-5 h-5 ${event.color}`} />
                      </div>
                      
                      {/* Conteúdo do Evento */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black font-mono text-neutral-400 uppercase tracking-widest">
                            {formatDate(event.date)}
                          </span>
                          <StatusBadge estado={event.status as EstadoAgendamento} />
                        </div>
                        
                        <div onClick={() => event.type === 'PLANO' && setSelectedPlanoId(event.id)}>
                        <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer">
                          <div className="flex justify-between items-start gap-4">
                            <div>
                               <h3 className="font-bold text-neutral-900 group-hover:text-primary-700 transition-colors">{event.title}</h3>
                               <p className="text-sm text-neutral-500 font-medium">{event.subtitle}</p>
                            </div>
                            {event.type === 'CONSULTA' && event.raw.notasConsulta && (
                              <div className="hidden sm:block">
                                <Badge variant="neutral" className="text-[10px] font-mono">Possui Notas</Badge>
                              </div>
                            )}
                          </div>
                        </Card>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Ponto Final do Timeline */}
                  <div className="absolute -left-[5px] -bottom-2 w-2 h-2 rounded-full bg-neutral-200" />
                </div>
              ) : (
                <div className="p-20 text-center">
                   <Clock className="w-12 h-12 text-neutral-200 mx-auto mb-4" />
                   <p className="text-neutral-400 font-medium italic">O seu historial clínico consolidado aparecerá aqui.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'tratamentos' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {data?.planos && data.planos.length > 0 ? (
                data.planos.map((plano: PlanoTratamentoDTO) => (
                  <div key={plano.id} onClick={() => setSelectedPlanoId(plano.id)} className="cursor-pointer">
                    <PlanoTratamentoCard plano={plano} />
                  </div>
                ))
              ) : (
                <Card className="md:col-span-2 p-16 text-center border-dashed border-2 bg-neutral-50/50 rounded-3xl">
                  <Activity className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                  <h3 className="font-bold text-neutral-900 mb-1">Sem planos de tratamento</h3>
                  <p className="text-neutral-500 text-sm">Os seus planos de reabilitação e fisioterapia aparecerão aqui quando iniciados.</p>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'exames' && (
            <Card className="overflow-hidden border-neutral-100 shadow-sm rounded-none">
              {data?.exames && data.exames.length > 0 ? (
                <Table 
                  columns={[
                    { 
                      header: 'Exame / Tipo', 
                      accessor: (item: ExameDTO) => (
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-neutral-100 rounded-lg">
                            <Layers className="w-4 h-4 text-neutral-500" />
                          </div>
                          <div>
                            <p className="font-bold text-neutral-900">{item.tipoCatalogo?.nome || item.nome}</p>
                            <p className="text-[10px] text-neutral-400 font-mono uppercase truncate max-w-[150px]">{item.id}</p>
                          </div>
                        </div>
                      )
                    },
                    { 
                      header: 'Médico Solicitante', 
                      accessor: (item: ExameDTO) => (
                        <div className="flex flex-col">
                          <span className="font-medium text-neutral-900">Dr(a). ID {item.medicoId || 'N/A'}</span>
                        </div>
                      ) 
                    },
                    { 
                      header: 'Data Solicitação', 
                      accessor: (item: ExameDTO) => (
                        <div className="flex items-center gap-2 text-neutral-500 font-mono text-xs">
                          <Calendar className="w-3 h-3" />
                          {formatDate(new Date(item.criadoEm))}
                        </div>
                      )
                    },
                    { 
                      header: 'Estado', 
                      accessor: (item: ExameDTO) => (
                        <div className="flex justify-end">
                           <StatusBadge estado={item.estado as EstadoAgendamento} />
                        </div>
                      ),
                      className: 'text-right'
                    }
                  ]}
                  data={data.exames}
                  keyExtractor={(item) => item.id}
                />
              ) : (
                <div className="p-20 text-center">
                   <FileText className="w-12 h-12 text-neutral-200 mx-auto mb-4" />
                   <p className="text-neutral-400 font-medium">Histórico de exames vazio.</p>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

      {selectedPlanoId && (
        <TratamentoDetalheModal 
          id={selectedPlanoId}
          isOpen={!!selectedPlanoId}
          onClose={() => setSelectedPlanoId(null)}
        />
      )}
    </div>
  );
}

export default HistoricoClinicoPage;
