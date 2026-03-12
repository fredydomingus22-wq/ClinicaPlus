import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../../stores/auth.store';
import { useMyProfile, useUpdateMyProfile } from '../../hooks/useMedicos';
import { authApi } from '../../api/auth';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  Card,
  Button,
  Badge,
  Avatar,
  Input,
} from '@clinicaplus/ui';
import {
  Mail,
  ShieldCheck,
  Lock,
  Smartphone,
  Clock,
  Briefcase,
  Award,
  Pencil,
  Loader2,
  Save,
  X,
  CalendarDays,
  Eye,
  EyeOff,
} from 'lucide-react';
import { getInitials } from '@clinicaplus/utils';
import type { MedicoSelfUpdateInput, MedicoHorario } from '@clinicaplus/types';
import { MedicoSelfUpdateSchema } from '@clinicaplus/types';

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

// ─── Profile form schema ──────────────────────────────────────────────────────
const ProfileFormSchema = MedicoSelfUpdateSchema.extend({
  telefoneDireto: z.string().max(20).optional(),
  duracaoConsulta: z.coerce.number().int().min(10).max(120).optional(),
});
type ProfileFormInput = z.infer<typeof ProfileFormSchema>;

// ─── Days labels ─────────────────────────────────────────────────────────────
const DAYS = [
  { key: 'segunda', label: 'Segunda-feira' },
  { key: 'terca',   label: 'Terça-feira' },
  { key: 'quarta',  label: 'Quarta-feira' },
  { key: 'quinta',  label: 'Quinta-feira' },
  { key: 'sexta',   label: 'Sexta-feira' },
  { key: 'sabado',  label: 'Sábado' },
  { key: 'domingo', label: 'Domingo' },
] as const;

type DayKey = (typeof DAYS)[number]['key'];

const DEFAULT_HORARIO: MedicoHorario = {
  segunda: { ativo: true,  inicio: '08:00', fim: '17:00', pausaInicio: '12:00', pausaFim: '13:00' },
  terca:   { ativo: true,  inicio: '08:00', fim: '17:00', pausaInicio: '12:00', pausaFim: '13:00' },
  quarta:  { ativo: true,  inicio: '08:00', fim: '17:00', pausaInicio: '12:00', pausaFim: '13:00' },
  quinta:  { ativo: true,  inicio: '08:00', fim: '17:00', pausaInicio: '12:00', pausaFim: '13:00' },
  sexta:   { ativo: true,  inicio: '08:00', fim: '17:00', pausaInicio: '12:00', pausaFim: '13:00' },
  sabado:  { ativo: false, inicio: '',      fim: '',       pausaInicio: '',      pausaFim: ''      },
  domingo: { ativo: false, inicio: '',      fim: '',       pausaInicio: '',      pausaFim: ''      },
};

// ─── Tab type ─────────────────────────────────────────────────────────────────
type Tab = 'DADOS' | 'HORARIO' | 'SEGURANCA';

/**
 * Physician Profile Page — fully interactive with real BE-FE integration.
 * Allows editing professional data, weekly schedule, and password.
 */
