import React from 'react';
import { AlertCircle } from 'lucide-react';

interface AllergyBannerProps {
  alergias?: string[] | null;
}

/**
 * AllergyBanner displays a warning if patient has allergies.
 * Null-safe: does not render if no allergies.
 */
export function AllergyBanner({ alergias }: AllergyBannerProps) {
  if (!alergias || alergias.length === 0) return null;

  return (
    <div className="bg-red-50 border border-red-100 p-4 flex items-start gap-3 animate-shake">
      <div className="h-10 w-10 bg-red-100 flex items-center justify-center shrink-0">
        <AlertCircle className="h-5 w-5 text-red-600" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-red-900 uppercase tracking-widest">Alerta de Alergias</h3>
        <p className="text-sm text-red-700 font-medium mt-1">
          Este paciente reportou as seguintes alergias:
        </p>
        <div className="flex flex-wrap gap-2 mt-2">
          {alergias.map((a, i) => (
            <span key={i} className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded uppercase tracking-wider">
              {a}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
