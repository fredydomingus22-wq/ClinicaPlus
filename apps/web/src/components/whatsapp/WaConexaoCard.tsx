import React from 'react';
import { 
  MessageSquare, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  QrCode, 
  AlertCircle,
  Smartphone,
  Info,
  Settings
} from 'lucide-react';
import { Button, Card, Badge, Spinner, cn } from '@clinicaplus/ui';

interface WaConexaoCardProps {
  instancia: {
    estado: string;
    numeroTelefone?: string | null;
    qrCodeBase64?: string | null;
  };
  isLoading: boolean;
  isCreating: boolean;
  isDisconnecting: boolean;
  onConectar: () => void;
  onDesconectar: () => void;
}

export function WaConexaoCard({
  instancia,
  isLoading,
  isCreating,
  isDisconnecting,
  onConectar,
  onDesconectar
}: WaConexaoCardProps) {
  
  const estado = instancia?.estado || 'DESCONECTADO';

  const renderIcon = () => {
    switch (estado) {
      case 'CONECTADO': return <CheckCircle2 className="w-6 h-6 text-teal-500" />;
      case 'AGUARDA_QR': return <QrCode className="w-6 h-6 text-primary-500 animate-pulse" />;
      case 'CONECTANDO': return <RefreshCw className="w-6 h-6 text-amber-500 animate-spin" />;
      case 'ERRO': return <XCircle className="w-6 h-6 text-danger-500" />;
      default: return <MessageSquare className="w-6 h-6 text-neutral-400" />;
    }
  };

  const renderBadge = () => {
    switch (estado) {
      case 'CONECTADO': return <Badge variant="success" className="font-bold">CONECTADO</Badge>;
      case 'AGUARDA_QR': return <Badge variant="info" className="font-bold animate-pulse">AGUARDANDO SCAN</Badge>;
      case 'CONECTANDO': return <Badge variant="warning" className="font-bold">AUTENTICANDO...</Badge>;
      case 'ERRO': return <Badge variant="error" className="font-bold">ERRO DE CONEXÃO</Badge>;
      default: return <Badge variant="neutral" className="font-bold">DESCONECTADO</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card className="p-12 flex flex-col items-center justify-center border-neutral-100 bg-white/50 backdrop-blur-sm">
        <Spinner size="lg" className="text-primary-600 mb-4" />
        <p className="text-sm font-bold text-neutral-400 tracking-widest uppercase">Verificando Estado...</p>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "p-8 border-neutral-100 transition-all duration-500 relative overflow-hidden",
      estado === 'CONECTADO' ? "bg-teal-50/30 border-teal-100" : "bg-white"
    )}>
      {/* Background Decor */}
      <div className="absolute -right-4 -top-4 opacity-[0.03] rotate-12">
        <MessageSquare className="w-48 h-48 text-neutral-900" />
      </div>

      <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start md:items-center">
        {/* Connection Visual State */}
        <div className="shrink-0 flex items-center justify-center w-20 h-20 rounded-2xl bg-neutral-50 border border-neutral-100 shadow-sm relative">
           {renderIcon()}
           <div className="absolute -bottom-1 -right-1">
              <div className={cn(
                "w-4 h-4 rounded-full border-2 border-white",
                estado === 'CONECTADO' ? 'bg-teal-500' : 'bg-neutral-300'
              )} />
           </div>
        </div>

        <div className="flex-1">
           <div className="flex items-center gap-3 mb-2">
             <h3 className="text-xl font-bold text-neutral-900 tracking-tight">Estado do WhatsApp</h3>
             {renderBadge()}
           </div>
           <p className="text-sm text-neutral-500 leading-relaxed max-w-lg">
             {estado === 'CONECTADO' 
               ? `Conectado via número ${instancia.numeroTelefone || 'desconhecido'}. O sistema está pronto para automatizar agendamentos.`
               : 'Ligue o WhatsApp da clínica para ativar lembretes automáticos e marcação de consultas 24/7 via Inteligência Artificial.'}
           </p>
           
           {estado === 'CONECTADO' && (
             <div className="mt-4 flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
               <span className="flex items-center gap-1.5"><RefreshCw className="w-3 h-3" /> Auto-Sync Ativo</span>
               <span className="flex items-center gap-1.5 text-teal-600 underline cursor-pointer"><Settings className="w-3 h-3" /> Testar Conectividade</span>
             </div>
           )}
        </div>

        <div className="shrink-0">
           {estado === 'DESCONECTADO' ? (
             <Button 
               onClick={onConectar} 
               loading={isCreating}
               className="font-bold px-8 shadow-lg shadow-primary-500/20"
             >
               Conectar Agora
             </Button>
           ) : (
             <Button 
                variant="ghost" 
                onClick={onDesconectar} 
                loading={isDisconnecting}
                className="text-danger-600 hover:bg-danger-50 font-bold"
             >
               Desligar
             </Button>
           )}
        </div>
      </div>

      {/* QR CODE DISPLAY AREA */}
      {(estado === 'AGUARDA_QR' || (estado === 'CONECTANDO' && instancia.qrCodeBase64)) && (
        <div className="mt-10 pt-8 border-t border-neutral-100 flex flex-col lg:flex-row gap-12 animate-fade-in-up">
           <div className="shrink-0 space-y-4">
              <div className="p-4 bg-white rounded-3xl shadow-2xl border border-neutral-100 relative group">
                 {instancia.qrCodeBase64 ? (
                    <img 
                      src={instancia.qrCodeBase64} 
                      alt="WhatsApp QR Code" 
                      className="w-56 h-56 rounded-xl transition-opacity duration-300"
                    />
                 ) : (
                   <div className="w-56 h-56 flex items-center justify-center bg-neutral-50 rounded-xl">
                      <Spinner />
                   </div>
                 )}
                 <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-white/80 transition-all rounded-3xl">
                    <Button variant="ghost" size="sm" className="font-bold underline" onClick={() => window.location.reload()}>Actualizar</Button>
                 </div>
              </div>
              <p className="text-[10px] text-center font-bold text-neutral-400 uppercase tracking-[0.2em]">O QR Code actualiza automaticamente</p>
           </div>

           <div className="flex-1 space-y-6 self-center">
              <h4 className="text-lg font-bold text-neutral-900 tracking-tight flex items-center gap-2">
                 <Smartphone className="w-5 h-5 text-primary-500" /> Como associar?
              </h4>
              <ul className="space-y-4 text-sm text-neutral-600 font-medium">
                 <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[10px] shrink-0 font-bold mt-0.5">1</span>
                    Abra o WhatsApp no seu telemóvel institucional.
                 </li>
                 <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[10px] shrink-0 font-bold mt-0.5">2</span>
                    Toque em <span className="text-neutral-900 font-bold italic">Definições</span> (ou no menu ⋮) e selecione <span className="text-neutral-900 font-bold italic">Dispositivos Associados</span>.
                 </li>
                 <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[10px] shrink-0 font-bold mt-0.5">3</span>
                    Clique em <span className="text-neutral-900 font-bold italic">Associar um Dispositivo</span> e aponte a câmara para este ecrã.
                 </li>
              </ul>

              <div className="p-4 bg-primary-50/50 rounded-2xl border border-primary-100 flex gap-3 text-primary-700">
                 <Info className="w-5 h-5 shrink-0 mt-0.5" />
                 <p className="text-xs leading-relaxed italic">
                    Não feche esta página enquanto o scan não for concluído. A ligação será detectada automaticamente em segundos.
                 </p>
              </div>
           </div>
        </div>
      )}

      {estado === 'ERRO' && (
        <div className="mt-8 p-4 bg-danger-50 border border-danger-100 rounded-2xl flex items-center gap-4 text-danger-700 animate-shake">
           <AlertCircle className="w-6 h-6" />
           <p className="text-xs font-bold leading-relaxed">
              Ocorreu uma falha na comunicação com os servidores. Por favor, tente desconectar e gerar um novo QR Code.
           </p>
           <Button variant="danger" size="sm" className="ml-auto" onClick={onDesconectar}>Limpar Erro</Button>
        </div>
      )}
    </Card>
  );
}
