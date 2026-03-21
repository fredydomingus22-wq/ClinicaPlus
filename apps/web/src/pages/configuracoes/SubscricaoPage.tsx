import React from 'react';
import { useClinicaMe } from '../../hooks/useClinicas';
import { useBilling } from '../../hooks/useBilling';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import { 
  Check, 
  X, 
  Calendar, 
  CreditCard, 
  TrendingUp, 
  ShieldCheck,
  ExternalLink
} from 'lucide-react';
import { EstadoSubscricao } from '@clinicaplus/types';
import type { SubscricaoHistoricoItem } from '../../hooks/useBilling';
import { Badge, Card, Table, Button } from '@clinicaplus/ui';

export function SubscricaoPage() {
  const { data: clinica, isLoading: loadingClinica } = useClinicaMe();
  const { subscricaoActual, historico, isLoading: loadingBilling } = useBilling();

  if (loadingClinica || loadingBilling) {
    return (
      <div className="p-12 flex justify-center items-center" role="status">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!clinica) return null;

  const getStatusVariant = (estado: EstadoSubscricao) => {
    switch (estado) {
      case EstadoSubscricao.ACTIVA: return 'success';
      case EstadoSubscricao.TRIAL: return 'info';
      case EstadoSubscricao.GRACE_PERIOD: return 'warning';
      case EstadoSubscricao.SUSPENSA: return 'error';
      default: return 'neutral';
    }
  };

  const getProgressColor = (current: number, max: number) => {
    if (max === -1) return 'bg-green-500';
    const percent = (current / max) * 100;
    if (percent > 95) return 'bg-red-500';
    if (percent > 80) return 'bg-amber-500';
    return 'bg-blue-500';
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Gestão de Plano</h1>
          <p className="text-neutral-500 text-sm font-medium">Gere a tua subscrição, limites e facturação.</p>
        </div>
        <Button 
          variant="primary"
          onClick={() => window.open('mailto:suporte@clinicaplus.io?subject=Upgrade de Plano')}
          className="shadow-sm"
        >
          <ExternalLink className="h-4 w-4 mr-2" /> Contactar para Upgrade
        </Button>
      </div>

      <Card className="p-0 overflow-hidden border-neutral-200/60 shadow-sm">
        <div className="p-6">
          <div className="flex flex-col md:flex-row justify-between gap-8">
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <Badge variant={getStatusVariant(clinica.subscricaoEstado as EstadoSubscricao)}>
                  {clinica.subscricaoEstado}
                </Badge>
                <h2 className="text-3xl font-bold text-neutral-900">Plano {clinica.plano}</h2>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center gap-6 text-sm text-neutral-500 font-medium">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary-500" />
                  <span>Vence em: <span className="text-neutral-900 font-bold">{clinica.subscricaoValidaAte ? format(parseISO(clinica.subscricaoValidaAte), "d 'de' MMMM, yyyy", { locale: pt }) : '...'}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-primary-500" />
                  <span className="text-neutral-900 font-bold">{subscricaoActual.diasRestantes} dias restantes</span>
                </div>
              </div>
            </div>
            
            <div className="bg-neutral-50 px-6 py-5 border border-neutral-100 rounded-xl flex flex-col justify-center text-center md:text-left min-w-[200px]">
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Próximo Pagamento</p>
              <p className="text-2xl font-bold text-neutral-900">0 Kz</p>
              <p className="text-[11px] text-neutral-400 font-medium mt-1">Incluído no plano actual</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-widest flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary-600" />
          Uso de Limites
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: 'Médicos', info: subscricaoActual?.limites?.medicos || { actual: 0, maximo: 0 } },
            { label: 'Consultas (Mês)', info: subscricaoActual?.limites?.consultas || { actual: 0, maximo: 0 } },
            { label: 'Pacientes', info: subscricaoActual?.limites?.pacientes || { actual: 0, maximo: 0 } },
            { label: 'API Keys', info: subscricaoActual?.limites?.apiKeys || { actual: 0, maximo: 0 } },
          ].map((item) => (
            <Card key={item.label} className="p-5 space-y-4 border-neutral-200/60 shadow-sm hover:border-primary-200 transition-colors">
              <div className="flex justify-between items-end">
                <span className="text-xs font-bold text-neutral-700 uppercase tracking-wide">{item.label}</span>
                <span className="text-sm font-bold text-neutral-900">
                  {item.info.maximo === -1 ? `${item.info.actual} / ∞` : `${item.info.actual} / ${item.info.maximo}`}
                </span>
              </div>
              <div className="h-2.5 bg-neutral-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ${getProgressColor(item.info.actual, item.info.maximo)}`}
                  style={{ width: item.info.maximo === -1 ? '100%' : `${Math.min((item.info.actual / item.info.maximo) * 100, 100)}%` }}
                />
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Secção 3 — Features do plano actual */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-widest flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary-600" />
            Funcionalidades
          </h2>
          <Card className="p-0 overflow-hidden border-neutral-200/60 shadow-sm">
            <Table 
              data={Object.entries(subscricaoActual.features || {})}
              keyExtractor={([key]) => key}
              columns={[
                {
                  header: 'Recurso',
                  accessor: ([key]: [string, boolean | string]) => (
                    <span className="capitalize text-neutral-600 text-xs font-medium">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  )
                },
                {
                  header: 'Estado',
                  accessor: ([, value]: [string, boolean | string]) => (
                    <div className="flex justify-end">
                      {typeof value === 'boolean' ? (
                        value ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <X className="w-4 h-4 text-neutral-300" />
                        )
                      ) : (
                        <Badge variant="neutral" className="text-[10px]">{value}</Badge>
                      )}
                    </div>
                  ),
                  className: "text-right"
                }
              ]}
            />
          </Card>
        </div>

        {/* Secção 4 — Histórico */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-widest flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary-600" />
            Histórico de Subscrições
          </h2>
          <Card className="p-0 overflow-hidden border-neutral-200/60 shadow-sm">
            <Table 
              data={historico || []}
              keyExtractor={(item) => item.id}
              columns={[
                {
                  header: 'Plano',
                  accessor: (item: SubscricaoHistoricoItem) => <span className="font-bold text-neutral-900">{item.plano}</span>
                },
                {
                  header: 'Estado',
                  accessor: (item: SubscricaoHistoricoItem) => (
                    <Badge variant={getStatusVariant(item.estado as EstadoSubscricao)}>
                      {item.estado}
                    </Badge>
                  )
                },
                {
                  header: 'Data',
                  accessor: (item: SubscricaoHistoricoItem) => (
                    <span className="text-neutral-500 text-xs">
                      {item.criadoEm ? format(parseISO(item.criadoEm), 'dd/MM/yyyy') : '---'}
                    </span>
                  )
                },
                {
                  header: 'Valor',
                  accessor: (item: SubscricaoHistoricoItem) => <span className="font-bold text-neutral-900">{item.valorKz || 0} Kz</span>,
                  className: "text-right"
                }
              ]}
              emptyMessage="Sem histórico disponível"
            />
          </Card>
        </div>
      </div>

      <div className="pt-8 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-neutral-900">Planos Disponíveis</h2>
          <p className="text-neutral-500 text-sm">Escolha o plano ideal para o crescimento da sua clínica.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              nome: 'BÁSICO',
              preco: 'Gratuito',
              descricao: 'Para consultórios individuais e pequenos.',
              features: [
                'Até 2 Médicos',
                '100 Consultas/mês',
                '500 Pacientes',
                'Agenda e Prontuário',
                'Faturação Básica',
              ],
              current: clinica.plano === 'BASICO'
            },
            {
              nome: 'PRO',
              preco: 'Sob Consulta',
              popular: true,
              descricao: 'Para clínicas em crescimento que precisam de automação.',
              features: [
                'Até 10 Médicos',
                'Consultas Ilimitadas',
                'Pacientes Ilimitados',
                'WhatsApp Automax (1 Instância)',
                'API Keys e Webhooks (3/5)',
                'Relatórios Avançados (12 Meses)',
                'Exportação CSV',
              ],
              current: clinica.plano === 'PRO'
            },
            {
              nome: 'ENTERPRISE',
              preco: 'Personalizado',
              descricao: 'Para grandes redes e hospitais privados.',
              features: [
                'Médicos Ilimitados',
                'Múltiplas Localizações',
                'WhatsApp Ilimitado',
                'Suporte Dedicado 24/7',
                'Audit Log Completo',
                'Integrações Customizadas',
              ],
              current: clinica.plano === 'ENTERPRISE'
            }
          ].map((plano) => (
            <Card 
              key={plano.nome} 
              className={`p-6 relative flex flex-col h-full border-2 transition-all duration-300 ${
                plano.current 
                  ? 'border-primary-500 bg-primary-50/30' 
                  : (plano.popular ? 'border-primary-200' : 'border-neutral-200')
              }`}
            >
              {plano.popular && !plano.current && (
                <div className="absolute top-0 right-6 -translate-y-1/2 bg-primary-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
                  Mais Popular
                </div>
              )}
              {plano.current && (
                <div className="absolute top-0 right-6 -translate-y-1/2 bg-green-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
                  Plano Atual
                </div>
              )}

              <div className="space-y-1 mb-5">
                <h3 className="text-lg font-bold text-neutral-900">{plano.nome}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed font-medium">{plano.descricao}</p>
              </div>

              <div className="mb-6">
                <span className="text-3xl font-bold text-neutral-900">{plano.preco}</span>
                {plano.preco !== 'Gratuito' && plano.preco !== 'Personalizado' && <span className="text-neutral-500 text-sm ml-1">/mês</span>}
              </div>

              <ul className="space-y-3 mb-8 flex-grow">
                {plano.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-neutral-600 font-medium leading-tight">
                    <Check className="w-4 h-4 text-primary-500 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button 
                variant={plano.current ? 'outline' : 'primary'}
                fullWidth
                disabled={plano.current}
                onClick={() => window.open(`mailto:suporte@clinicaplus.io?subject=Solicitação de Upgrade para ${plano.nome}`)}
                className="font-bold tracking-wide"
              >
                {plano.current ? 'Plano Activo' : (plano.nome === 'ENTERPRISE' ? 'Contactar Vendas' : 'Solicitar Upgrade')}
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
