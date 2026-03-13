import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Eye, EyeOff, Hexagon, Building2, User, KeyRound } from 'lucide-react';

import { LoginSchema, type LoginInput, Papel } from '@clinicaplus/types';
import { getTenantSlugFromURL } from '@clinicaplus/utils';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../stores/auth.store';

function getRedirectPath(papel: Papel, searchParams: URLSearchParams): string {
  const redirect = searchParams.get('redirect');
  if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {
    return redirect;
  }
  const map: Record<string, string> = {
    [Papel.SUPER_ADMIN]: '/admin/dashboard',
    [Papel.ADMIN]: '/admin/dashboard',
    [Papel.MEDICO]: '/medico/agenda',
    [Papel.RECEPCIONISTA]: '/recepcao/hoje',
    [Papel.PACIENTE]: '/paciente/agendamentos',
  };
  return map[papel] ?? '/dashboard';
}

export const LoginPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const [showPassword, setShowPassword] = useState(false);
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { clinicaSlug: '', email: '', password: '' },
  });

  // Auto-detect tenant from subdomain on mount
  useEffect(() => {
    const slug = getTenantSlugFromURL({
      baseDomain: import.meta.env['VITE_BASE_DOMAIN'] || undefined,
      devTenantSlug: import.meta.env['VITE_DEV_TENANT_SLUG'] || undefined,
    });
    if (slug) {
      setTenantSlug(slug);
      setValue('clinicaSlug', slug);
    }
  }, [setValue]);

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (response) => {
      setSession(response.accessToken, response.utilizador);
      const dest = getRedirectPath(response.utilizador.papel as Papel, searchParams);
      navigate(dest);
    },
    onError: (error: unknown) => {
      setValue('password', '');
      const apiError = error as { response?: { status?: number }; message?: string };
      const status = apiError.response?.status;
      if (status === 401) {
        setError('email', { message: 'Email ou senha incorrectos' });
        setError('password', { message: ' ' });
      } else if (status === 404) {
        setError('clinicaSlug', { message: 'Clínica não encontrada' });
      } else {
        setError('root', { message: apiError.message || 'Falha na ligação ao servidor.' });
      }
    },
  });

  const onSubmit = (data: LoginInput) => {
    mutation.mutate(data);
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setValue('clinicaSlug', formatted);
  };

  return (
    <div className="h-screen w-full flex bg-slate-50 font-sans selection:bg-emerald-500/30 overflow-hidden">
      
      {/* Lado Esquerdo: A Estética (P5 Design System) */}
      <div className="hidden lg:flex flex-col justify-center w-[50%] xl:w-[55%] h-full relative overflow-hidden p-12 lg:p-20">
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-[20s] ease-out hover:scale-105"
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=2000)' }}
        />
        <div className="absolute inset-0 bg-teal-950/80 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-teal-950 via-teal-950/40 to-transparent" />

        <div className="relative z-10 w-full max-w-2xl text-white animate-in slide-in-from-bottom-8 fade-in duration-1000">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10">
              <Hexagon size={32} className="text-teal-400 stroke-[1.5]" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white/90">ClinicaPlus</span>
          </div>

          <h1 className="text-5xl lg:text-6xl font-semibold leading-[1.1] mb-6 text-white tracking-tight text-balance">
            O Seu Sistema de <br/> <span className="text-teal-400 font-light italic">Agendamentos Clínicos.</span>
          </h1>
          <p className="text-teal-100/80 text-lg font-light max-w-lg leading-relaxed text-balance">
            Centralize e simplifique todas as marcações e interações com os seus pacientes num ambiente seguro e rápido.
          </p>
        </div>
      </div>

      {/* Lado Direito: A Engenharia (P5 Design System) */}
      <div className="w-full lg:w-[50%] xl:w-[45%] h-full bg-white border-l border-slate-100 relative shadow-2xl overflow-y-auto px-6 sm:px-12 xl:px-16">
        <div className="w-full max-w-md mx-auto py-12 lg:py-28 z-10 animate-in fade-in slide-in-from-right-8 duration-700">
          
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">
              {tenantSlug ? `Bem-vindo à ${tenantSlug}` : 'Bem-vindo'}
            </h2>
            <p className="text-slate-600 text-sm font-medium">
              {tenantSlug
                ? 'Insira as suas credenciais para aceder ao sistema.'
                : 'Acesso seguro ao portal da clínica.'}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            
            {/* Input Workspace — hidden when tenant is auto-detected from subdomain */}
            {!tenantSlug && (
              <div className="space-y-1.5 group">
                <label className="text-sm font-semibold text-slate-700 group-focus-within:text-teal-700 transition-colors">
                  Identificador da Clínica
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-3 h-5 w-5 text-slate-500 group-focus-within:text-teal-500 transition-colors" />
                  <input
                    className={`flex h-11 w-full rounded-xl border bg-white px-3 py-2 pl-11 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all ${errors.clinicaSlug ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200'}`}
                    placeholder="slug-da-clinica"
                    {...register('clinicaSlug')}
                    onChange={handleSlugChange}
                  />
                </div>
                {errors.clinicaSlug && <p className="text-[13px] text-red-500 font-medium">{errors.clinicaSlug.message}</p>}
              </div>
            )}

            {/* Input Email */}
            <div className="space-y-1.5 group">
              <label className="text-sm font-semibold text-slate-700 group-focus-within:text-teal-700 transition-colors">
                E-mail
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 h-5 w-5 text-slate-500 group-focus-within:text-teal-500 transition-colors" />
                <input
                  className={`flex h-11 w-full rounded-xl border bg-white px-3 py-2 pl-11 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all ${errors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200'}`}
                  placeholder="nome@clinica.ao"
                  type="email"
                  {...register('email')}
                />
              </div>
              {errors.email && <p className="text-[13px] text-red-500 font-medium">{errors.email.message}</p>}
            </div>

            {/* Input Password */}
            <div className="space-y-1.5 group">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-slate-700 group-focus-within:text-teal-700 transition-colors">
                  Palavra-passe
                </label>
                <Link to="/auth/forgot-password" title="Esqueceu a palavra-passe?" className="text-xs font-semibold text-teal-600 hover:text-teal-700 transition-colors focus:outline-none focus:underline">
                  Esqueceu a palavra-passe?
                </Link>
              </div>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-3 h-5 w-5 text-slate-500 group-focus-within:text-teal-500 transition-colors" />
                <input
                  className={`flex h-11 w-full rounded-xl border bg-white px-3 py-2 pl-11 pr-11 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all ${errors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200'}`}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 h-5 w-5 text-slate-400 hover:text-slate-600 focus:outline-none focus:text-teal-600 rounded-md transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="text-[13px] text-red-500 font-medium">{errors.password.message}</p>}
            </div>

            {/* Root Errors */}
            {errors.root && (
              <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm font-medium border border-red-100 mt-2">
                {errors.root.message}
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={mutation.isPending}
                className="w-full h-12 bg-slate-900 hover:bg-teal-700 text-white font-semibold rounded-xl text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none shadow-md shadow-slate-900/10"
              >
                {mutation.isPending ? 'A autenticar...' : 'Entrar na Plataforma'}
              </button>
            </div>
            
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-4 justify-center items-center">
            <p className="text-center text-sm text-slate-600">
              É paciente?{' '}
              <Link 
                to="/auth/registar-paciente" 
                className="font-semibold text-teal-600 hover:text-teal-700 hover:underline transition-colors focus:outline-none"
              >
                Crie a sua conta gratuita
              </Link>
            </p>
            <p className="text-center text-sm text-slate-500">
              Nova clínica?{' '}
              <Link 
                to="/auth/registar" 
                className="font-semibold text-teal-600 hover:text-teal-700 hover:underline transition-colors focus:outline-none"
              >
                Registar clínica parceira
              </Link>
            </p>
          </div>

          <p className="text-center text-xs text-slate-500 mt-8 font-medium">
            &copy; {new Date().getFullYear()} ClinicaPlus. Sistema de Agendamentos.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
