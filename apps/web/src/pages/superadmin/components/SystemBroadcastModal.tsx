import React from 'react';
import { useForm } from 'react-hook-form';
import { X, Megaphone, Loader2 } from 'lucide-react';
import { Button, Textarea } from '@clinicaplus/ui';
import { useGlobalSettings, useUpdateGlobalSettings } from '../../../hooks/useSuperAdmin';

interface SystemBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SystemBroadcastModal({ isOpen, onClose }: SystemBroadcastModalProps) {
  const { data: settings, isLoading } = useGlobalSettings();
  const { mutate: updateSettings, isPending } = useUpdateGlobalSettings();

  const {
    register,
    handleSubmit,
    formState: { isDirty },
    reset,
  } = useForm({
    values: {
      mensagemSistema: settings?.mensagemSistema || '',
    },
  });

  const onSubmit = (data: { mensagemSistema: string }) => {
    updateSettings({ mensagemSistema: data.mensagemSistema || null }, {
      onSuccess: () => {
        onClose();
      },
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-sa-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-sa-surface border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col">
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sa-primary/10 rounded-lg">
              <Megaphone className="w-5 h-5 text-sa-primary" />
            </div>
            <div>
              <h3 className="text-xl font-display font-medium text-white">Broadcast do Sistema</h3>
              <p className="text-sm text-sa-text-muted">Enviar uma mensagem para todos os utilizadores.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-sa-text-muted"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="h-40 flex flex-col items-center justify-center gap-3 text-sa-text-muted">
              <Loader2 className="w-6 h-6 animate-spin text-sa-primary" />
              <p className="text-xs font-mono uppercase tracking-widest">A carregar definições...</p>
            </div>
          ) : (
            <form id="broadcast-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-white/80">
                  Mensagem (Suporta Markdown)
                </label>
                <Textarea
                  placeholder="ex. Manutenção agendada para hoje às 22:00."
                  className="bg-sa-background/50 border-white/5 focus:border-sa-primary/50 min-h-[120px] text-white"
                  {...register('mensagemSistema')}
                />
                <p className="text-[10px] text-sa-text-muted italic">
                  Deixe vazio para remover o aviso actual.
                </p>
              </div>
            </form>
          )}
        </div>

        <div className="p-6 border-t border-white/5 bg-white/5 flex justify-end gap-3">
          <Button 
            variant="ghost" 
            onClick={onClose}
            type="button"
            className="text-white hover:bg-white/5"
          >
            CANCELAR
          </Button>
          <Button 
            form="broadcast-form"
            type="submit"
            disabled={isPending || !isDirty}
            className="bg-sa-primary text-sa-background font-bold px-8 shadow-[0_0_20px_rgba(var(--sa-primary),0.3)]"
          >
            {isPending ? 'A ATUALIZAR...' : 'ATUALIZAR BROADCAST'}
          </Button>
        </div>
      </div>
    </div>
  );
}
