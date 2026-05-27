import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../../stores/auth.store';
import { authApi } from '../../api/auth';
import { medicosApi } from '../../api/medicos';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  Card,
  Button,
  Badge,
  Avatar,
  Input,
  Modal,
  Select,
} from '@clinicaplus/ui';
import {
  User,
  ShieldCheck,
  Lock,
  Mail,
  Pencil,
  X,
  Eye,
  EyeOff,
  History,
  ShieldAlert,
  Loader2,
  Activity,
  Stethoscope,
  Clock
} from 'lucide-react';
import { getInitials } from '@clinicaplus/utils';
import { UtilizadorUpdateInput, MedicoCreateInput } from '@clinicaplus/types';
import { useAuditLogs } from '../../hooks/useAuditLogs';
import { useEspecialidades } from '../../hooks/useEspecialidades';
import { ImageUploader } from '../../components/shared/ImageUploader';
import { apiClient } from '../../api/client';

const getAvatarUploadUrl = async (fileName: string) => {
  const { data } = await apiClient.post('/utilizadores/me/avatar-upload-url', { fileName });
  return data.data;
};

const confirmAvatarUpload = async (path: string, provider: 'supabase'|'local', base64Data?: string) => {
  const { data } = await apiClient.post('/utilizadores/me/avatar-confirm', { path, provider, base64Data });
  return data.data;
};

// ─── Types and Helper ────────────────────────────────────────────────────────
interface ApiErrorResponse {
  response?: {
    data?: {
      error?: {
        message?: string;
      };
    };
  };
}

// ─── Identity form schema ─────────────────────────────────────────────────────
const IdentitySchema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('Introduz um email válido'),
});

type IdentityInput = z.infer<typeof IdentitySchema>;

// ─── Password form schema ─────────────────────────────────────────────────────
const PasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Palavra-passe atual obrigatória'),
  newPassword: z.string().min(8, 'Mínimo de 8 caracteres'),
  confirmPassword: z.string().min(1, 'Confirmação obrigatória'),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'As palavras-passe não coincidem',
  path: ['confirmPassword'],
});

type PasswordInput = z.infer<typeof PasswordSchema>;

// ─── Tab type ─────────────────────────────────────────────────────────────────
type Tab = 'DADOS' | 'SEGURANCA' | 'AUDITORIA';

/**
 * Admin Profile Page
 */
