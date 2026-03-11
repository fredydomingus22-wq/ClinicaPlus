import React, { useState, useEffect } from 'react';
import { 
  Button, 
  Card, 
  Input, 
  Badge, 
  Modal,
  Select
} from '@clinicaplus/ui';
import { 
  User, 
  Mail, 
  ShieldCheck, 
  Lock, 
  AlertTriangle,
  Fingerprint,
  Calendar,
  Smartphone,
  Download,
  FileText,
  Pencil
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store';
import { authApi } from '../../api/auth';
import { useUIStore } from '../../stores/ui.store';
import { formatDate } from '@clinicaplus/utils';
import { useUpdatePaciente } from '../../hooks/usePacientes';
import { useMeusAgendamentos } from '../../hooks/useAgendamentos';
import { useMinhasReceitas } from '../../hooks/useReceitas';
import { useClinicaMe } from '../../hooks/useClinicas';
import { DossierClinicoPrint } from '../../components/print/DossierClinicoPrint';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PacienteUpdateSchema, type PacienteUpdateInput } from '@clinicaplus/types';
import { PROVINCES } from '@clinicaplus/utils';

export default function PerfilPage() {
  const { utilizador } = useAuthStore();
  const { addToast } = useUIStore();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const [passwords, setPasswords] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [activeTab, setActiveTab] = useState<'geral' | 'seguranca' | 'exportar'>('geral');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const { mutate: updatePaciente, isPending: isUpdating } = useUpdatePaciente();
  const { data: agendamentosData, isLoading: isLoadingAgendamentos, isError: isErrorAgendamentos } = useMeusAgendamentos();
  const { data: receitasData, isLoading: isLoadingReceitas, isError: isErrorReceitas } = useMinhasReceitas();
  const { data: clinicaData, isLoading: isLoadingClinica, isError: isErrorClinica } = useClinicaMe();

  const [isPreparingPrint, setIsPreparingPrint] = useState(false);

  const isDataLoading = isLoadingAgendamentos || isLoadingReceitas || isLoadingClinica;
  const hasError = isErrorAgendamentos || isErrorReceitas || isErrorClinica;
  const isDataReady = !!clinicaData && !!agendamentosData && !!receitasData;

  const dossierPrintRef = React.useRef<HTMLDivElement>(null);

  const paciente = utilizador?.paciente;

  const form = useForm<PacienteUpdateInput>({
    resolver: zodResolver(PacienteUpdateSchema),
    defaultValues: {
      nome: utilizador?.nome || '',
      telefone: paciente?.telefone || '',
      email: utilizador?.email || '',
      dataNascimento: paciente?.dataNascimento || '',
      genero: (paciente?.genero as PacienteUpdateInput['genero']) || 'OUTRO',
      provincia: paciente?.provincia || '',
      seguradora: paciente?.seguradora || '',
    }
  });

  useEffect(() => {
    if (paciente && showEditModal) {
      form.reset({
        nome: utilizador?.nome || '',
        telefone: paciente?.telefone || '',
        email: utilizador?.email || '',
        dataNascimento: paciente.dataNascimento ? new Date(paciente.dataNascimento).toISOString().split('T')[0] : '',
        genero: (paciente.genero as PacienteUpdateInput['genero']) || 'OUTRO',
        provincia: paciente.provincia || '',
        seguradora: paciente.seguradora || '',
      });
    }
  }, [paciente, utilizador, showEditModal, form]);

  const onEditSubmit = (values: PacienteUpdateInput) => {
    if (!paciente?.id) return;
    
    // Convert YYYY-MM-DD from input to ISO String for Zod compliance
    const formattedData = {
      ...values,
      dataNascimento: values.dataNascimento ? new Date(values.dataNascimento).toISOString() : undefined
    };

    updatePaciente({ id: paciente.id, data: formattedData }, {
      onSuccess: () => {
        // Update auth store with new name/email if they changed
        useAuthStore.setState((state) => {
          if (!state.utilizador) return state;
          
          const newUtilizador = {
            ...state.utilizador,
            nome: values.nome ?? state.utilizador.nome,
            email: values.email ?? state.utilizador.email,
          };

          if (state.utilizador.paciente) {
            newUtilizador.paciente = {
              ...state.utilizador.paciente,
              nome: formattedData.nome ?? state.utilizador.paciente.nome,
              telefone: formattedData.telefone ?? state.utilizador.paciente.telefone,
              email: formattedData.email ?? state.utilizador.paciente.email,
              dataNascimento: formattedData.dataNascimento ?? state.utilizador.paciente.dataNascimento,
              genero: formattedData.genero ?? state.utilizador.paciente.genero,
              provincia: formattedData.provincia ?? state.utilizador.paciente.provincia,
              seguradora: formattedData.seguradora ?? state.utilizador.paciente.seguradora,
            };
          }

          return {
            ...state,
            utilizador: newUtilizador
          };
        });
        
        setShowEditModal(false);
      }
    });
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      addToast({ title: 'Erro', message: 'As palavras-passe não coincidem', type: 'error' });
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await authApi.changePassword(passwords.oldPassword, passwords.newPassword);
      addToast({ title: 'Sucesso', message: 'A sua palavra-passe foi alterada', type: 'success' });
      setPasswords({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: unknown) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  };



  const handlePrintDossier = () => {
    if (isPreparingPrint) return;

    if (hasError) {
      addToast({ 
        title: 'Erro de Carregamento', 
        message: 'Não foi possível compilar os seus dados clínicos. Por favor, tente recarregar a página.', 
        type: 'error' 
      });
      return;
    }

    setIsPreparingPrint(true);
    
    addToast({ 
      title: 'A Gerar Dossier', 
      message: 'A formatar os seus dados clínicos para impressão...', 
      type: 'info' 
    });

    // Short delay to ensure the component is rendered with data before printing
    setTimeout(() => {
      window.print();
      setIsPreparingPrint(false);
    }, 1500);
  };


  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-10">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">O Meu Perfil</h1>
        <p className="text-neutral-500">Gerencie os seus dados pessoais e definições de segurança.</p>
      </div>

      {/* Navegação por Tabs */}
      <div className="flex border-b border-neutral-200 gap-6">
        <button 
          onClick={() => setActiveTab('geral')}
          className={`pb-3 font-medium text-sm transition-all border-b-2 ${activeTab === 'geral' ? 'border-primary-600 text-primary-700' : 'border-transparent text-neutral-500 hover:text-neutral-800'}`}
        >
          Visão Geral
        </button>
        <button 
          onClick={() => setActiveTab('seguranca')}
          className={`pb-3 font-medium text-sm transition-all border-b-2 flex items-center gap-1.5 ${activeTab === 'seguranca' ? 'border-primary-600 text-primary-700' : 'border-transparent text-neutral-500 hover:text-neutral-800'}`}
        >
          <Lock className="w-4 h-4" /> Segurança
        </button>
        <button 
          onClick={() => setActiveTab('exportar')}
          className={`pb-3 font-medium text-sm transition-all border-b-2 flex items-center gap-1.5 ${activeTab === 'exportar' ? 'border-primary-600 text-primary-700' : 'border-transparent text-neutral-500 hover:text-neutral-800'}`}
        >
          <Download className="w-4 h-4" /> Exportação de Dados
        </button>
      </div>

      <div className="pt-4">
        {/* TAB 1: VISÃO GERAL */}
        {activeTab === 'geral' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card className="p-8 group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-5">
                  <User className="w-32 h-32" />
                </div>
                <div className="flex flex-col md:flex-row gap-8 items-start relative z-10">
                  <div className="w-24 h-24 rounded-3xl bg-neutral-100 flex items-center justify-center shrink-0 border border-neutral-200">
                    <User className="w-12 h-12 text-neutral-300" />
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">{utilizador?.nome}</h2>
                        <p className="text-neutral-500 flex items-center gap-2 mt-1">
                          <Fingerprint className="w-4 h-4" /> Nº de Paciente: <span className="font-bold text-neutral-800">{paciente?.numeroPaciente}</span>
                        </p>
                      </div>
                      <Button variant="secondary" size="sm" onClick={() => setShowEditModal(true)}>
                        <Pencil className="w-3.5 h-3.5 mr-2" /> Editar
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8 pt-4 border-t border-neutral-100">
                      <div className="space-y-1 min-w-0">
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Email</p>
                        <div className="flex items-center gap-2 text-neutral-800 font-medium">
                          <Mail className="w-4 h-4 text-neutral-400 shrink-0" /> 
                          <span className="truncate" title={utilizador?.email}>{utilizador?.email}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Telefone</p>
                        <div className="flex items-center gap-2 text-neutral-800 font-medium">
                          <Smartphone className="w-4 h-4 text-neutral-400" /> {paciente?.telefone || '---'}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Nascimento</p>
                        <div className="flex items-center gap-2 text-neutral-800 font-medium">
                          <Calendar className="w-4 h-4 text-neutral-400" /> {paciente?.dataNascimento ? formatDate(new Date(paciente.dataNascimento)) : '---'}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Género & Sangue</p>
                        <div className="flex items-center gap-2 text-neutral-800 capitalize font-medium">
                          <ShieldCheck className="w-4 h-4 text-neutral-400" /> 
                          {paciente?.genero || 'N/D'} {paciente?.tipoSangue ? `• ${paciente.tipoSangue}` : ''}
                        </div>
                      </div>
                      <div className="space-y-1 md:col-span-2">
                         <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Endereço & Província</p>
                         <div className="text-neutral-800 font-medium">
                           {paciente?.endereco || '---'}{paciente?.provincia ? `, ${paciente.provincia}` : ''}
                         </div>
                      </div>
                      {(paciente?.seguradora || paciente?.seguroSaude) && (
                        <div className="space-y-1 md:col-span-2">
                           <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Seguro de Saúde</p>
                           <div className="flex items-center gap-2 text-neutral-800 font-medium">
                             <Badge variant="info">Ativo</Badge> {paciente.seguradora || 'Apólice Standard'}
                           </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="p-6 border-l-4 border-l-danger-500 bg-danger-50/10">
                <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-widest flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-4 h-4 text-danger-500" /> Alergias
                </h3>
                <div className="flex flex-wrap gap-2">
                  {!paciente?.alergias || paciente.alergias.length === 0 ? (
                    <p className="text-sm text-neutral-500 italic">Nenhuma alergia registada.</p>
                  ) : (
                    paciente.alergias.map((a: string, idx: number) => (
                      <Badge key={idx} variant="error" className="px-3 py-1 bg-white border border-danger-200">
                        {a}
                      </Badge>
                    ))
                  )}
                </div>
                <p className="mt-4 text-[10px] text-neutral-400 italic">
                  * Por motivos de segurança clínica, a alteração e gestão de quadros alergénicos só pode ser feita presencialmente pelo Médico.
                </p>
              </Card>
            </div>
          </div>
        )}

        {/* TAB 2: SEGURANÇA E DANGER ZONE */}
        {activeTab === 'seguranca' && (
          <div className="max-w-xl mx-auto space-y-8">
            <Card className="p-8">
              <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2 mb-2">
                <Lock className="w-5 h-5 text-primary-500" /> Alterar Palavra-passe
              </h3>
              <p className="text-sm text-neutral-500 mb-6">Proteja a sua conta utilizando uma palavra-passe única com pelo menos 8 caracteres.</p>
              
              <form onSubmit={handlePasswordChange} className="space-y-5">
                <Input 
                  type="password" 
                  label="Palavra-passe Atual" 
                  placeholder="••••••••"
                  value={passwords.oldPassword}
                  onChange={(e) => setPasswords({...passwords, oldPassword: e.target.value})}
                  required
                />
                <Input 
                  type="password" 
                  label="Nova Palavra-passe" 
                  placeholder="Pelo menos 8 caracteres"
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords({...passwords, newPassword: e.target.value})}
                  required
                />
                <Input 
                  type="password" 
                  label="Confirmar Nova Palavra-passe" 
                  placeholder="••••••••"
                  value={passwords.confirmPassword}
                  onChange={(e) => setPasswords({...passwords, confirmPassword: e.target.value})}
                  required
                />

                {error ? (
                   <div className="p-3 bg-danger-50 border border-danger-100 rounded-lg text-danger-600 text-sm">
                      {error.message}
                   </div>
                ) : null}

                <div className="pt-4 flex justify-end gap-3">
                  <Button type="submit" loading={loading} className="px-8">
                    Atualizar Segurança
                  </Button>
                </div>
              </form>
            </Card>

            <div className="border border-danger-200 bg-danger-50/50 rounded-2xl p-8 space-y-4">
              <h3 className="text-lg font-bold text-danger-700 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" /> Zona de Perigo
              </h3>
              <p className="text-sm text-danger-600/80 leading-relaxed">
                Desativar a sua conta irá revogar o seu acesso imediato ao portal da ClínicaPlus. Note que, por força da legislação médica, o seu histórico de consultas poderá ser preservado no sistema do Hospital.
              </p>
              <div className="pt-2">
                <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
                  Desativar a minha conta
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: EXPORTAÇÃO */}
        {activeTab === 'exportar' && (
           <div className="max-w-2xl mx-auto">
             <Card className="p-8">
                <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-2xl flex items-center justify-center mb-6">
                   <FileText className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-neutral-900 mb-2">
                  Relatório do Paciente (PDF)
                </h3>
                <p className="text-sm text-neutral-500 mb-8 leading-relaxed">
                  Gere um ficheiro comprimido contendo todo o seu histórico detalhado na ClínicaPlus. O ficheiro incluirá as Receitas Prescritas (válidas e passadas), resumo das Consultas de Triagem e Declarações atestadas.
                </p>
                
                <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-100 flex items-center justify-between mb-8">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white shadow-sm border border-neutral-200 rounded-lg flex items-center justify-center">
                         <span className="text-xs font-black text-danger-600">PDF</span>
                      </div>
                      <div>
                         <p className="text-sm font-bold text-neutral-900">dossier_clinico_{utilizador?.nome?.toLowerCase().replace(/\s/g, '_')}.pdf</p>
                         <p className="text-xs text-neutral-500">Última atualização: Hoje</p>
                      </div>
                   </div>
                    <Button 
                      variant="secondary" 
                      onClick={handlePrintDossier} 
                      loading={isPreparingPrint || (isPreparingPrint && isDataLoading)}
                      disabled={hasError}
                    >
                      {isPreparingPrint ? 'A Processar...' : 'Gerar Relatório'}
                    </Button>
                </div>

                <div className="flex gap-2">
                   <ShieldCheck className="w-4 h-4 text-success-500 mt-0.5" />
                   <p className="text-xs text-neutral-500">
                     A exportação de dados está protegida com marca de água do Sistema de Gestão da Qualidade da ClinicaPlus, sendo aceite legalmente por outras instituições de Saúde.
                   </p>
                </div>
             </Card>
           </div>
        )}

      </div>

      {/* MODAL DE DESATIVAÇÃO */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Confirmar Desativação">
         <div className="space-y-4">
           <p className="text-sm text-neutral-600">
             Tem a certeza de que pretende <strong>Desativar Restritivamente</strong> a sua conta nesta plataforma? Esta ação invalida a sua palavra-passe imediatamente. Estará a abrir mão do acesso ao portal de marcações sem o contacto direto à nossa receção.
           </p>
           <div className="flex gap-3 justify-end pt-4">
             <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>Cancelar</Button>
             <Button variant="danger" disabled>Desativar Definitivamente</Button>
           </div>
         </div>
      </Modal>

      {/* MODAL DE EDIÇÃO */}
      <Modal 
        isOpen={showEditModal} 
        onClose={() => setShowEditModal(false)} 
        title="Editar Informações Pessoais"
        size="lg"
      >
        <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-6 mt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Input 
                label="Nome Completo" 
                {...form.register('nome')} 
                error={form.formState.errors.nome?.message}
                required
              />
            </div>
            <Input 
              label="Email" 
              type="email"
              {...form.register('email')} 
              error={form.formState.errors.email?.message}
              required
            />
            <Input 
              label="Telefone" 
              {...form.register('telefone')} 
              error={form.formState.errors.telefone?.message}
            />
            <Input 
              label="Data de Nascimento" 
              type="date"
              {...form.register('dataNascimento')} 
              error={form.formState.errors.dataNascimento?.message}
              required
            />
            <Select 
              label="Género"
              options={[
                { value: 'M', label: 'Masculino' },
                { value: 'F', label: 'Feminino' },
                { value: 'OUTRO', label: 'Outro' }
              ]}
              {...form.register('genero')}
              error={form.formState.errors.genero?.message}
            />
            <Select 
              label="Província"
              options={PROVINCES.map(p => ({ value: p, label: p }))}
              {...form.register('provincia')}
              error={form.formState.errors.provincia?.message}
            />
            <Input 
              label="Endereço" 
              {...form.register('endereco')} 
              error={form.formState.errors.endereco?.message}
            />
            <Input 
              label="Seguradora (Opcional)" 
              {...form.register('seguradora')} 
              error={form.formState.errors.seguradora?.message}
            />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-neutral-100">
            <Button variant="ghost" type="button" onClick={() => setShowEditModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isUpdating}>
              Guardar Alterações
            </Button>
          </div>
        </form>
      </Modal>

      {/* Componente de Impressão (Renderizado apenas quando necessário ou preparado) */}
      {(isDataReady || isPreparingPrint) && paciente && clinicaData && (
        <DossierClinicoPrint
          ref={dossierPrintRef}
          paciente={paciente}
          agendamentos={agendamentosData?.items || []}
          receitas={receitasData || []}
          clinica={clinicaData}
        />
      )}
    </div>
  );
}
