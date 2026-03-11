import React from 'react';
import { useAuthStore } from '../../stores/auth.store';
import { 
  Card, 
  Button, 
  Badge, 
  Avatar, 
  Input, 
  Tabs,
} from '@clinicaplus/ui';
import { 
  Mail, 
  ShieldCheck, 
  Lock, 
  Smartphone,
  Clock,
  Briefcase,
  Award,
  DollarSign,
  Pencil
} from 'lucide-react';
import { getInitials } from '@clinicaplus/utils';

/**
 * Physician Profile Page.
 * Displays professional info, metrics and settings.
 */
export default function PerfilPage() {
  const utilizador = useAuthStore(s => s.utilizador);

  const TABS = [
    { id: 'GERAL', label: 'Dados Profissionais' },
    { id: 'SEGURANCA', label: 'Segurança e Acessos' },
    { id: 'CONFIG', label: 'Preferências' }
  ];

  return (
    <div className="max-w-screen-2xl mx-auto space-y-8 animate-fade-in pb-24 md:pb-12 px-4 sm:px-6">
      {/* Header with quick status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">O Meu Perfil Profissional</h1>
          <p className="text-neutral-500">Gerencie a sua visibilidade na plataforma e horários.</p>
        </div>
        <Badge variant="success" className="px-4 py-1.5 text-xs font-bold ring-4 ring-success-50">Médico Ativo</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Info & Stats */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-8">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="shrink-0">
                 <Avatar initials={getInitials(utilizador?.nome || 'M')} size="lg" className="border-4 border-white shadow-xl" />
              </div>
              <div className="flex-1 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-2xl font-bold text-neutral-900">{utilizador?.nome}</h2>
                    <p className="text-primary-600 font-bold text-sm uppercase tracking-widest mt-1">
                      {utilizador?.medico?.especialidade?.nome || 'Médico Clínico'}
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" className="font-bold">
                    <Pencil className="w-3.5 h-3.5 mr-2" /> Editar Perfil
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-neutral-100">
                  <div className="flex items-center gap-3 text-neutral-600">
                    <Mail className="w-4 h-4 opacity-50" />
                    <span className="text-sm font-medium">{utilizador?.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-neutral-600">
                    <Smartphone className="w-4 h-4 opacity-50" />
                    <span className="text-sm font-medium">+244 9XX XXX XXX</span>
                  </div>
                  <div className="flex items-center gap-3 text-neutral-600">
                    <Briefcase className="w-4 h-4 opacity-50" />
                    <span className="text-sm font-medium">OMSA: {utilizador?.medico?.ordem || '---'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-neutral-600">
                    <ShieldCheck className="w-4 h-4 text-success-500" />
                    <span className="text-sm font-bold text-neutral-900 tracking-tight">Acesso Nível Médico</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Tabs items={TABS} activeTab="GERAL" onChange={() => {}} className="bg-white p-1 rounded-xl border border-neutral-100 shadow-sm" />

          {/* Detailed Info Form Section (Placeholder) */}
          <Card className="p-8 space-y-6">
            <h3 className="font-bold text-neutral-900 border-b border-neutral-100 pb-4">Dados da Conta</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">Nome Completo</label>
                <Input value={utilizador?.nome} readOnly className="bg-neutral-50" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">Email Corporativo</label>
                <Input value={utilizador?.email} readOnly className="bg-neutral-50" />
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar Analytics */}
        <div className="space-y-6">
          <Card className="p-6 bg-primary-900 text-white border-0 shadow-xl shadow-primary-500/20 relative overflow-hidden group">
            <div className="relative z-10 space-y-4">
               <div className="flex items-center justify-between">
                  <Award className="w-8 h-8 text-teal-400 opacity-80" />
                  <Badge variant="neutral" className="bg-white/20 border-0 text-white text-[10px] font-bold">PREMIUM</Badge>
               </div>
               <div>
                  <p className="text-sm font-medium text-white opacity-70">Saldo Acumulado (Mês)</p>
                  <h3 className="text-3xl font-bold flex items-center gap-2 text-white">
                     <DollarSign className="w-6 h-6 text-teal-400" /> 1.250.000 <span className="text-xs opacity-60">Kz</span>
                  </h3>
               </div>
               <div className="pt-4 mt-4 border-t border-white/10 text-xs font-bold text-white opacity-70">
                  Próximo pagamento: 28 de Março
               </div>
            </div>
            {/* Abstract Background Element */}
            <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
          </Card>

          <Card className="p-6">
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-widest mb-6">Métricas de Performance</h3>
            <div className="space-y-6">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <div className="h-10 w-10 rounded-xl bg-orange-50 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-orange-500" />
                     </div>
                     <div>
                        <p className="text-xs font-bold text-neutral-900">Tempo Médio</p>
                        <p className="text-[10px] text-neutral-400 font-medium">Por consulta</p>
                     </div>
                  </div>
                  <span className="font-bold text-neutral-900">18 min</span>
               </div>
               
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <div className="h-10 w-10 rounded-xl bg-success-50 flex items-center justify-center">
                        <Lock className="w-5 h-5 text-success-500" />
                     </div>
                     <div>
                        <p className="text-xs font-bold text-neutral-900">Finalização</p>
                        <p className="text-[10px] text-neutral-400 font-medium">Taxa de sucesso</p>
                     </div>
                  </div>
                  <span className="font-bold text-neutral-900">98.2%</span>
               </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