export default function AdminPerfilPage() {
  const utilizador = useAuthStore((s) => s.utilizador);
  const [activeTab, setActiveTab] = useState<Tab>('DADOS');
  const [isEditing, setIsEditing] = useState(false);
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isMedicoModalOpen, setIsMedicoModalOpen] = useState(false);

  // Check if admin is already configured as a médico
  const { data: medicoData, isLoading: isLoadingMedico } = useQuery({
    queryKey: ['admin-medico', utilizador?.id],
    queryFn: () => medicosApi.getMe(),
    enabled: Boolean(utilizador?.id && utilizador?.papel === 'ADMIN'),
    retry: false,
  });

  const isAlreadyMedico = Boolean(medicoData);
  const isAdmin = utilizador?.papel === 'ADMIN';

  // ── Audit Logs ─────────────────────────────────────────────────────────────
  const { data: auditData, isLoading: isLoadingAudit } = useAuditLogs({
    ...(utilizador?.id ? { actorId: utilizador.id } : {}),
    limit: 5,
  });

  const logs = auditData?.data || [];

  // ── Password form ───────────────────────────────────────────────────────────
  const {
    register: regPwd,
    handleSubmit: handlePwdSubmit,
    reset: resetPwd,
    formState: { errors: pwdErrors },
  } = useForm<PasswordInput>({ resolver: zodResolver(PasswordSchema) });

  const changePassword = useMutation({
    mutationFn: (d: PasswordInput) => authApi.changePassword(d.oldPassword, d.newPassword),
    onSuccess: () => {
      toast.success('Palavra-passe alterada com sucesso!');
      resetPwd();
    },
    onError: (err: unknown) => {
      const error = err as ApiErrorResponse;
      toast.error(error.response?.data?.error?.message || 'Erro ao alterar a palavra-passe.');
    },
  });

  // ── Identity form ───────────────────────────────────────────────────────────
  const {
    register: regId,
    handleSubmit: handleIdSubmit,
    reset: resetId,
    formState: { errors: idErrors },
  } = useForm<IdentityInput>({
    resolver: zodResolver(IdentitySchema),
    defaultValues: {
      nome: utilizador?.nome || '',
      email: utilizador?.email || '',
    },
  });

  // Reset identity form when utilizador loads
  React.useEffect(() => {
    if (utilizador) {
      resetId({
        nome: utilizador.nome,
        email: utilizador.email,
      });
    }
  }, [utilizador, resetId]);

  const updateProfile = useMutation({
    mutationFn: (d: UtilizadorUpdateInput) => authApi.updateProfile(d),
    onSuccess: (updated) => {
      toast.success('Perfil atualizado com sucesso!');
      useAuthStore.getState().setUtilizador(updated);
      setIsEditing(false);
    },
    onError: (err: unknown) => {
      const error = err as ApiErrorResponse;
      toast.error(error.response?.data?.error?.message || 'Erro ao atualizar o perfil.');
    },
  });

  const { data: especialidadesData } = useEspecialidades({ ativo: true, limit: 100 });
  const especialidadesOptions = (especialidadesData?.items || []).map((e: any) => ({ 
    value: e.id, 
    label: e.nome 
  }));

  const setupAsMedico = useMutation({
    mutationFn: (data: MedicoCreateInput) => medicosApi.setupAsMedico(data),
    onSuccess: () => {
      toast.success('Configurado como médico com sucesso!');
      setIsMedicoModalOpen(false);
      // Refetch medico data
      window.location.reload();
    },
    onError: (err: unknown) => {
      const error = err as ApiErrorResponse;
      toast.error(error.response?.data?.error?.message || 'Erro ao configurar como médico.');
    },
  });

  const cancelEdit = () => {
    setIsEditing(false);
    resetId();
  };

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'DADOS',     label: 'Dados da Conta', icon: <User className="w-4 h-4" /> },
    { id: 'SEGURANCA', label: 'Segurança',      icon: <Lock className="w-4 h-4" /> },
    { id: 'AUDITORIA', label: 'Audit Log',      icon: <History className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-screen-xl mx-auto space-y-8 animate-fade-in pb-24 md:pb-12 px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">O Meu Perfil Administrativo</h1>
          <p className="text-neutral-500 mt-1">Gerencie as suas informações de acesso e segurança da plataforma.</p>
        </div>
        <Badge variant="success" className="px-4 py-1.5 text-xs font-bold ring-4 ring-success-50">
          Admin Ativo
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT — Profile card + tabs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Header Card */}
          <Card className="p-8">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="shrink-0">
                 <ImageUploader 
                    initialImage={utilizador?.avatarUrl}
                    onUploadSuccess={(url) => {
                      if (utilizador) {
                        const timestampedUrl = `${url}?t=${Date.now()}`;
                        useAuthStore.getState().setUtilizador({ ...utilizador, avatarUrl: timestampedUrl });
                      }
                    }}
                    getUploadUrlFn={getAvatarUploadUrl}
                    confirmUploadFn={confirmAvatarUpload}
                    label=""
                  />
              </div>
              <div className="flex-1 space-y-4 pt-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-2xl font-bold text-neutral-900">{utilizador?.nome}</h2>
                    <p className="text-primary-600 font-bold text-sm uppercase tracking-widest mt-1">
                      {utilizador?.papel}
                    </p>
                  </div>
                  {!isEditing ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="font-bold"
                      onClick={() => { setIsEditing(true); setActiveTab('DADOS'); }}
                    >
                      <Pencil className="w-3.5 h-3.5 mr-2" /> Editar Perfil
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={cancelEdit} className="text-neutral-500">
                      <X className="w-3.5 h-3.5 mr-1.5" /> Cancelar
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-neutral-100">
                  <div className="flex items-center gap-3 text-neutral-600">
                    <Mail className="w-4 h-4 opacity-50 shrink-0" />
                    <span className="text-sm font-medium truncate">{utilizador?.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-neutral-600">
                    <ShieldCheck className="w-4 h-4 text-success-500 shrink-0" />
                    <span className="text-sm font-bold text-neutral-900 tracking-tight">Nível Administrativo</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Tabs Navigation */}
          <div className="flex gap-1 bg-neutral-100 p-1 rounded-xl border border-neutral-200">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="space-y-6">
            {activeTab === 'DADOS' && (
              <Card className="p-8 space-y-6">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
                  <h3 className="font-bold text-neutral-900">
                    Identidade do Operador
                  </h3>
                  {isEditing && (
                    <div className="flex gap-2">
                       <Button 
                         variant="primary" 
                         size="sm" 
                         onClick={handleIdSubmit((d) => updateProfile.mutate(d))}
                         disabled={updateProfile.isPending}
                       >
                         {updateProfile.isPending ? 'A guardar...' : 'Guardar Alterações'}
                       </Button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">
                      Nome de Registo
                    </label>
                    <Input 
                      {...regId('nome')} 
                      readOnly={!isEditing} 
                      className={!isEditing ? 'bg-neutral-50' : ''} 
                      error={idErrors.nome?.message}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">
                      Email Institucional
                    </label>
                    <Input 
                      {...regId('email')} 
                      readOnly={!isEditing} 
                      className={!isEditing ? 'bg-neutral-50' : ''} 
                      error={idErrors.email?.message}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">
                      Papel no Sistema
                    </label>
                    <Input value={utilizador?.papel} readOnly className="bg-neutral-50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">
                      ID único (UUID)
                    </label>
                    <Input value={utilizador?.id} readOnly className="bg-neutral-50" />
                  </div>
                </div>

                {isEditing && (
                  <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl flex gap-3 text-orange-700">
                    <ShieldAlert className="w-5 h-5 shrink-0" />
                    <p className="text-xs font-medium leading-relaxed">
                      Para alterar o nome ou email, por favor contacte o suporte técnico ou o Administrador Principal.
                    </p>
                  </div>
                )}

                {isAdmin && !isAlreadyMedico && !isLoadingMedico && (
                  <div className="p-4 bg-primary-50 border border-primary-100 rounded-xl flex gap-3 text-primary-700">
                    <Stethoscope className="w-5 h-5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs font-bold leading-relaxed">
                        Configurar como Médico/Especialista
                      </p>
                      <p className="text-[10px] text-primary-600 mt-1">
                        Atende pacientes e gere a sua própria agenda de consultas.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => setIsMedicoModalOpen(true)}
                    >
                      Configurar
                    </Button>
                  </div>
                )}

                {isAdmin && isAlreadyMedico && (
                  <div className="p-4 bg-success-50 border border-success-100 rounded-xl flex gap-3 text-success-700">
                    <Stethoscope className="w-5 h-5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs font-bold leading-relaxed">
                        Configurado como Médico
                      </p>
                      <p className="text-[10px] text-success-600 mt-1">
                        Especialidade: {medicoData?.especialidade?.nome || 'N/A'}
                      </p>
                    </div>
                    <Badge variant="success" className="text-[10px] font-bold uppercase">
                      Ativo
                    </Badge>
                  </div>
                )}
              </Card>
            )}

            {activeTab === 'SEGURANCA' && (
              <Card className="p-8 space-y-6">
                <h3 className="font-bold text-neutral-900 border-b border-neutral-100 pb-4">
                  Alterar Palavra-passe
                </h3>

                <form onSubmit={handlePwdSubmit((d) => changePassword.mutate(d))} className="space-y-5 max-w-md">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">
                      Palavra-passe Atual
                    </label>
                    <div className="relative">
                      <Input
                        {...regPwd('oldPassword')}
                        type={showOld ? 'text' : 'password'}
                        placeholder="••••••••"
                        error={pwdErrors.oldPassword?.message}
                      />
                      <button
                        type="button"
                        onClick={() => setShowOld((p) => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                        tabIndex={-1}
                      >
                        {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">
                      Nova Palavra-passe
                    </label>
                    <div className="relative">
                      <Input
                        {...regPwd('newPassword')}
                        type={showNew ? 'text' : 'password'}
                        placeholder="Mínimo 8 caracteres"
                        error={pwdErrors.newPassword?.message}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew((p) => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                        tabIndex={-1}
                      >
                        {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">
                      Confirmar Nova Palavra-passe
                    </label>
                    <Input
                      {...regPwd('confirmPassword')}
                      type="password"
                      placeholder="Repita a nova palavra-passe"
                      error={pwdErrors.confirmPassword?.message}
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={changePassword.isPending}
                    className="w-full"
                  >
                    {changePassword.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> A alterar...</>
                    ) : (
                      'Alterar Palavra-passe'
                    )}
                  </Button>
                </form>
              </Card>
            )}

            {activeTab === 'AUDITORIA' && (
              <Card className="p-8 space-y-6">
                <h3 className="font-bold text-neutral-900 border-b border-neutral-100 pb-4">
                  Registo de Atividade Recente
                </h3>
                <div className="space-y-3">
                  {isLoadingAudit ? (
                    <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>
                  ) : logs.length === 0 ? (
                    <div className="p-8 text-center text-neutral-400 italic text-sm">Nenhuma atividade registada.</div>
                  ) : (
                    logs.map((log) => (
                      <div key={log.id} className="flex justify-between items-center p-4 bg-neutral-50 rounded-xl">
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-neutral-900">{log.accao} - {log.recurso}</p>
                          <p className="text-[10px] text-neutral-400 uppercase tracking-widest">
                            {new Date(log.criadoEm).toLocaleString('pt-AO')}
                          </p>
                        </div>
                        <Badge variant="success" className="text-[9px] font-bold uppercase">Sucesso</Badge>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* RIGHT — Stats sidebar */}
        <div className="space-y-6">
          <Card className="p-6 bg-primary-900 text-white border-0 shadow-xl relative overflow-hidden">
            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between">
                <ShieldCheck className="w-8 h-8 text-teal-400 opacity-80" />
                <Badge variant="neutral" className="bg-white/20 border-0 text-white text-[10px] font-bold uppercase">
                  ADMIN_CORE
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-white/70">Estado da Conta</p>
                <h3 className="text-3xl font-bold text-white mt-1 uppercase">
                  Certificada
                </h3>
              </div>
              <div className="pt-4 mt-2 border-t border-white/10 text-xs font-bold text-white/70">
                VERSÃO DO PROTOCOLO: V4.9
              </div>
            </div>
            <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
          </Card>

          <Card className="p-6">
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-widest mb-6">
              Resumo do Operador
            </h3>
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary-50 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-neutral-900">Último Acesso</p>
                    <p className="text-[10px] text-neutral-400">Tempo de sessão ativa</p>
                  </div>
                </div>
                <span className="font-bold text-neutral-900 text-sm">2h 15m</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-orange-50 flex items-center justify-center">
                    <History className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-neutral-900">Ações Hoje</p>
                    <p className="text-[10px] text-neutral-400">Registos de auditoria</p>
                  </div>
                </div>
                <span className="font-bold text-neutral-900 text-sm">{auditData?.pagination.total || 0}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Modal para configurar como médico */}
      <Modal
        isOpen={isMedicoModalOpen}
        onClose={() => setIsMedicoModalOpen(false)}
        title="Configurar como Médico/Especialista"
        size="lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const data: MedicoCreateInput = {
              nome: utilizador?.nome || '',
              especialidadeId: formData.get('especialidadeId') as string,
              ordem: formData.get('ordem') as string || undefined,
              telefoneDireto: formData.get('telefoneDireto') as string || undefined,
              duracaoConsulta: Number(formData.get('duracaoConsulta')) || 30,
              preco: Number(formData.get('preco')) || 0,
              ativo: true,
              horario: {
                segunda: { ativo: true, inicio: '08:00', fim: '17:00' },
                terca: { ativo: true, inicio: '08:00', fim: '17:00' },
                quarta: { ativo: true, inicio: '08:00', fim: '17:00' },
                quinta: { ativo: true, inicio: '08:00', fim: '17:00' },
                sexta: { ativo: true, inicio: '08:00', fim: '17:00' },
                sabado: { ativo: false, inicio: '', fim: '' },
                domingo: { ativo: false, inicio: '', fim: '' },
              },
            };
            setupAsMedico.mutate(data);
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-600 uppercase tracking-widest">
              Nome
            </label>
            <Input
              name="nome"
              value={utilizador?.nome || ''}
              readOnly
              className="bg-neutral-50"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-600 uppercase tracking-widest">
              Especialidade *
            </label>
            <Select
              name="especialidadeId"
              placeholder="Selecione uma especialidade"
              options={especialidadesOptions}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-600 uppercase tracking-widest">
                Nº Ordem Médica
              </label>
              <Input name="ordem" placeholder="Opcional" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-600 uppercase tracking-widest">
                Telefone Direto
              </label>
              <Input name="telefoneDireto" placeholder="Opcional" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-600 uppercase tracking-widest">
                Preço Consulta (Kz)
              </label>
              <Input
                name="preco"
                type="number"
                defaultValue="0"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-600 uppercase tracking-widest">
                Duração (min)
              </label>
              <Select
                name="duracaoConsulta"
                options={[
                  { value: '15', label: '15 min' },
                  { value: '20', label: '20 min' },
                  { value: '30', label: '30 min' },
                  { value: '45', label: '45 min' },
                  { value: '60', label: '1 hora' },
                ]}
                defaultValue="30"
              />
            </div>
          </div>

          <div className="p-3 bg-primary-50 border border-primary-100 rounded-lg flex gap-2 text-primary-700">
            <Clock className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="text-xs">
              Horário padrão será configurado automaticamente (Seg-Sex 08:00-17:00). Pode ajustar depois no perfil de médico.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsMedicoModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={setupAsMedico.isPending}>
              Configurar como Médico
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
