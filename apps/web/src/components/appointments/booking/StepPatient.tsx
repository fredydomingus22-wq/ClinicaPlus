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
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Seleccionar Paciente</h1>
        <p className="text-neutral-500 font-medium">Pesquise o paciente por nome, número ou telefone.</p>
      </div>

      <div className="relative max-w-2xl mx-auto">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
        <Input
          placeholder="Ex: Manuel Antunes ou 923..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-14 h-16 rounded-[2rem] border-neutral-200 shadow-xl shadow-neutral-100/50 text-lg font-bold"
        />
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Spinner size="lg" />
            <p className="text-neutral-500 font-medium animate-pulse">A procurar na base de dados...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pacientes?.items?.map((p: PacienteDTO) => (
              <button
                key={p.id}
                onClick={() => onSelect(p.id)}
                className="flex items-center gap-4 p-5 bg-white border border-neutral-200 rounded-3xl hover:border-primary-500 hover:shadow-2xl hover:shadow-primary-100 transition-all text-left group"
              >
                <Avatar 
                  initials={p.nome.split(' ').map((n: string) => n[0]).join('').substring(0,2).toUpperCase()} 
                  size="md" 
                  className="ring-4 ring-neutral-50"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-neutral-900 truncate">
                    {p.nome}
                  </h3>
                  <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider">
                    Nº {p.numeroPaciente} • {p.telefone}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-neutral-50 flex items-center justify-center text-neutral-300 group-hover:bg-primary-600 group-hover:text-white transition-all">
                  <ArrowRight className="w-5 h-5" />
                </div>
              </button>
            ))}

            <button 
              onClick={onNewPatient}
              className="flex items-center gap-4 p-5 bg-primary-50 border-2 border-dashed border-primary-200 rounded-3xl hover:bg-primary-100 hover:border-primary-300 transition-all text-left group"
            >
              <div className="w-12 h-12 rounded-full bg-primary-200 flex items-center justify-center text-primary-700">
                <UserPlus className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-black text-primary-900">Novo Paciente</h3>
                <p className="text-xs text-primary-600 font-bold uppercase tracking-wider">Registar agora</p>
              </div>
            </button>
          </div>
        )}
      </div>

      {!isLoading && (!pacientes?.items || pacientes?.items.length === 0) && search.length > 0 && (
        <Card className="p-12 text-center rounded-[3rem] border-none shadow-xl">
          <User className="w-16 h-16 text-neutral-200 mx-auto mb-4" />
          <h3 className="text-xl font-black text-neutral-900">Nenhum resultado</h3>
          <p className="text-neutral-500 mt-2">Não encontramos nenhum paciente com "{search}".</p>
          <Button onClick={onNewPatient} className="mt-6 rounded-2xl h-12 px-8">Registar {search}</Button>
        </Card>
      )}
    </div>
  );
};
