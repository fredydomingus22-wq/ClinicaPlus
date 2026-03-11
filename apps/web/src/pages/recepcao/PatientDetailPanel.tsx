import React from 'react';
import { usePaciente } from '../../hooks/usePacientes';
import { 
  Button, 
  Card, 
  Avatar, 
  Badge, 
  Spinner, 
  ErrorMessage 
} from '@clinicaplus/ui';
import { 
  X, 
  Phone, 
  Mail, 
  MapPin, 
  History,
  AlertCircle 
} from 'lucide-react';
import { formatDate } from '@clinicaplus/utils';
import { AllergyBanner } from '../../components/patients/AllergyBanner';

interface PatientDetailPanelProps {
  id: string;
  onClose: () => void;
  onEdit?: (id: string) => void;
  onNewBooking?: (id: string) => void;
}

export function PatientDetailPanel({ id, onClose, onEdit, onNewBooking }: PatientDetailPanelProps) {
  const { data: paciente, isLoading, error } = usePaciente(id);
  
  if (isLoading) return (
    <div className="fixed inset-y-0 right-0 w-full md:w-[500px] bg-white shadow-xl z-50 flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  );

  if (error || !paciente) return (
    <div className="fixed inset-y-0 right-0 w-full md:w-[500px] bg-white shadow-xl z-50 p-6 flex flex-col items-center justify-center">
      <Button variant="ghost" onClick={onClose} className="absolute top-4 right-4"><X /></Button>
      <ErrorMessage error={error || 'Paciente não encontrado'} />
    </div>
  );

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-[500px] bg-neutral-50 shadow-xl z-50 flex flex-col animate-slide-in">
      {/* Header */}
      <div className="p-6 bg-white border-b border-neutral-100 flex items-center justify-between shadow-sm">
        <h2 className="text-xl font-bold text-neutral-900">Detalhes do Paciente</h2>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
        >
          <X className="h-5 w-5 text-neutral-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Allergy Banner - Always visible if allergies exist */}
        <AllergyBanner allergies={paciente.alergias} />

        {/* Basic Info */}
        <Card className="p-6 space-y-6 border-0 shadow-sm bg-white">
          <div className="flex items-center gap-4">
            <Avatar initials={paciente.nome.split(' ').map(n=>n[0]).join('')} size="lg" />
            <div>
              <h3 className="text-lg font-bold text-neutral-900">{paciente.nome}</h3>
              <p className="text-sm text-neutral-600">Nº Paciente: {paciente.numeroPaciente}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-neutral-100">
            <div className="space-y-1">
              <p className="text-[10px] text-neutral-600 uppercase font-bold tracking-wider">Data de Nascimento</p>
              <p className="text-sm text-neutral-900 font-medium">{formatDate(paciente.dataNascimento)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-neutral-600 uppercase font-bold tracking-wider">Género</p>
              <p className="text-sm text-neutral-900 font-medium">{paciente.genero}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-neutral-600 uppercase font-bold tracking-wider">Seguro de Saúde</p>
              <div>
                <Badge variant={paciente.seguroSaude ? 'success' : 'neutral'}>
                  {paciente.seguroSaude ? 'Com Seguro' : 'Particular'}
                </Badge>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">Estado</p>
              <div>
                <Badge variant={paciente.ativo ? 'success' : 'neutral'}>
                  {paciente.ativo ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* Contact Info */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-neutral-600 uppercase tracking-widest flex items-center gap-2">
            <Phone className="h-3 w-3" /> Contactos e Localização
          </h4>
          <Card className="p-4 space-y-4 border-0 shadow-sm bg-white">
            <div className="flex items-center gap-3 text-sm">
              <Phone className="h-4 w-4 text-neutral-500" />
              <span className="text-neutral-700">{paciente.telefone || 'Sem telefone'}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-neutral-500" />
              <span className="text-neutral-700">{paciente.email || 'Sem email'}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="h-4 w-4 text-neutral-500" />
              <span className="text-neutral-700">{paciente.endereco || '---'}, {paciente.provincia || '---'}</span>
            </div>
          </Card>
        </div>

        {/* Short History Placeholder */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-neutral-600 uppercase tracking-widest flex items-center gap-2">
            <History className="h-3 w-3" /> Histórico Recente
          </h4>
          <Card className="p-8 bg-neutral-100/50 border-dashed border-neutral-200 shadow-none">
            <div className="text-center space-y-2">
              <AlertCircle className="h-8 w-8 text-neutral-300 mx-auto" />
              <p className="text-xs text-neutral-400 font-medium max-w-[200px] mx-auto">
                O histórico clínico será disponibilizado brevemente.
              </p>
            </div>
          </Card>
        </div>
      </div>

      <div className="p-6 bg-white border-t border-neutral-100 flex gap-3 shadow-lg">
        <Button variant="secondary" fullWidth className="flex-1" onClick={() => onEdit?.(id)}>
          Editar Dados
        </Button>
        <Button fullWidth className="flex-1" onClick={() => onNewBooking?.(id)}>
          Marcar Consulta
        </Button>
      </div>
    </div>
  );
}
