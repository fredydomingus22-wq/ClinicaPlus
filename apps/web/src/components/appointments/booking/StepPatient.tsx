import React, { useState } from 'react';
import { Button, Card, Input, Avatar, Spinner } from '@clinicaplus/ui';
import { Search, UserPlus, ArrowRight, User } from 'lucide-react';
import { useListaPacientes } from '../../../hooks/usePacientes';
import type { PacienteDTO } from '@clinicaplus/types';

interface StepPatientProps {
  onSelect: (pacienteId: string) => void;
  onNewPatient: () => void;
}

export const StepPatient: React.FC<StepPatientProps> = ({ onSelect, onNewPatient }) => {
  const [search, setSearch] = useState('');
  const { data: pacientes, isLoading } = useListaPacientes({ 
    q: search, 
    page: 1, 
    limit: 10 
  });

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-black text-neutral-900 tracking-tighter uppercase">Seleccionar Paciente</h1>
        <p className="text-neutral-600 font-medium">Pesquise o registro clínico por nome, ID ou contato.</p>
      </div>

      <div className="relative max-w-2xl mx-auto">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
        <Input
          placeholder="Ex: Manuel Antunes ou 923..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-14 h-16 rounded-none border-neutral-200 shadow-premium text-lg font-bold"
        />
      </div>

      <div className="space-y-0">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Spinner size="lg" />
            <p className="text-neutral-600 font-mono font-bold uppercase tracking-widest text-xs">A consultar base de dados...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-t border-l border-neutral-100">
            {pacientes?.items?.map((p: PacienteDTO) => (
              <button
                key={p.id}
                onClick={() => onSelect(p.id)}
                className="flex items-center gap-5 p-6 bg-white border-r border-b border-neutral-100 hover:bg-neutral-50 transition-all text-left group active:scale-[0.99]"
              >
                <Avatar 
                  initials={p.nome.split(' ').map((n: string) => n[0]).join('').substring(0,2).toUpperCase()} 
                  size="md" 
                  className="ring-2 ring-neutral-100"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-neutral-900 truncate tracking-tight">
                    {p.nome}
                  </h3>
                  <p className="text-xs text-neutral-600 font-black uppercase tracking-wider">
                    ID: {p.numeroPaciente} <span className="mx-2 text-neutral-300">|</span> {p.telefone}
                  </p>
                </div>
                <div className="w-8 h-8 flex items-center justify-center text-neutral-300 group-hover:text-primary-900 transition-all">
                  <ArrowRight className="w-5 h-5" />
                </div>
              </button>
            ))}

            <button 
              onClick={onNewPatient}
              className="flex items-center gap-5 p-6 bg-neutral-50 border-r border-b border-primary-100 border-dashed hover:bg-white hover:border-solid transition-all text-left group"
            >
              <div className="w-12 h-12 bg-primary-100 text-primary-900 flex items-center justify-center">
                <UserPlus className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-primary-900 tracking-tight">Novo Registo</h3>
                <p className="text-xs text-primary-700 font-black uppercase tracking-wider">Criar ficha de paciente</p>
              </div>
            </button>
          </div>
        )}
      </div>

      {!isLoading && (!pacientes?.items || pacientes?.items.length === 0) && search.length > 0 && (
        <Card className="p-16 text-center rounded-none border-neutral-100 shadow-premium">
          <User className="w-16 h-16 text-neutral-300 mx-auto mb-6" />
          <h3 className="text-xl font-black text-neutral-900 uppercase tracking-tight">Sem resultados encontrados</h3>
          <p className="text-neutral-600 mt-2">Não encontramos nenhum registo sob o termo "{search}".</p>
          <Button onClick={onNewPatient} className="mt-8 rounded-none h-12 px-10">Registar Paciente</Button>
        </Card>
      )}
    </div>
  );
};
