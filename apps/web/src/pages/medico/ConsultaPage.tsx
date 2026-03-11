import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  useAgendamento, 
  useUpdateEstadoAgendamento, 
  useConsulta 
} from '../../hooks/useAgendamentos';
import { useDebounce } from '../../hooks/useDebounce';
import { 
  Card, 
  Button, 
  Badge, 
  Avatar, 
  Skeleton, 
  AllergyBanner,
  StatusBadge,
  Textarea,
  ReceitaPrint,
  Modal
} from '@clinicaplus/ui';
import { 
  Activity, 
  FileText, 
  Save, 
  CheckCircle, 
  Clipboard, 
  History,
  ArrowLeft,
  Plus,
  Lock,
  Pill,
  Printer
} from 'lucide-react';
import { calculateAge, getInitials, formatDateTime } from '@clinicaplus/utils';
import { useClinicaMe } from '../../hooks/useClinicas';
import { EstadoAgendamento } from '@clinicaplus/types';
import { ReceitaModal } from './ReceitaModal';
import { useUIStore } from '../../stores/ui.store';
import { VitalsGrid } from '../../components/consultation/VitalsGrid';

/**
 * Consultation Page — dual mode.
 * Active editing workspace (EM_PROGRESSO) or read-only summary (CONCLUIDO).
 */
