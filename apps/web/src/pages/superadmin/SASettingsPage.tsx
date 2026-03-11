import React, { useState, useEffect } from 'react';
import { useGlobalSettings, useUpdateGlobalSettings } from '../../hooks/useSuperAdmin';
import { Button, Input, ErrorMessage, Badge } from '@clinicaplus/ui';
import { Settings, Save, AlertTriangle } from 'lucide-react';

export function SASettingsPage() {
  const { data, isLoading, error } = useGlobalSettings();
  const { mutate: updateSettings, isPending } = useUpdateGlobalSettings();
  
  const [formData, setFormData] = useState({
    modoManutencao: false,
    registoNovasClinicas: true,
    maxUploadSizeMb: 5,
    mensagemSistema: ''
  });

  useEffect(() => {
    if (data) {
      setFormData({
        modoManutencao: data.modoManutencao,
        registoNovasClinicas: data.registoNovasClinicas,
        maxUploadSizeMb: data.maxUploadSizeMb,
        mensagemSistema: data.mensagemSistema || ''
      });
    }
  }, [data]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (confirm('Atenção: Estas alterações afetam todas as clínicas e utilizadores do sistema. Continuar?')) {
      const payload = {
        ...formData,
        mensagemSistema: formData.mensagemSistema.trim() === '' ? null : formData.mensagemSistema
      };
      updateSettings(payload as Parameters<typeof updateSettings>[0]);
    }
  };

  if (isLoading) return <div className="p-8 text-sa-text-muted font-mono animate-pulse">CARREGANDO CONFIGURAÇÕES...</div>;
  if (error) return <ErrorMessage error={error} className="m-8" />;

  return (
    <div className="p-8 space-y-6 animate-fade-in w-full max-w-4xl mx-auto pb-20">
      
      <div className="border border-sa-warning/30 bg-sa-warning/5 rounded-xl p-4 flex gap-4 items-start shadow-sa-glow mb-8">
        <div className="h-10 w-10 shrink-0 rounded-full bg-sa-warning/20 flex items-center justify-center text-sa-warning border border-sa-warning/30">
          <Settings className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-sa-warning font-mono font-bold tracking-tight uppercase">Global System Configuration</h2>
          <p className="text-sa-text-muted text-sm mt-1 leading-relaxed">
            Parâmetros de configuração central do ClinicaPlus. Modificações nestes campos alteram o comportamento de toda a plataforma de imediato.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 bg-sa-surface border border-white/5 rounded-xl p-8 shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-sa-primary/50 to-transparent"></div>

        <div className="space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4 bg-white/5 p-5 rounded-lg border border-white/5">
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="pt-0.5">
                  <input 
                    type="checkbox" 
                    checked={formData.modoManutencao}
                    onChange={(e) => setFormData(f => ({ ...f, modoManutencao: e.target.checked }))}
                    className="w-5 h-5 rounded border-white/20 bg-sa-background text-sa-warning focus:ring-sa-warning/50 focus:ring-offset-sa-surface"
                  />
                </div>
                <div>
                  <p className="text-white font-semibold flex items-center gap-2">
                    Modo de Manutenção
                    {formData.modoManutencao && <span className="flex h-2 w-2 rounded-full bg-sa-destructive animate-pulse"></span>}
                  </p>
                  <p className="text-sm text-sa-text-muted mt-1">Bloqueia o acesso a todos os utilizadores (exceto Super Admins).</p>
                </div>
              </label>
            </div>

            <div className="space-y-4 bg-white/5 p-5 rounded-lg border border-white/5">
              <label className="flex items-start gap-3 cursor-pointer">
                <div className="pt-0.5">
                  <input 
                    type="checkbox" 
                    checked={formData.registoNovasClinicas}
                    onChange={(e) => setFormData(f => ({ ...f, registoNovasClinicas: e.target.checked }))}
                    className="w-5 h-5 rounded border-white/20 bg-sa-background text-sa-primary focus:ring-sa-primary/50 focus:ring-offset-sa-surface"
                  />
                </div>
                <div>
                  <p className="text-white font-semibold flex items-center gap-2">
                    Registo de Novas Clínicas
                    {formData.registoNovasClinicas && <span className="flex h-2 w-2 rounded-full bg-sa-primary"></span>}
                  </p>
                  <p className="text-sm text-sa-text-muted mt-1">Permitir a criação de novos tenants (onboarding automático).</p>
                </div>
              </label>
            </div>
          </div>

          <div className="space-y-6 pt-4 border-t border-white/5">
            <div className="max-w-md">
              <label className="block text-sm font-semibold text-white mb-2">Limite Global de Upload (MB)</label>
              <div className="flex items-center gap-3">
                <Input 
                  type="number" 
                  min="1" 
                  max="100"
                  value={formData.maxUploadSizeMb}
                  onChange={(e) => setFormData(f => ({ ...f, maxUploadSizeMb: parseInt(e.target.value) || 5 }))}
                  className="bg-sa-background border-white/10 text-white focus:ring-sa-primary/50"
                  required
                />
                <span className="text-sa-text-muted font-mono">MB</span>
              </div>
              <p className="text-xs text-sa-text-muted mt-2">Aplica-se a relatórios, imagens de perfil e logótipos em todos os tenants.</p>
            </div>

            <div className="pt-2">
              <label className="block text-sm font-semibold text-white mb-2 flex justify-between items-center">
                <span>Mensagem de Sistema (Banner Global)</span>
                {formData.mensagemSistema && <Badge variant="warning">Ativa</Badge>}
              </label>
              <textarea 
                value={formData.mensagemSistema}
                onChange={(e) => setFormData(f => ({ ...f, mensagemSistema: e.target.value }))}
                className="w-full h-24 bg-sa-background border border-white/10 rounded-lg p-3 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-sa-primary/50 focus:border-transparent transition-all disabled:opacity-50"
                placeholder="Ex: O sistema passará por manutenção agendada às 02h00 CAT..."
              />
              <p className="text-xs text-sa-text-muted mt-2">Esta mensagem será exibida no topo do ecrã para todos os utilizadores ativos atualmente no sistema.</p>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 flex justify-between items-center">
          <div className="flex items-center gap-2 text-sa-warning/80 text-[10px] font-mono tracking-widest uppercase">
            <AlertTriangle className="h-4 w-4" />
            <span>Caution: Global Impact Namespace</span>
          </div>
          <Button 
            type="submit" 
            disabled={isPending}
            className="bg-sa-primary hover:bg-sa-primary/90 text-sa-background font-bold font-mono shadow-sa-glow transition-all px-8"
          >
            {isPending ? 'GUARDANDO...' : 'EXECUTAR ALTERAÇÕES'}
            {!isPending && <Save className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      </form>
    </div>
  );
}
