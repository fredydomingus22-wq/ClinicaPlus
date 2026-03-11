import React, { useState } from 'react';
import { 
  Button, 
  Card, 
  Spinner,
  Modal,
  Badge,
  ReceitaPrint
} from '@clinicaplus/ui';
import { 
  FileText, 
  Printer, 
  ChevronRight,
  Stethoscope,
  Calendar,
  Pill
} from 'lucide-react';
import { useMinhasReceitas, useReceita } from '../../hooks/useReceitas';
import { formatDate } from '@clinicaplus/utils';
import { useClinicaMe } from '../../hooks/useClinicas';

export default function MinhasReceitasPage() {
  const [selectedReceitaId, setSelectedReceitaId] = useState<string | null>(null);
  const { data: receitas, isLoading: loadingList } = useMinhasReceitas();
  const { data: selectedReceita, isLoading: loadingDetail } = useReceita(selectedReceitaId || '');
  const { data: clinica } = useClinicaMe();

  const handlePrint = () => {
    window.print();
  };

  if (loadingList) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Minhas Receitas</h1>
          <p className="text-neutral-500">Histórico de prescrições e orientações médicas.</p>
        </div>
      </div>

      {!receitas || receitas.length === 0 ? (
        <Card className="p-20 text-center border-dashed bg-neutral-50/50">
          <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-neutral-300" />
          </div>
          <p className="text-neutral-500 font-medium">Ainda não tem nenhuma receita registada.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {receitas.map((rec) => (
            <div 
              key={rec.id} 
              className="p-5 bg-white border rounded-xl hover:border-primary-300 hover:shadow-md transition-all cursor-pointer group"
              onClick={() => setSelectedReceitaId(rec.id)}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-primary-50 rounded-lg group-hover:bg-primary-500 group-hover:text-white transition-colors">
                  <FileText className="w-5 h-5" />
                </div>
                <Badge variant="neutral">{formatDate(new Date(rec.dataEmissao))}</Badge>
              </div>
              
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest">Médico Prescritor</p>
                  <p className="font-bold text-neutral-800">Dr(a). {rec.medico?.nome}</p>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-neutral-500">
                  <Stethoscope className="w-4 h-4" />
                  <span>{rec.medico?.especialidade?.nome}</span>
                </div>

                {rec.diagnostico && (
                  <div className="pt-2">
                    <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest mb-1">Diagnóstico Referencial</p>
                    <p className="text-sm text-neutral-600 line-clamp-2 italic">"{rec.diagnostico}"</p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex items-center justify-between pt-4 border-t border-neutral-100">
                <span className="text-xs font-bold text-primary-600 flex items-center gap-1 group-hover:gap-2 transition-all">
                  Ver Medicamentos <ChevronRight className="w-3 h-3" />
                </span>
                <span className="text-xs text-neutral-400">Prescrito em: {new Date(rec.dataEmissao).toLocaleDateString('pt-AO')}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Receita Detail Modal */}
      <Modal
        isOpen={!!selectedReceitaId}
        onClose={() => setSelectedReceitaId(null)}
        title="Detalhes da Receita"
        size="lg"
      >
        {loadingDetail ? (
          <div className="py-20 text-center"><Spinner size="lg" /></div>
        ) : selectedReceita ? (
          <div className="space-y-8">
            <div className="flex justify-between items-start border-b border-neutral-100 pb-6">
              <div className="space-y-1">
                <p className="text-2xl font-black text-neutral-900">Receita Médica</p>
                <div className="flex items-center gap-2 text-neutral-500">
                  <Calendar className="w-4 h-4" />
                  <p className="text-sm font-medium">{formatDate(new Date(selectedReceita.dataEmissao))}</p>
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" /> Imprimir
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Paciente</p>
                <p className="font-bold text-neutral-800">{selectedReceita.paciente?.nome}</p>
                <p className="text-xs text-neutral-500">Nº {selectedReceita.paciente?.numeroPaciente}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Médico</p>
                <p className="font-bold text-neutral-800">Dr(a). {selectedReceita.medico?.nome}</p>
                <p className="text-xs text-neutral-500">{selectedReceita.medico?.ordem || 'Ordem N/A'}</p>
              </div>
            </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-widest flex items-center gap-2 border-b border-neutral-100 pb-2">
                  <Pill className="w-4 h-4 text-primary-500" /> Prescrição
                </h3>
                <div className="space-y-6">
                  {(selectedReceita.medicamentos as { nome: string; dosagem: string; instrucoes: string }[]).map((med, idx: number) => (
                    <div key={idx} className="space-y-1">
                      <p className="font-bold text-neutral-900">{idx + 1}. {med.nome} - {med.dosagem}</p>
                      <p className="text-sm text-neutral-600 bg-neutral-50 p-3 rounded-lg border-l-2 border-primary-200">{med.instrucoes}</p>
                    </div>
                  ))}
                </div>
              </div>

            {selectedReceita.observacoes && (
              <div className="pt-4 space-y-2">
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Observações Adicionais</p>
                <p className="text-sm text-neutral-600 italic">{selectedReceita.observacoes}</p>
              </div>
            )}

            {/* Standard printable component */}
            {selectedReceita && (
              <ReceitaPrint
                receita={selectedReceita}
                clinicaNome={clinica?.nome || 'ClinicaPlus'}
                clinicaEndereco={clinica?.endereco || null}
                clinicaTelefone={clinica?.telefone || null}
                clinicaEmail={clinica?.email || null}
              />
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
