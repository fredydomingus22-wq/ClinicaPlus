import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Button, 
  Card, 
  Badge, 
  HeroBanner,
  KpiCard,
  Skeleton,
  StatusBadge
} from '@clinicaplus/ui';
import { 
  Calendar, 
  Clock, 
  FileText, 
  Plus, 
  ChevronRight,
  Activity,
  Stethoscope
} from 'lucide-react';
import { useMeusAgendamentos } from '../../hooks/useAgendamentos';
import { useMinhasReceitas } from '../../hooks/useReceitas';
import { useAuthStore } from '../../stores/auth.store';
import { formatDate, formatTime, getGreeting } from '@clinicaplus/utils';
import { EstadoAgendamento } from '@clinicaplus/types';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { utilizador } = useAuthStore();
  
  const { data: agendamentos, isLoading: loadingAgendamentos } = useMeusAgendamentos();
  const { data: receitas, isLoading: loadingReceitas } = useMinhasReceitas();

  const proximos = agendamentos?.items?.filter(a => 
    a.estado === EstadoAgendamento.PENDENTE || a.estado === EstadoAgendamento.CONFIRMADO
  ) || [];

  const historico = agendamentos?.items?.filter(a => 
    a.estado === EstadoAgendamento.CONCLUIDO || a.estado === EstadoAgendamento.CANCELADO
  ).slice(0, 3) || [];

  const receitasActivas = receitas?.length || 0;

  if (loadingAgendamentos || loadingReceitas) {
    return (
      <div className="space-y-8 animate-fade-in pb-10">
        <Skeleton className="h-48 w-full rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {[1, 2].map(i => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
          </div>
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <HeroBanner 
        title={`${getGreeting()}, ${utilizador?.nome || 'Paciente'}`}
        subtitle="Portal do Paciente | Central de Consultas e Receitas"
        action={
          <Button 
            size="sm" 
            onClick={() => navigate('/paciente/agendar')}
            className="bg-neutral-900 text-white hover:bg-black border-none shadow-sm px-5 rounded-lg font-black text-[10px] h-9 transition-all uppercase tracking-[0.15em]"
          >
            <Plus className="w-3.5 h-3.5 mr-2" /> Agendar
          </Button>
        }
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KpiCard 
          label="Consultas" 
          value={proximos.length} 
          icon={Calendar} 
          color="blue"
        />
        <KpiCard 
          label="Prescrições" 
          value={receitasActivas} 
          icon={FileText} 
          color="green"
        />
        <KpiCard 
          label="Saúde" 
          value="Ativo" 
          icon={Activity} 
          color="amber"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Proximos Agendamentos */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary-600" /> Próximas Marcações
            </h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/paciente/agendamentos')}>
              Ver todas <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          <div className="space-y-4">
            {proximos.length === 0 ? (
              <Card className="p-10 text-center border-dashed border-2 bg-neutral-50/50 rounded-3xl">
                <div className="h-20 w-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-neutral-100">
                  <Calendar className="h-8 w-8 text-neutral-300" />
                </div>
                <h3 className="font-bold text-neutral-900 mb-1">Sem consultas agendadas</h3>
                <p className="text-neutral-500 text-sm mb-6 max-w-xs mx-auto">Mantenha a sua saúde em dia agendando uma revisão com os nossos especialistas.</p>
                <Button variant="secondary" onClick={() => navigate('/paciente/agendar')} className="rounded-xl px-8 font-bold">
                  Agendar Agora
                </Button>
              </Card>
            ) : (
              proximos.map((ag) => (
                <Card key={ag.id} className="p-5 hover:border-primary-100 hover:shadow-xl hover:-translate-y-1 transition-all group rounded-2xl relative overflow-hidden">
                  <div className="flex items-center gap-5">
                    <div className="shrink-0 w-16 h-16 bg-white rounded-2xl flex flex-col items-center justify-center border border-neutral-100 shadow-sm group-hover:bg-primary-50 group-hover:border-primary-100 transition-all text-center">
                      <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest group-hover:text-primary-500 leading-none mb-1">
                        {new Date(ag.dataHora).toLocaleDateString('pt-AO', { month: 'short' })}
                      </span>
                      <span className="text-2xl font-black text-neutral-900 group-hover:text-primary-700">
                        {new Date(ag.dataHora).getDate()}
                      </span>
                    </div>
                    
                    <div className="flex-1 min-w-0 py-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-neutral-900 truncate text-lg group-hover:text-primary-700 transition-colors">Dr(a). {ag.medico?.nome}</h4>
                        <StatusBadge estado={ag.estado} />
                      </div>
                      <p className="text-sm text-neutral-600 font-bold flex items-center gap-1.5">
                         <span className="p-1 bg-neutral-100 rounded group-hover:bg-white transition-colors inline-flex">
                           <Stethoscope className="w-3 h-3 text-primary-500" />
                         </span>
                         {ag.medico?.especialidade?.nome} <span className="text-neutral-400">•</span> {formatTime(new Date(ag.dataHora))}
                      </p>
                    </div>

                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="hidden sm:flex rounded-xl font-bold text-xs gap-1 hover:bg-primary-50 hover:text-primary-700" 
                      onClick={() => navigate(`/paciente/agendamentos`)}
                    >
                      Detalhes <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Histórico e Links Rápidos */}
        <div className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-success-600" /> Histórico Recente
            </h2>
            <div className="space-y-3">
              {historico.length === 0 ? (
                <p className="text-sm text-neutral-400 italic">Sem histórico recente.</p>
              ) : (
                historico.map((h) => (
                  <div key={h.id} className="flex items-center gap-3 p-3 rounded-lg bg-neutral-50 border border-transparent hover:border-neutral-200 transition-all">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                      <Calendar className="w-5 h-5 text-neutral-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm text-neutral-500">
                        <Stethoscope className="w-4 h-4" />
                        <span>{h.medico?.especialidade?.nome}</span>
                      </div>
                      <p className="text-xs text-neutral-500">{formatDate(new Date(h.dataHora))}</p>
                    </div>
                    <Badge variant="neutral" className="text-[10px] opacity-70">
                      {h.estado}
                    </Badge>
                  </div>
                ))
              )}
            </div>
            {historico.length > 0 && (
              <Button variant="ghost" size="sm" fullWidth onClick={() => navigate('/paciente/agendamentos')}>
                Ver todo o histórico
              </Button>
            )}
          </div>

          <Card className="p-8 bg-primary-900 text-white border-0 shadow-xl overflow-hidden relative group rounded-3xl">
            <div className="relative z-10">
              <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6 backdrop-blur-md border border-white/10 group-hover:scale-110 transition-transform duration-500">
                 <Activity className="h-6 w-6 text-teal-400" />
              </div>
              <h3 className="text-xl font-bold mb-3 tracking-tight text-white">Precisa de Ajuda?</h3>
              <p className="text-white text-sm leading-relaxed mb-8 opacity-90 font-medium">
                Contacte a nossa equipa de suporte para qualquer dúvida clínica ou técnica.
              </p>
              <Button 
                variant="secondary" 
                size="sm" 
                className="bg-white text-primary-900 hover:bg-primary-50 border-none font-bold rounded-xl px-6"
              >
                Contactar Clínica
              </Button>
            </div>
            <Activity className="absolute -bottom-10 -right-10 h-48 w-48 text-white/5 rotate-12 group-hover:rotate-45 transition-transform duration-1000" />
          </Card>
        </div>
      </div>
    </div>
  );
}
