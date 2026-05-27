import React from 'react';
import { Card } from '@clinicaplus/ui';

export default function FornecedoresPage() {
  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Fornecedores Parceiros</h1>
        <p className="text-neutral-500 text-sm font-medium">Gestão de fornecedores e parceiros da clínica.</p>
      </div>

      <Card className="p-12 border-neutral-100 shadow-sm">
        <div className="text-center">
          <p className="text-neutral-400 font-medium">Página em desenvolvimento</p>
          <p className="text-neutral-300 text-sm mt-2">Funcionalidade disponível em breve</p>
        </div>
      </Card>
    </div>
  );
}
