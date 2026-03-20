import React from 'react';
import { Card, Button } from '@clinicaplus/ui';
import { Smartphone, RefreshCw, LogOut, Trash2, ShieldCheck, Check } from 'lucide-react';
import { WaInstancia } from '../../api/whatsapp';
import { useWhatsAppQrCode, useWhatsAppStatus, whatsappKeys } from '../../hooks/useWhatsApp';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

interface WaConexaoCardProps {
  instancia: WaInstancia;
  onConectar: (id: string) => void;
  onEliminar: (id: string) => void;
  isCreating?: boolean;
  isEliminating?: boolean;
}

export const WaConexaoCard: React.FC<WaConexaoCardProps> = ({ 
  instancia, 
  onConectar, 
  onEliminar,
  isCreating,
  isEliminating
}) => {
  const isConectado = instancia.estado === 'CONECTADO';
  const isAguardando = instancia.estado === 'AGUARDA_QR';
  const isDesconectado = instancia.estado === 'DESCONECTADO';
  const queryClient = useQueryClient();
  
  // Polling only if waiting
  const statusQuery = useWhatsAppStatus(instancia.id, isAguardando);
  useEffect(() => {
    if (statusQuery.data?.estado === 'CONECTADO' && !isConectado) {
      queryClient.invalidateQueries({ queryKey: whatsappKeys.instancias() });
    }
  }, [statusQuery.data?.estado, isConectado, queryClient]);

  // Polling QR only if waiting and we don't have it
  const { data: pollData } = useWhatsAppQrCode(instancia.id, isAguardando && !instancia.qrCodeBase64);
  const qrCode = instancia.qrCodeBase64 || pollData?.qrcode;

  // ESTADO: DESCONECTADO
  if (isDesconectado && !qrCode) {
    return (
      <Card className="h-full border-neutral-200/60 shadow-sm p-6 flex flex-col items-center justify-center text-center bg-white min-h-[300px]">
        <div className="w-14 h-14 bg-success-50 rounded-2xl flex items-center justify-center mb-4 border border-success-100">
          <Smartphone className="w-7 h-7 text-success-600" />
        </div>
        <h3 className="text-lg font-bold text-neutral-900 tracking-tight">Setup Inicial</h3>
        <p className="text-xs text-neutral-500 font-medium max-w-[200px] mt-2 mb-6 leading-relaxed">
          Nenhum dispositivo ligado. Conecta agora para activar.
        </p>
        <Button 
          onClick={() => onConectar(instancia.id)} 
          loading={!!isCreating}
          className="font-bold w-full shadow-sm"
        >
          Conectar WhatsApp
        </Button>
      </Card>
    );
  }

  // ESTADO: AGUARDA_QR ou QR Disponível (apenas se não estiver conectado)
  if (!isConectado && (isAguardando || qrCode)) {
    return (
      <Card className="h-full border-warning-200/50 shadow-sm overflow-hidden flex flex-col bg-white min-h-[300px]">
        {/* Header Ribbon */}
        <div className="bg-warning-50 px-4 py-2 border-b border-warning-100 flex items-center justify-between">
          <span className="text-[9px] font-bold text-warning-800 uppercase tracking-widest flex items-center gap-1.5">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Aguardando Leitura
          </span>
          <span className="text-[9px] font-bold text-warning-700 bg-warning-100/50 px-1.5 py-0.5 rounded">
            QR CODE
          </span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="relative group">
            <div className="bg-white p-2 rounded-xl border border-neutral-200 shadow-sm flex items-center justify-center transition-transform hover:scale-105">
              {qrCode ? (
                <img 
                  src={qrCode} 
                  alt="WhatsApp QR Code" 
                  className="w-[140px] h-[140px] mix-blend-multiply"
                />
              ) : (
                <div className="w-[140px] h-[140px] bg-neutral-50/50 flex flex-col items-center justify-center">
                  <RefreshCw className="w-6 h-6 text-neutral-300 animate-spin mb-2" />
                  <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">A Gerar...</span>
                </div>
              )}
            </div>
          </div>
          <p className="text-[10px] font-medium text-neutral-500 text-center mt-4">
            Abre o WhatsApp no telemóvel<br /> e escaneia o código acima
          </p>
        </div>

        {/* Footer Actions */}
        <div className="bg-neutral-50 border-t border-neutral-100 p-3 flex items-center gap-2">
           <Button 
             variant="outline"
             size="sm"
             onClick={() => onConectar(instancia.id)}
             loading={!!isCreating}
             className="font-bold flex-1 h-8 text-[10px]"
           >
             <RefreshCw className="w-3 h-3 mr-1.5" />
             Reload
           </Button>
           <Button 
             variant="ghost" 
             size="sm" 
             onClick={() => onEliminar(instancia.id)}
             loading={!!isEliminating}
             className="text-red-500 hover:text-red-700 hover:bg-red-50 font-bold flex-1 h-8 text-[10px]"
           >
             <Trash2 className="w-3 h-3 mr-1.5" />
             Cancelar
           </Button>
        </div>
      </Card>
    );
  }

  // ESTADO: CONECTADO
  return (
    <Card className="h-full border-success-200/50 shadow-sm overflow-hidden flex flex-col bg-white min-h-[300px]">
      <div className="bg-success-50 px-4 py-2 border-b border-success-100 flex items-center justify-between">
        <span className="text-[9px] font-bold text-success-800 uppercase tracking-widest flex items-center gap-1.5">
          <ShieldCheck className="w-3 h-3" />
          Sessão Segura
        </span>
        <span className="flex items-center gap-1.5 text-[9px] font-bold text-success-700 bg-success-100/50 px-1.5 py-0.5 rounded uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-success-500 animate-pulse" />
          Online
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-success-50 rounded-full flex items-center justify-center mb-4 border border-success-100 ring-4 ring-success-50/50">
          <Check className="w-8 h-8 text-success-600" />
        </div>
        
        <h3 className="text-xl font-bold font-mono text-neutral-900 tracking-tight">
          {instancia.numeroTelefone || instancia.evolutionName || 'Dispositivo'}
        </h3>
      </div>
      
      <div className="p-3 border-t border-neutral-100 flex gap-2">
        <Button 
          variant="outline"
          size="sm"
          onClick={() => onConectar(instancia.id)}
          loading={!!isCreating}
          className="font-bold flex-1 h-8 text-[10px]"
        >
          <RefreshCw className="w-3 h-3 mr-1.5" />
          Reconectar
        </Button>
        <Button 
          variant="danger" 
          size="sm" 
          onClick={() => onEliminar(instancia.id)}
          loading={!!isEliminating}
          className="font-bold flex-1 h-8 text-[10px]"
        >
          <LogOut className="w-3 h-3 mr-1.5" />
          Desligar
        </Button>
      </div>
    </Card>
  );
};
