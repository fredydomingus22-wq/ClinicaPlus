import React from 'react';
import { AlertCircle } from 'lucide-react';

interface AllergyBannerProps {
  allergies: string[];
}

/**
 * Critical clinical component.
 * Displays allergies in a high-visibility banner if any exist.
 */
export function AllergyBanner({ allergies }: AllergyBannerProps) {
  if (!allergies || allergies.length === 0) return null;

  return (
    <div className="bg-danger-50 border-y border-danger-200 px-6 py-3 flex items-center gap-4 animate-pulse-slow">
      <div className="bg-danger-100 p-2 rounded-full border border-danger-200">
        <AlertCircle className="h-5 w-5 text-danger-600" />
      </div>
      <div>
        <p className="text-xs font-bold text-danger-700 uppercase tracking-wider">
          Alergias Críticas
        </p>
        <p className="text-sm font-semibold text-danger-900 mt-0.5">
          {allergies.join(', ')}
        </p>
      </div>
    </div>
  );
}
