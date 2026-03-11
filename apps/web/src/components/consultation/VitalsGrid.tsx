import React from 'react';
import { 
  Thermometer, 
  Activity, 
  Heart, 
  Weight 
} from 'lucide-react';

import { Triagem } from '@clinicaplus/types';

interface VitalsGridProps {
  triagem?: Triagem | null;
}

/**
 * Shared component for displaying vital signs metrics.
 * Used in Consultation and Triage views.
 */
export function VitalsGrid({ triagem }: VitalsGridProps) {
  if (!triagem) {
    return (
      <div className="p-12 text-center">
        <p className="text-sm text-neutral-400 italic">Pendente de triagem clínica.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <VitalsMetric 
        icon={Thermometer} 
        label="Temperatura" 
        value={triagem.temperatura ? `${triagem.temperatura}°C` : '---'} 
        color="text-amber-500" 
        bg="bg-amber-50" 
      />
      <VitalsMetric 
        icon={Activity} 
        label="Pressão" 
        value={triagem.pa ?? '---'} 
        color="text-red-500" 
        bg="bg-red-50" 
      />
      <VitalsMetric 
        icon={Heart} 
        label="Frequência" 
        value={triagem.frequenciaCardiaca ? `${triagem.frequenciaCardiaca} bpm` : '---'} 
        color="text-primary-500" 
        bg="bg-primary-50" 
      />
      <VitalsMetric 
        icon={Weight} 
        label="Peso" 
        value={triagem.peso ? `${triagem.peso}kg` : '---'} 
        color="text-green-500" 
        bg="bg-green-50" 
      />
    </div>
  );
}

/** Internal metric sub-component */
function VitalsMetric({ 
  icon: Icon, 
  label, 
  value, 
  color, 
  bg 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string; 
  color: string; 
  bg: string; 
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white border border-neutral-100 rounded-xl shadow-sm">
      <div className={`h-10 w-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <div>
        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{label}</p>
        <p className="text-sm font-bold text-neutral-900">{value}</p>
      </div>
    </div>
  );
}