export default function ConsultaPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: agendamento, isLoading } = useAgendamento(id!);
  const updateEstado = useUpdateEstadoAgendamento();
  const salvarConsulta = useConsulta();

  const [notas, setNotas] = useState('');
  const [diagnostico, setDiagnostico] = useState('');
  const [showReceitaModal, setShowReceitaModal] = useState(false);
  const [showFinalizarModal, setShowFinalizarModal] = useState(false);
  const { data: clinica } = useClinicaMe();
  const { addToast } = useUIStore();

  const handleImprimirReceita = () => {
    window.print();
  };

  const isReadOnly = agendamento?.estado === 'CONCLUIDO' || 
                     agendamento?.estado === 'CANCELADO' || 
                     agendamento?.estado === 'NAO_COMPARECEU';

  useEffect(() => {
    if (agendamento) {
      setNotas(agendamento.notasConsulta ?? '');
      setDiagnostico(agendamento.diagnostico ?? '');

      if (
        !isReadOnly &&
        (agendamento.estado === 'PENDENTE' || agendamento.estado === 'CONFIRMADO')
      ) {
        updateEstado.mutate({
          id: agendamento.id,
          estado: EstadoAgendamento.EM_PROGRESSO,
        });
      }
    }
  }, [agendamento?.id]);

  const debouncedNotas = useDebounce(notas, 2000);
  const debouncedDiagnostico = useDebounce(diagnostico, 2000);

  useEffect(() => {
    if (isReadOnly) return;

    const hasChanged = agendamento && (
      debouncedNotas !== (agendamento.notasConsulta ?? '') || 
      debouncedDiagnostico !== (agendamento.diagnostico ?? '')
    );

    if (hasChanged) {
      handleAutoSave();
    }
  }, [debouncedNotas, debouncedDiagnostico]);

  const handleAutoSave = async () => {
    if (!id || isReadOnly) return;
    try {
      await salvarConsulta.mutateAsync({
        id,
        data: {
          notasConsulta: notas,
          diagnostico: diagnostico,
          finalizar: false
        }
      });
    } catch {
      // Auto-save error
    }
  };

  const handleFinalizar = async () => {
    if (!id || isReadOnly) return;
    
    try {
      await salvarConsulta.mutateAsync({
        id,
        data: { notasConsulta: notas, diagnostico, finalizar: true }
      });
      addToast({ title: 'Sucesso', message: 'Consulta finalizada com sucesso!', type: 'success' });
      setShowFinalizarModal(false);
      navigate('/medico/dashboard');
    } catch {
      addToast({ title: 'Erro', message: 'Ocorreu um erro ao finalizar a consulta.', type: 'error' });
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-screen-2xl mx-auto p-4 space-y-6">
        <Skeleton variant="rect" className="h-16 w-full" />
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-4 space-y-4">
            <Skeleton variant="rect" className="h-40 w-full" />
            <Skeleton variant="rect" className="h-64 w-full" />
          </div>
          <div className="xl:col-span-8">
            <Skeleton variant="rect" className="h-[600px] w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!agendamento) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center space-y-4">
        <p className="text-neutral-500 font-medium">Agendamento clínico não encontrado.</p>
        <Button onClick={() => navigate('/medico/dashboard')} variant="secondary">
          Voltar ao Dashboard
        </Button>
      </div>
    );
  }

  const { paciente, triagem } = agendamento;
  const idade = calculateAge(paciente.dataNascimento);

  return (
    <div className="max-w-screen-2xl mx-auto space-y-6 animate-fade-in pb-20 px-4 sm:px-6">
      {/* Dynamic Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sticky top-0 bg-neutral-50/90 backdrop-blur-md z-30 py-4 border-b border-neutral-200 -mx-4 px-4 sm:-mx-6 sm:px-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/medico/dashboard')} className="rounded-full h-10 w-10 p-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-neutral-900 tracking-tight">
                {isReadOnly ? 'Resumo da Consulta' : 'Atendimento Clínico'}
              </h1>
              <StatusBadge estado={agendamento.estado} />
            </div>
            <p className="text-xs text-neutral-600 font-medium tracking-wide">
              Paciente: <span className="text-neutral-900 font-bold">{paciente.nome}</span> • {formatDateTime(agendamento.dataHora)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isReadOnly ? (
            <>
              <div className="hidden sm:flex items-center gap-2 mr-4 pr-4 border-r border-neutral-200">
                <Save className={`h-3.5 w-3.5 ${salvarConsulta.isPending ? 'animate-spin text-primary-500' : 'text-success-500'}`} />
                <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">
                  {salvarConsulta.isPending ? 'A Guardar...' : 'Sincronizado'}
                </span>
              </div>
              
              <Button 
                variant="secondary" 
                onClick={() => setShowReceitaModal(true)}
                className="font-semibold"
              >
                <Plus className="h-4 w-4 mr-2" /> Emitir Receita
              </Button>

              <Button 
                onClick={() => setShowFinalizarModal(true)}
                loading={updateEstado.isPending || salvarConsulta.isPending}
                className="bg-neutral-900 text-white shadow-xl shadow-neutral-900/10 font-bold px-6"
              >
                <CheckCircle className="h-4 w-4 mr-2" /> Finalizar Consulta
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Badge variant="neutral" className="gap-2 bg-neutral-100 border-neutral-200 text-neutral-500 font-bold uppercase tracking-widest px-3 py-1.5 flex items-center">
                <Lock className="h-3.5 w-3.5" /> Consulta Encerrada
              </Badge>
              {agendamento.receita && (
                <Button variant="secondary" size="sm" onClick={handleImprimirReceita} className="font-bold">
                  <Printer className="h-4 w-4 mr-2" /> Imprimir Receita
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column (4/12): Patient Info & Triage */}
        <div className="xl:col-span-4 space-y-6 lg:sticky lg:top-24">
          <AllergyBanner alergias={paciente.alergias} />

          <Card className="p-6 border-primary-100 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <Avatar initials={getInitials(paciente.nome)} size="lg" className="border-4 border-white shadow-md" />
              <div>
                <h2 className="text-xl font-bold text-neutral-900 leading-tight">{paciente.nome}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Badge variant="neutral" className="bg-neutral-100 uppercase tracking-tighter text-[10px]">Paciente</Badge>
                  <span className="text-neutral-300">•</span>
                  <span className="text-sm font-semibold text-neutral-600">{idade} anos</span>
                  <span className="text-neutral-300">•</span>
                  <span className="text-sm font-bold text-primary-600">{paciente.tipoSangue || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                <p className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest mb-1">Nº Prontuário</p>
                <p className="font-mono font-bold text-neutral-800">{paciente.numeroPaciente}</p>
              </div>
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                <p className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest mb-1">Género</p>
                <p className="font-bold text-neutral-800 capitalize">{paciente.genero.toLowerCase()}</p>
              </div>
            </div>
          </Card>

          <Card className="p-0 overflow-hidden shadow-sm">
            <div className="px-6 py-4 bg-neutral-50 border-b border-neutral-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-widest flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary-500" /> Sinais Vitais (Triagem)
              </h3>
              {triagem && (
                <Badge variant={triagem.urgencia === 'MUITO_URGENTE' ? 'error' : triagem.urgencia === 'URGENTE' ? 'warning' : 'success'}>
                   Urgência {triagem.urgencia}
                </Badge>
              )}
            </div>

            <div className="p-6">
              <VitalsGrid triagem={triagem} />
              
              {triagem && (
                <div className="space-y-4 pt-6 mt-6 border-t border-neutral-100">
                   <div>
                    <h4 className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <Clipboard className="h-3 w-3" /> Motivo da Visita / Sintomatologia
                    </h4>
                    <div className="text-sm text-neutral-700 bg-neutral-50 p-4 rounded-xl border border-neutral-100 leading-relaxed italic border-l-4 border-l-primary-500">
                      {triagem.sintomas?.map((s: string, i: number) => (
                        <p key={i}>• {s}</p>
                      ))}
                    </div>
                   </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column (8/12) */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          {isReadOnly ? (
            /* ─── READ-ONLY SUMMARY MODE ─── */
            <>
              <Card className="p-0 overflow-hidden shadow-sm border-neutral-200">
                <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-widest flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary-500" /> Notas da Consulta
                  </h3>
                  <Badge variant="neutral" className="bg-neutral-100 text-[10px] uppercase">Encerrada</Badge>
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <History className="h-4 w-4 text-neutral-400" /> Evolução Clínica
                    </h4>
                    <div className="bg-neutral-50 p-5 rounded-xl border border-neutral-100 text-neutral-800 leading-relaxed whitespace-pre-wrap min-h-[100px]">
                      {agendamento.notasConsulta || <span className="text-neutral-400 italic">Sem notas registadas.</span>}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-neutral-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Plus className="h-4 w-4 text-neutral-500" /> Diagnóstico e Plano Terapêutico
                    </h4>
                    <div className="bg-neutral-50 p-5 rounded-xl border border-neutral-100 text-neutral-800 leading-relaxed whitespace-pre-wrap min-h-[80px]">
                      {agendamento.diagnostico || <span className="text-neutral-400 italic">Sem diagnóstico registado.</span>}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Prescriptions Summary */}
              <Card className="p-0 overflow-hidden shadow-sm border-neutral-200">
                <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-widest flex items-center gap-2">
                    <Pill className="h-4 w-4 text-primary-500" /> Receitas Emitidas
                  </h3>
                </div>
                <div className="p-6">
                  {agendamento.receita ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-success-50 rounded-xl border border-success-100">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-success-100 flex items-center justify-center">
                            <Pill className="h-5 w-5 text-success-600" />
                          </div>
                          <div>
                            <p className="font-bold text-neutral-900">Receita emitida</p>
                            <p className="text-xs text-neutral-500">{agendamento.receita.diagnostico}</p>
                          </div>
                        </div>
                        <Badge variant="success">Activa</Badge>
                      </div>
                      {Array.isArray(agendamento.receita.medicamentos) && (agendamento.receita.medicamentos as { nome: string; dosagem: string; frequencia: string; duracao: string; instrucoes?: string }[]).map((med, i: number) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                          <div className="h-8 w-8 rounded-lg bg-primary-50 flex items-center justify-center shrink-0 mt-0.5">
                            <Pill className="h-4 w-4 text-primary-500" />
                          </div>
                          <div>
                            <p className="font-bold text-neutral-900 text-sm">{med.nome} — {med.dosagem}</p>
                            <p className="text-xs text-neutral-500">{med.frequencia} • {med.duracao}</p>
                            {med.instrucoes && <p className="text-xs text-neutral-400 mt-1 italic">{med.instrucoes}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-sm text-neutral-400 italic">Nenhuma receita foi emitida para esta consulta.</p>
                    </div>
                  )}
                </div>
              </Card>
            </>
          ) : (
            /* ─── ACTIVE EDITING MODE ─── */
            <Card className="p-0 overflow-hidden flex flex-col min-h-[650px] border-primary-200 shadow-xl shadow-primary-500/5">
              <div className="px-6 py-4 border-b border-neutral-100 bg-white flex items-center justify-between">
                <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-widest flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary-500" /> Notas de Evolução Clínica
                </h3>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-success-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Sessão Activa</span>
                </div>
              </div>

              <div className="p-6 flex-1 space-y-8">
                <div className="space-y-3">
                  <label className="text-xs font-bold text-neutral-600 uppercase tracking-widest flex items-center gap-2">
                    <History className="h-4 w-4 text-neutral-500" /> Notas da Consulta (anamnese, exame físico)
                  </label>
                  <Textarea 
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    placeholder="Comece a digitar os detalhes da consulta aqui..."
                    className="min-h-[250px] border-0 bg-neutral-50/50 p-4 focus:bg-white focus:ring-0 transition-all text-neutral-800 text-lg leading-relaxed resize-none shadow-inner"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-neutral-600 uppercase tracking-widest flex items-center gap-2">
                    <Plus className="h-4 w-4 text-neutral-500" /> Diagnóstico e Plano Terapêutico
                  </label>
                  <Textarea 
                    value={diagnostico}
                    onChange={(e) => setDiagnostico(e.target.value)}
                    placeholder="Diagnóstico clínico, solicitações de exames e recomendações..."
                    className="min-h-[180px] border-0 bg-neutral-50/50 p-4 focus:bg-white focus:ring-0 transition-all text-neutral-800 text-lg leading-relaxed resize-none shadow-inner"
                  />
                </div>
              </div>

              <div className="px-6 py-4 bg-neutral-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs font-medium">
                  <span className="opacity-60 uppercase tracking-widest font-bold">Resumo:</span>
                  <span>{idade} anos</span>
                  <span className="opacity-30">|</span>
                  <span>{paciente.tipoSangue || 'Sangue N/A'}</span>
                </div>
                <p className="text-[10px] opacity-50 font-bold uppercase tracking-tighter">Gravação Automática Activa • ClinicaPlus</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {!isReadOnly && showReceitaModal && (
        <ReceitaModal 
          isOpen={showReceitaModal}
          agendamentoId={agendamento.id}
          pacienteNome={paciente.nome}
          diagnosticoPadrao={diagnostico}
          onClose={() => setShowReceitaModal(false)}
        />
      )}

      {isReadOnly && agendamento.receita && (
        <ReceitaPrint
          receita={agendamento.receita}
          clinicaNome={clinica?.nome || 'ClinicaPlus'}
          clinicaEndereco={clinica?.endereco || null}
          clinicaTelefone={clinica?.telefone || null}
          clinicaEmail={clinica?.email || null}
        />
      )}

      {/* MODAL DE CONFIRMAÇÃO DE FINALIZAÇÃO */}
      <Modal 
        isOpen={showFinalizarModal} 
        onClose={() => setShowFinalizarModal(false)} 
        title="Finalizar Consulta"
      >
        <div className="space-y-4">
          <p className="text-sm text-neutral-600 leading-relaxed">
            Tem certeza de que deseja concluir este atendimento clínico agora? 
            Esta ação atualizará o histórico do paciente e impedirá novas edições imediatas nesta sessão.
          </p>
          <div className="flex gap-3 justify-end pt-4 border-t border-neutral-100">
            <Button variant="ghost" onClick={() => setShowFinalizarModal(false)}>
              Revisar Notas
            </Button>
            <Button 
              className="bg-neutral-900 text-white font-bold"
              onClick={handleFinalizar}
              loading={salvarConsulta.isPending}
            >
              Confirmar e Concluir
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}