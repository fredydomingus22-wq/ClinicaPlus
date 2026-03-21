import React, { useState, useEffect } from 'react';
import { Card, Button } from '@clinicaplus/ui';
import { 
  Smartphone, RefreshCw, LogOut, Trash2, ShieldCheck, Check, 
  AlertCircle, Calendar, Bell
} from 'lucide-react';
import { WaInstancia } from '../../api/whatsapp';
import { useWhatsAppQrCode, useWhatsAppStatus, whatsappKeys } from '../../hooks/useWhatsApp';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

// --- QrCountdown (ref: ui-painel.md §140-163) ---

function QrCountdown({ expiresAt }: { expiresAt?: string | undefined }) {
  const [segundos, setSegundos] = useState(0);

  useEffect(() => {
    if (!expiresAt) return;
    const calcular = () => {
      const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setSegundos(diff);
    };
    calcular();
    const interval = setInterval(calcular, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (!expiresAt) return null;

  return (
    <span className={`text-[9px] font-mono font-bold ${segundos < 15 ? 'text-red-600' : 'text-warning-600'}`}>
      {segundos > 0 ? `Expira em ${segundos}s` : 'A renovar...'}
    </span>
  );
}

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
  const isErro = instancia.estado === 'ERRO';
  const queryClient = useQueryClient();
  const [showConfirmDesligar, setShowConfirmDesligar] = useState(false);
  
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

  // --- ESTADO: ERRO (ref: ui-painel.md §228-250) ---
  if (isErro) {
    return (
      <Card className="h-full border-2 border-red-200 shadow-sm p-0 overflow-hidden flex flex-col bg-red-50 min-h-[300px]">
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mb-4 border border-red-200">
            <AlertCircle className="w-7 h-7 text-red-500" />
          </div>
          <h3 className="text-lg font-bold text-red-800 tracking-tight">Erro na conexão</h3>
          <p className="text-xs text-red-600 font-medium mt-2 max-w-[220px]">
            {instancia.erroMensagem ?? 'Ocorreu um erro inesperado. Tenta reconectar.'}
          </p>
        </div>
        <div className="p-3 bg-red-100/50 border-t border-red-200 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onConectar(instancia.id)}
            loading={!!isCreating}
            className="font-bold flex-1 h-8 text-[10px] border-red-300 text-red-700"
          >
            <RefreshCw className="w-3 h-3 mr-1.5" />
            Tentar novamente
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEliminar(instancia.id)}
            loading={!!isEliminating}
            className="text-red-500 hover:text-red-700 font-bold flex-1 h-8 text-[10px]"
          >
            <Trash2 className="w-3 h-3 mr-1.5" />
            Novo QR
          </Button>
        </div>
      </Card>
    );
  }

  // --- ESTADO: DESCONECTADO ---
  if (isDesconectado && !qrCode) {
    return (
      <Card className="h-full border-neutral-200/60 shadow-sm p-6 flex flex-col items-center justify-center text-center bg-white min-h-[300px]">
        <div className="w-14 h-14 bg-success-50 rounded-2xl flex items-center justify-center mb-4 border border-success-100">
          <Smartphone className="w-7 h-7 text-success-600" />
        </div>
        <h3 className="text-lg font-bold text-neutral-900 tracking-tight">WhatsApp não ligado</h3>
        <p className="text-xs text-neutral-500 font-medium max-w-[200px] mt-2 mb-6 leading-relaxed">
          Liga um número WhatsApp para activar as automações da clínica.
        </p>
        <Button 
          onClick={() => onConectar(instancia.id)} 
          loading={!!isCreating}
          className="font-bold w-full shadow-sm bg-green-600 hover:bg-green-700"
        >
          <Smartphone className="w-4 h-4 mr-2" />
          Conectar WhatsApp
        </Button>
        <p className="text-[10px] text-neutral-400 mt-3">
          Vai aparecer um QR code para escanear com o teu telemóvel.
        </p>
      </Card>
    );
  }

  // --- ESTADO: AGUARDA_QR (ref: ui-painel.md §69-138) ---
  if (!isConectado && (isAguardando || qrCode)) {
    return (
      <Card className="h-full border-2 border-warning-200/50 shadow-sm overflow-hidden flex flex-col bg-white min-h-[300px]">
        {/* Header Ribbon */}
        <div className="bg-warning-50 px-4 py-2 border-b border-warning-100 flex items-center justify-between">
          <span className="text-[9px] font-bold text-warning-800 uppercase tracking-widest flex items-center gap-1.5">
            <RefreshCw className="w-3 h-3 animate-spin" />
            A aguardar scan do QR Code
          </span>
          <QrCountdown expiresAt={instancia.qrExpiresAt} />
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

          {/* Instruções detalhadas (ref: ui-painel.md §109-123) */}
          <ol className="mt-4 space-y-1.5 text-left max-w-[220px]">
            {[
              'Abre o WhatsApp no teu telemóvel',
              'Toca em ⋮ (menu) ou em Definições',
              'Selecciona "Dispositivos ligados"',
              'Toca em "Ligar um dispositivo"',
              'Aponta a câmara para o QR Code',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-[10px] text-neutral-600">
                <span className="w-4 h-4 rounded-full bg-warning-100 text-warning-700 text-[9px] flex items-center justify-center flex-shrink-0 font-bold mt-0.5">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
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

  // --- ESTADO: CONECTADO (ref: ui-painel.md §167-224) ---
  return (
    <>
      <Card className="h-full border-2 border-success-200/50 shadow-sm overflow-hidden flex flex-col bg-white min-h-[300px]">
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

          {/* Data de conexão */}
          {instancia.atualizadoEm && (
            <p className="text-[10px] text-success-600 mt-1">
              Desde {format(new Date(instancia.atualizadoEm), "EEE, d MMM", { locale: pt })}
            </p>
          )}

          {/* Stats rápidas (ref: ui-painel.md §196-199) */}
          <div className="flex items-center gap-4 mt-3 text-[10px] text-success-700">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" /> {instancia.marcacoesHoje ?? 0} hoje
            </span>
            <span className="flex items-center gap-1">
              <Bell className="w-3 h-3" /> {instancia.lembretesEnviados ?? 0} lembretes
            </span>
          </div>
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
            onClick={() => setShowConfirmDesligar(true)}
            loading={!!isEliminating}
            className="font-bold flex-1 h-8 text-[10px]"
          >
            <LogOut className="w-3 h-3 mr-1.5" />
            Desligar
          </Button>
        </div>
      </Card>

      {/* Modal de confirmação para desligar (ref: ui-painel.md §215-223) */}
      {showConfirmDesligar && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowConfirmDesligar(false)}>
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-neutral-900">Desligar WhatsApp</h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Desligar irá pausar todas as automações activas. As conversas em curso serão interrompidas. Confirmas?
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setShowConfirmDesligar(false)}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => { setShowConfirmDesligar(false); onEliminar(instancia.id); }}
                loading={!!isEliminating}
              >
                Sim, desligar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
