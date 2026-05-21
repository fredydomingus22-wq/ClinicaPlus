import React from 'react';
import { useParams } from 'react-router-dom';
import { AnamneseTemplateManager } from '@/components/AnamneseTemplateManager';

/**
 * Page wrapper that extracts the specialtyId from the URL.
 * Expected route: /anamnese-templates/:especialidadeId
 */
export default function AnamneseTemplatesPage() {
  const { especialidadeId } = useParams<{ especialidadeId: string }>();

  if (!especialidadeId) {
    return <div className="p-6 text-red-600">Especialidade não especificada.</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 p-4">
      <AnamneseTemplateManager especialidadeId={especialidadeId} />
    </div>
  );
}
