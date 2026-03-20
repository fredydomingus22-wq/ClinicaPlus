import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  CheckCheck, 
  Calendar, 
  FileText, 
  Info, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Clock,
  ExternalLink
} from 'lucide-react';
import { useNotificacoes } from '../../hooks/useNotificacoes';
import { useAuthStore } from '../../stores/auth.store';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { NotificacaoDTO } from '@clinicaplus/types';

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationsPanel({ isOpen, onClose }: NotificationsPanelProps) {
  const { notificacoes, unreadCount, markAsRead, markAllAsRead, isLoading } = useNotificacoes();
  const { utilizador } = useAuthStore();
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'AGENDAMENTO': return <Calendar className="w-4 h-4 text-primary-600" />;
      case 'RECEITA': return <FileText className="w-4 h-4 text-success-600" />;
      case 'SUCESSO': return <CheckCircle2 className="w-4 h-4 text-success-600" />;
      case 'AVISO': return <AlertTriangle className="w-4 h-4 text-warning-600" />;
      case 'ERRO': return <XCircle className="w-4 h-4 text-danger-600" />;
      default: return <Info className="w-4 h-4 text-primary-600" />;
    }
  };


  const handleNotificationClick = (n: NotificacaoDTO) => {
    if (!n.lida) {
      markAsRead.mutate(n.id);
    }
    if (n.url) {
      navigate(n.url);
      onClose();
    }
  };

  const goToHistory = () => {
    const papel = utilizador?.papel.toLowerCase();
    const basePath = papel === 'recepcionista' ? 'recepcao' : papel;
    navigate(`/${basePath}/notificacoes`);
    onClose();
  };

  return (
    <div 
      ref={panelRef}
      className="absolute right-[-1rem] sm:right-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden z-50 animate-in fade-in zoom-in duration-200"
    >
      <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-neutral-900" />
          <h3 className="font-bold text-neutral-900">Notificações</h3>
          {unreadCount > 0 && (
            <span className="bg-primary-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button 
            onClick={() => markAllAsRead.mutate()}
            className="text-xs text-primary-600 hover:text-primary-700 font-bold flex items-center gap-1 transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Marcar todas como lidas
          </button>
        )}
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-neutral-500 font-medium">A carregar...</p>
          </div>
        ) : notificacoes.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Bell className="w-6 h-6 text-neutral-300" />
            </div>
            <p className="text-sm font-bold text-neutral-900 mb-1">Sem notificações</p>
            <p className="text-xs text-neutral-500">Avisaremos quando houver novidades.</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {notificacoes.map((n) => (
              <button
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`w-full text-left p-4 hover:bg-neutral-50 transition-colors flex gap-3 relative group ${!n.lida ? 'bg-primary-50/30' : ''}`}
              >
                {!n.lida && (
                  <span className="absolute left-0 top-0 bottom-0 w-1 bg-primary-600" />
                )}
                <div className="w-8 h-8 rounded-full bg-white shadow-sm border border-neutral-100 flex items-center justify-center shrink-0">
                  {getIcon(n.tipo)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-0.5">
                    <p className={`text-sm font-bold truncate ${!n.lida ? 'text-neutral-900' : 'text-neutral-700'}`}>
                      {n.titulo}
                    </p>
                    <div className="flex items-center gap-1 text-[10px] text-neutral-400 whitespace-nowrap shrink-0">
                      <Clock className="w-2.5 h-2.5" />
                      {formatDistanceToNow(new Date(n.criadoEm), { addSuffix: true, locale: ptBR })}
                    </div>
                  </div>
                  <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed">
                    {n.mensagem}
                  </p>
                  {n.url && (
                    <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>Ver mais</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-neutral-100 bg-neutral-50/50 text-center">
        <button 
          onClick={goToHistory}
          className="text-xs font-black text-neutral-600 hover:text-primary-600 transition-colors uppercase tracking-wider"
        >
          Ver histórico completo
        </button>
      </div>
    </div>
  );
}
