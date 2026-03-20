import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Hexagon, User, ArrowLeft, Send } from 'lucide-react';
import { z } from 'zod';

import { authApi } from '../../api/auth';
import type { ForgotPasswordInput } from '@clinicaplus/types';
import { getTenantSlugFromURL } from '@clinicaplus/utils';

const ForgotPasswordSchema = z.object({
  email: z.string().email('E-mail inválido').trim().toLowerCase(),
  clinicaSlug: z.string().optional(),
});

export const ForgotPasswordPage = () => {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: { email: '', clinicaSlug: '' },
  });

  const [isSuccess, setIsSuccess] = React.useState(false);
  const [tenantSlug, setTenantSlug] = React.useState<string | null>(null);

  // Auto-detect tenant from subdomain on mount
  React.useEffect(() => {
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
    mutationFn: (data: ForgotPasswordInput) => authApi.forgotPassword(data),
    onSuccess: () => setIsSuccess(true),
  });

  return (
    <div className="h-screen w-full flex bg-slate-50 font-sans selection:bg-emerald-500/30 overflow-hidden">
      
      {/* Lado Esquerdo: A Estética (P5 Design System) */}
      <div className="hidden lg:flex flex-col justify-center w-[60%] xl:w-[65%] h-full relative overflow-hidden p-12 lg:p-20">
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-[20s] ease-out hover:scale-105"
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&q=80&w=2000)' }}
        />
        <div className="absolute inset-0 bg-teal-950/80 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-teal-950 via-teal-950/40 to-transparent" />

        <div className="relative z-10 w-full max-w-2xl text-white animate-in slide-in-from-bottom-8 fade-in duration-1000">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-white/10 backdrop-blur-md p-3 border border-white/10">
              <Hexagon size={32} className="text-teal-400 stroke-[1.5]" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white/90">ClinicaPlus</span>
          </div>

          <h1 className="text-5xl lg:text-6xl font-semibold leading-[1.1] mb-6 text-white tracking-tight text-balance">
            Recupere o Seu <br/> <span className="text-teal-400 font-light italic">Acesso Seguro.</span>
          </h1>
          <p className="text-teal-100/80 text-lg font-light max-w-lg leading-relaxed text-balance">
            Sabemos que gerir uma clínica clínica é complexo. Recuperar a sua palavra-passe não deve sê-lo.
          </p>
        </div>
      </div>

      {/* Lado Direito: A Engenharia (P5 Design System) */}
      <div className="w-full lg:w-[40%] xl:w-[35%] h-full bg-white border-l border-slate-100 relative shadow-2xl overflow-y-auto px-6 sm:px-12 xl:px-16">
        <Link to="/login" className="absolute top-8 left-6 sm:left-12 flex items-center text-sm font-medium text-slate-500 hover:text-teal-600 transition-colors z-20">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Voltar ao login
        </Link>

        <div className="w-full max-w-md mx-auto py-12 lg:py-28 z-10 animate-in fade-in slide-in-from-right-8 duration-700">
          
          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">
              {tenantSlug ? `Recuperar acesso em ${tenantSlug}` : 'Recuperar acesso'}
            </h2>
            <p className="text-slate-600 text-sm font-medium">
              Introduza o seu email para receber instruções de recuperação.
            </p>
          </div>

          {isSuccess ? (
            <div className="p-6 bg-emerald-50 text-emerald-800 border border-emerald-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-500">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                <Send className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Instruções enviadas!</h3>
              <p className="text-emerald-700/80 text-sm leading-relaxed">
                Verifique a sua caixa de entrada. Enviámos-lhe um e-mail com um link seguro para definir uma nova palavra-passe.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5" noValidate>
              
              {/* Input Workspace — hidden when tenant is auto-detected from subdomain */}
              {!tenantSlug && (
                <div className="space-y-1.5 group">
                  <label htmlFor="clinicaSlug" className="text-sm font-semibold text-slate-700 group-focus-within:text-teal-700 transition-colors">
                    Identificador da Clínica
                  </label>
                  <div className="relative">
                    <Hexagon className="absolute left-3.5 top-3 h-5 w-5 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
                    <input
                      id="clinicaSlug"
                      className={`flex h-11 w-full border bg-white px-3 py-2 pl-11 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all ${errors.clinicaSlug ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200'}`}
                      placeholder="slug-da-clinica"
                      {...register('clinicaSlug')}
                      onChange={(e) => {
                        const formatted = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                        setValue('clinicaSlug', formatted);
                      }}
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
                  <User className="absolute left-3.5 top-3 h-5 w-5 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
                  <input
                    className={`flex h-11 w-full border bg-white px-3 py-2 pl-11 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all ${errors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200'}`}
                    placeholder="nome@clinica.ao"
                    type="email"
                    {...register('email')}
                  />
                </div>
                {errors.email && <p className="text-[13px] text-red-500 font-medium">{errors.email.message}</p>}
              </div>

              {mutation.isError && (
                <div className="p-3 bg-red-50 text-red-700 text-sm font-medium border border-red-100 mt-2">
                  Não foi possível enviar o e-mail de recuperação.
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="w-full h-12 bg-slate-900 hover:bg-teal-700 text-white font-semibold text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none shadow-md shadow-slate-900/10"
                >
                  {mutation.isPending ? 'A enviar...' : 'Enviar Instruções'}
                </button>
              </div>
            </form>
          )}

          <p className="text-center text-xs text-slate-500 mt-10 font-medium absolute bottom-8 left-0 right-0 lg:static lg:mt-16">
            &copy; {new Date().getFullYear()} ClinicaPlus. Sistema de Agendamentos.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
