import React from 'react';
import { 
  Bell, 
  Calendar, 
  FileText, 
  Info, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Clock,
  CheckCheck,
  Inbox
} from 'lucide-react';
import { useNotificacoes } from '../hooks/useNotificacoes';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button, Card, Badge, EmptyState } from '@clinicaplus/ui';
import { useNavigate } from 'react-router-dom';
import { NotificacaoDTO } from '@clinicaplus/types';

export default function NotificacoesPage() {
  const { notificacoes, isLoading, unreadCount, markAsRead, markAllAsRead } = useNotificacoes();
  const navigate = useNavigate();

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'AGENDAMENTO': return <Calendar className="w-5 h-5 text-primary-600" />;
      case 'RECEITA': return <FileText className="w-5 h-5 text-success-600" />;
      case 'SUCESSO': return <CheckCircle2 className="w-5 h-5 text-success-600" />;
      case 'AVISO': return <AlertTriangle className="w-5 h-5 text-warning-600" />;
      case 'ERRO': return <XCircle className="w-5 h-5 text-danger-600" />;
      default: return <Info className="w-5 h-5 text-primary-600" />;
    }
  };

  const handleNotificationClick = (n: NotificacaoDTO) => {
    if (!n.lida) {
      markAsRead.mutate(n.id);
    }
    if (n.url) {
      navigate(n.url);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-4 md:py-8 px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary-600" />
            Notificações
          </h1>
          <p className="text-neutral-500 font-medium">
            Acompanhe as atualizações e alertas do sistema.
          </p>
        </div>

        {unreadCount > 0 && (
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => markAllAsRead.mutate()}
            className="flex items-center gap-2"
          >
            <CheckCheck className="w-4 h-4" />
            Marcar todas como lidas
          </Button>
        )}
      </div>

      <Card className="overflow-hidden border-none shadow-sm">
        {isLoading ? (
          <div className="p-20 text-center">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-neutral-500 font-bold">A carregar notificações...</p>
          </div>
        ) : notificacoes.length === 0 ? (
          <div className="py-20">
            <EmptyState
              icon={Inbox}
              title="Sem notificações por aqui"
              description="Não encontramos nenhuma notificação recente na sua conta."
            />
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {notificacoes.map((n) => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`p-6 transition-all cursor-pointer flex gap-4 md:gap-6 relative group ${!n.lida ? 'bg-primary-50/20 hover:bg-primary-50/40' : 'hover:bg-neutral-50'}`}
              >
                {!n.lida && (
                  <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary-600" />
                )}
                
                <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-neutral-100 flex items-center justify-center shrink-0">
                  {getIcon(n.tipo)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-2 mb-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className={`text-base font-bold ${!n.lida ? 'text-neutral-900' : 'text-neutral-600'}`}>
                          {n.titulo}
                        </h3>
                        {!n.lida && (
                          <Badge variant="info">Nova</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-neutral-400 font-bold uppercase tracking-wider">
                        <Clock className="w-3 h-3" />
                        {format(new Date(n.criadoEm), "d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                      </div>
                    </div>
                  </div>
                  
                  <p className={`text-sm leading-relaxed mb-4 ${!n.lida ? 'text-neutral-800' : 'text-neutral-500'}`}>
                    {n.mensagem}
                  </p>

                  {n.url && (
                    <Button variant="ghost" size="sm" className="text-primary-600 font-black p-0 h-auto hover:bg-transparent">
                      Visualizar detalhes →
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
