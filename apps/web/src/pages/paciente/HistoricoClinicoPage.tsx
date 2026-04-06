import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useHistoricoClinico } from '../../hooks/useTratamentos';
import { 
  Tabs, 
  Card, 
  EmptyState, 
  Spinner, 
  ErrorMessage, 
  Button 
} from '@clinicaplus/ui';
import { ExamesTab } from '../../components/tratamentos/ExamesTab';
import { PlanoTratamentoCard } from '../../components/tratamentos/PlanoTratamentoCard';
import { 
  Activity, 
  History, 
  Plus, 
  ChevronLeft 
} from 'lucide-react';
import { ExameDTO, PlanoTratamentoDTO } from '@clinicaplus/types';

export const HistoricoClinicoPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('exames');
  
  const { data, isLoading, isError, error } = useHistoricoClinico(id || '');

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Spinner className="w-10 h-10 text-primary-600" />
        <p className="text-neutral-500 font-medium animate-pulse">A carregar registos clínicos...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8">
        <ErrorMessage error={error} />
      </div>
    );
  }

  const exames: ExameDTO[] = data?.exames || [];
  const planos: PlanoTratamentoDTO[] = data?.planos || [];

  const tabItems = [
    { id: 'exames', label: 'Pedidos de Exame' },
    { id: 'planos', label: 'Planos de Tratamento' },
  ];

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
      {/* Header com Navegação */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(-1)}
            className="rounded-full w-10 h-10 p-0 hover:bg-neutral-100"
          >
            <ChevronLeft className="w-6 h-6 text-neutral-600" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-neutral-900 text-white rounded-xl shadow-lg rotate-3">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Histórico Clínico</h1>
              <p className="text-sm text-neutral-500 font-medium">Cronologia de exames e terapias realizadas</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
           <Button variant="outline" className="gap-2 text-xs h-10">
              <Plus className="w-4 h-4" />
              Solicitar Exame
           </Button>
           <Button variant="primary" className="gap-2 text-xs h-10 shadow-sm shadow-primary-200">
              <Plus className="w-4 h-4" />
              Novo Plano
           </Button>
        </div>
      </div>

      <Card className="border-none shadow-xl shadow-neutral-200/50 overflow-hidden bg-white/80 backdrop-blur-sm">
        {/* Barra de Abas customizada */}
        <div className="border-b border-neutral-100 bg-neutral-50/50 p-2">
          <Tabs 
            items={tabItems} 
            activeTab={activeTab} 
            onChange={setActiveTab} 
            className="gap-2"
          />
        </div>

        <div className="p-6 min-h-[300px]">
          {activeTab === 'exames' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                 <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-400">Listagem de Exames</h2>
                 <span className="text-[10px] font-mono bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded">Total: {exames.length}</span>
              </div>
              <ExamesTab exames={exames} pacienteId={id || ''} />
            </div>
          )}

          {activeTab === 'planos' && (
            <div className="space-y-6">
               <div className="flex items-center justify-between">
                 <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-400">Programas de Tratamento</h2>
                 <span className="text-[10px] font-mono bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded">Total: {planos.length}</span>
              </div>
              
              {planos.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {planos.map((plano) => (
                    <PlanoTratamentoCard key={plano.id} plano={plano} />
                  ))}
                </div>
              ) : (
                <EmptyState 
                  icon={Activity} 
                  title="Sem Histórico de Tratamentos" 
                  description="Crie o primeiro plano de reabilitação ou terapia utilizando o botão acima."
                  className="py-20"
                />
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Footer Branding Subtil */}
      <div className="flex items-center justify-center gap-2 py-4 opacity-30 grayscale saturate-0">
        <img src="/logo.svg" alt="ClinicaPlus" className="w-5 h-5" />
        <span className="text-[10px] font-bold tracking-widest uppercase">ClinicaPlus Professional System</span>
      </div>
    </div>
  );
};