export default function PerfilPage() {
  const utilizador = useAuthStore((s) => s.utilizador);
  const [activeTab, setActiveTab] = useState<Tab>('DADOS');
  const [isEditing, setIsEditing] = useState(false);
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [horario, setHorario] = useState<MedicoHorario>(DEFAULT_HORARIO);

  const { data: perfil, isLoading } = useMyProfile();
  const updateProfile = useUpdateMyProfile();

  // Sync horario from server when profile loads
  React.useEffect(() => {
    if (perfil?.horario) {
      setHorario(perfil.horario as MedicoHorario);
    }
  }, [perfil?.horario]);

  // ── Profile form ────────────────────────────────────────────────────────────
  const {
    register: regProfile,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
    formState: { errors: profileErrors, isDirty: profileDirty },
  } = useForm<ProfileFormInput>({
    resolver: zodResolver(ProfileFormSchema),
    values: {
      telefoneDireto: perfil?.telefoneDireto ?? '',
      duracaoConsulta: perfil?.duracaoConsulta ?? 30,
    },
  });

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
      const error = err as { response?: { data?: { error?: { message?: string } } }; message: string };
      toast.error(error.response?.data?.error?.message || 'Erro ao alterar a palavra-passe.');
    },
  });

  // ── Handlers ────────────────────────────────────────────────────────────────
  const onSaveProfile = (data: ProfileFormInput) => {
    const payload: MedicoSelfUpdateInput = {};
    if (data.telefoneDireto !== undefined) payload.telefoneDireto = data.telefoneDireto;
    if (data.duracaoConsulta !== undefined) payload.duracaoConsulta = Number(data.duracaoConsulta);
    updateProfile.mutate(payload, { onSuccess: () => setIsEditing(false) });
  };

  const onSaveHorario = () => {
    updateProfile.mutate({ horario });
  };

  const toggleDay = (day: DayKey) => {
    setHorario((prev) => ({
      ...prev,
      [day]: { ...prev[day], ativo: !prev[day].ativo },
    }));
  };

  const updateDayTime = (day: DayKey, field: string, value: string) => {
    setHorario((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  const cancelEdit = () => {
    resetProfile();
    setIsEditing(false);
  };

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'DADOS',    label: 'Dados Profissionais', icon: <Briefcase className="w-4 h-4" /> },
    { id: 'HORARIO',  label: 'Horário de Trabalho', icon: <CalendarDays className="w-4 h-4" /> },
    { id: 'SEGURANCA',label: 'Segurança',           icon: <Lock className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-screen-xl mx-auto space-y-8 animate-fade-in pb-24 md:pb-12 px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">O Meu Perfil Profissional</h1>
          <p className="text-neutral-500 mt-1">Gerencie as suas informações de contacto, horário e acesso à plataforma.</p>
        </div>
        {perfil?.ativo && (
          <Badge variant="success" className="px-4 py-1.5 text-xs font-bold ring-4 ring-success-50">
            Médico Ativo
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT — Profile card + tabs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Header Card */}
          <Card className="p-8">
            {isLoading ? (
              <div className="flex items-center gap-4 animate-pulse">
                <div className="w-20 h-20 rounded-full bg-neutral-200" />
                <div className="space-y-2 flex-1">
                  <div className="h-5 bg-neutral-200 rounded w-48" />
                  <div className="h-4 bg-neutral-200 rounded w-32" />
                </div>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="shrink-0">
                  <Avatar
                    initials={getInitials(utilizador?.nome || 'M')}
                    size="lg"
                    className="border-4 border-white shadow-xl"
                  />
                </div>
                <div className="flex-1 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div>
                      <h2 className="text-2xl font-bold text-neutral-900">{utilizador?.nome}</h2>
                      <p className="text-primary-600 font-bold text-sm uppercase tracking-widest mt-1">
                        {perfil?.especialidade?.nome || utilizador?.medico?.especialidade?.nome || 'Médico Clínico'}
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
                      <Smartphone className="w-4 h-4 opacity-50 shrink-0" />
                      <span className="text-sm font-medium">
                        {perfil?.telefoneDireto || <span className="text-neutral-400 italic">Sem telefone</span>}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-neutral-600">
                      <Briefcase className="w-4 h-4 opacity-50 shrink-0" />
                      <span className="text-sm font-medium">OMSA: {perfil?.ordem || '—'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-neutral-600">
                      <ShieldCheck className="w-4 h-4 text-success-500 shrink-0" />
                      <span className="text-sm font-bold text-neutral-900 tracking-tight">Acesso Nível Médico</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Tabs */}
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

          {/* ── Tab: Dados Profissionais ───────────────────────────────── */}
          {activeTab === 'DADOS' && (
            <Card className="p-8 space-y-6">
              <h3 className="font-bold text-neutral-900 border-b border-neutral-100 pb-4">
                {isEditing ? 'Editar Dados de Contacto' : 'Dados da Conta'}
              </h3>
              {isEditing ? (
                <form onSubmit={handleProfileSubmit(onSaveProfile)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">
                        Nome Completo
                      </label>
                      <Input value={utilizador?.nome} readOnly className="bg-neutral-50 cursor-not-allowed" />
                      <p className="text-[10px] text-neutral-400">O nome é gerido pelo administrador.</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">
                        Email Corporativo
                      </label>
                      <Input value={utilizador?.email} readOnly className="bg-neutral-50 cursor-not-allowed" />
                      <p className="text-[10px] text-neutral-400">O email é gerido pelo administrador.</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">
                        Telefone Direto
                      </label>
                      <Input
                        {...regProfile('telefoneDireto')}
                        placeholder="+244 9XX XXX XXX"
                        error={profileErrors.telefoneDireto?.message}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">
                        Duração da Consulta (min)
                      </label>
                      <Input
                        {...regProfile('duracaoConsulta')}
                        type="number"
                        min={10}
                        max={120}
                        step={5}
                        error={profileErrors.duracaoConsulta?.message}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
                    <Button type="button" variant="ghost" onClick={cancelEdit}>Cancelar</Button>
                    <Button
                      type="submit"
                      disabled={(!profileDirty && !updateProfile.isPending) || updateProfile.isPending}
                    >
                      {updateProfile.isPending ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> A guardar...</>
                      ) : (
                        <><Save className="w-4 h-4 mr-2" /> Guardar Alterações</>
                      )}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">Nome Completo</label>
                    <Input value={utilizador?.nome} readOnly className="bg-neutral-50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">Email Corporativo</label>
                    <Input value={utilizador?.email} readOnly className="bg-neutral-50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">Telefone Direto</label>
                    <Input value={perfil?.telefoneDireto || ''} readOnly className="bg-neutral-50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">Duração da Consulta</label>
                    <Input value={`${perfil?.duracaoConsulta ?? 30} min`} readOnly className="bg-neutral-50" />
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* ── Tab: Horário ──────────────────────────────────────────── */}
          {activeTab === 'HORARIO' && (
            <Card className="p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
                <h3 className="font-bold text-neutral-900">Horário Semanal</h3>
                <Button
                  size="sm"
                  onClick={onSaveHorario}
                  disabled={updateProfile.isPending}
                >
                  {updateProfile.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> A guardar...</>
                  ) : (
                    <><Save className="w-4 h-4 mr-2" /> Guardar Horário</>
                  )}
                </Button>
              </div>

              <div className="space-y-4">
                {DAYS.map(({ key, label }) => {
                  const day = horario[key];
                  return (
                    <div
                      key={key}
                      className={`rounded-xl border p-4 transition-colors ${
                        day.ativo ? 'border-primary-200 bg-primary-50/40' : 'border-neutral-200 bg-neutral-50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Toggle */}
                        <button
                          type="button"
                          onClick={() => toggleDay(key)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
                            day.ativo ? 'bg-primary-600' : 'bg-neutral-300'
                          }`}
                          aria-label={`${day.ativo ? 'Desativar' : 'Ativar'} ${label}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                              day.ativo ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                        <span className={`font-semibold text-sm w-32 shrink-0 ${day.ativo ? 'text-neutral-900' : 'text-neutral-400'}`}>
                          {label}
                        </span>

                        {day.ativo && (
                          <div className="flex flex-wrap gap-3 flex-1">
                            <div className="flex items-center gap-2">
                              <label className="text-[10px] font-bold text-neutral-500 uppercase whitespace-nowrap">Início</label>
                              <input
                                type="time"
                                value={day.inicio ?? ''}
                                onChange={(e) => updateDayTime(key, 'inicio', e.target.value)}
                                className="border border-neutral-300 rounded-lg px-2 py-1 text-sm font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="text-[10px] font-bold text-neutral-500 uppercase whitespace-nowrap">Fim</label>
                              <input
                                type="time"
                                value={day.fim ?? ''}
                                onChange={(e) => updateDayTime(key, 'fim', e.target.value)}
                                className="border border-neutral-300 rounded-lg px-2 py-1 text-sm font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="text-[10px] font-bold text-neutral-500 uppercase whitespace-nowrap">Pausa</label>
                              <input
                                type="time"
                                value={day.pausaInicio ?? ''}
                                onChange={(e) => updateDayTime(key, 'pausaInicio', e.target.value)}
                                className="border border-neutral-300 rounded-lg px-2 py-1 text-sm font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                              />
                              <span className="text-neutral-400 text-xs">→</span>
                              <input
                                type="time"
                                value={day.pausaFim ?? ''}
                                onChange={(e) => updateDayTime(key, 'pausaFim', e.target.value)}
                                className="border border-neutral-300 rounded-lg px-2 py-1 text-sm font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                              />
                            </div>
                          </div>
                        )}
                        {!day.ativo && (
                          <span className="text-xs text-neutral-400 italic">Dia de folga</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* ── Tab: Segurança ────────────────────────────────────────── */}
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
                    <><ShieldCheck className="w-4 h-4 mr-2" /> Alterar Palavra-passe</>
                  )}
                </Button>
              </form>

              <div className="pt-4 border-t border-neutral-100">
                <h4 className="text-xs font-bold text-neutral-900 mb-3">Dicas de Segurança</h4>
                <ul className="space-y-1.5 text-xs text-neutral-500">
                  <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-neutral-400 shrink-0" />Use pelo menos 8 caracteres com letras e números.</li>
                  <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-neutral-400 shrink-0" />Não partilhe a sua palavra-passe com ninguém.</li>
                  <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-neutral-400 shrink-0" />Em caso de suspeita de acesso não autorizado, altere imediatamente.</li>
                </ul>
              </div>
            </Card>
          )}
        </div>

        {/* RIGHT — Stats sidebar */}
        <div className="space-y-6">
          {/* Duração da consulta */}
          <Card className="p-6 bg-primary-900 text-white border-0 shadow-xl shadow-primary-500/20 relative overflow-hidden">
            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between">
                <Award className="w-8 h-8 text-teal-400 opacity-80" />
                <Badge variant="neutral" className="bg-white/20 border-0 text-white text-[10px] font-bold">
                  {perfil?.especialidade?.nome?.toUpperCase() || 'CLÍNICO'}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-white/70">Duração Padrão</p>
                <h3 className="text-3xl font-bold text-white mt-1">
                  {perfil?.duracaoConsulta ?? 30} <span className="text-sm opacity-60">min</span>
                </h3>
              </div>
              <div className="pt-4 mt-2 border-t border-white/10 text-xs font-bold text-white/70">
                OMSA: {perfil?.ordem || '—'}
              </div>
            </div>
            <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
          </Card>

          {/* Métricas */}
          <Card className="p-6">
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-widest mb-6">
              Resumo do Perfil
            </h3>
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-orange-50 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-neutral-900">Duração / Consulta</p>
                    <p className="text-[10px] text-neutral-400">Configuração atual</p>
                  </div>
                </div>
                <span className="font-bold text-neutral-900">{perfil?.duracaoConsulta ?? '—'} min</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-success-50 flex items-center justify-center">
                    <CalendarDays className="w-5 h-5 text-success-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-neutral-900">Dias Ativos</p>
                    <p className="text-[10px] text-neutral-400">Dias com consultas</p>
                  </div>
                </div>
                <span className="font-bold text-neutral-900">
                  {DAYS.filter(({ key }) => horario[key]?.ativo).length} / 7
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
