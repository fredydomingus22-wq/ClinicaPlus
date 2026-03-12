import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { type SuperAdminLoginInput } from '@clinicaplus/types';
// Component HMR trigger for type cache
import { useNavigate } from 'react-router-dom';

const SuperAdminLoginSchema = z.object({
  email: z.string().min(1, 'Email obrigatório').email('Introduz um email válido'),
  password: z.string().min(1, 'Palavra-passe obrigatória'),
});
import { useAuthStore } from '../../stores/auth.store';
import { authApi } from '../../api/auth';
import { Terminal, ShieldAlert, ArrowRight, Loader2, KeyRound } from 'lucide-react';
import { toast } from 'react-hot-toast';

export function SuperAdminLoginPage() {
  const navigate = useNavigate();
  const { setSession } = useAuthStore();
  const [isSubmitError, setIsSubmitError] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SuperAdminLoginInput>({
    resolver: zodResolver(SuperAdminLoginSchema),
    defaultValues: {
      email: '',
      password: '',
    }
  });

  // Assuming the user is super admin if they are logged in since route guard protects it, 
  // but we can check if they have a session.
  // if (isAuthenticated) {
  //  return <Navigate to="/superadmin" replace />;
  // }

  const onSubmit = async (data: SuperAdminLoginInput) => {
    setIsSubmitError(false);
    try {
      const response = await authApi.loginSuperAdmin(data);
      setSession(response.accessToken, response.utilizador);
      toast.success('Acesso ROOT concedido');
      navigate('/superadmin');
    } catch (error: unknown) {
      setIsSubmitError(true);
      // Disable ts checking for the generic error response property access as defined in the global API response shape
      // @ts-expect-error Axios Error mapping
      toast.error(error.response?.data?.error?.message || 'Acesso negado.');
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#0A0A0A] text-white font-mono selection:bg-white selection:text-black">
           {/* LEFT SECTION - PROFESSIONAL BRANDING */}
      <div className="hidden md:flex flex-col w-1/2 p-12 border-r border-[#333333] relative overflow-hidden bg-[radial-gradient(circle_at_0%_0%,_#1a1a1a_0%,_transparent_50%)]">
        
        {/* Subtle background grid pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(to right, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <div className="flex-1 flex flex-col justify-between relative z-10">
          <div>
            <div className="flex items-center gap-3 text-white mb-20 animate-[slide-in_0.5s_ease-out]">
              <div className="bg-white text-black p-2 rounded-sm border-2 border-transparent">
                <Terminal size={28} strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight uppercase leading-none font-display">
                  ClinicaPlus
                </h1>
                <p className="text-[10px] tracking-widest text-neutral-400 font-bold uppercase mt-1">
                  Administração Global
                </p>
              </div>
            </div>

            <div className="space-y-6 max-w-lg">
              <h2 className="text-4xl lg:text-5xl font-bold leading-tight font-display tracking-tight text-white">
                ÁREA <br /> RESTRITA
              </h2>
              <div className="h-1 w-16 bg-sa-primary/40" />
              <p className="text-sa-text-muted text-lg leading-relaxed font-sans mt-8">
                Esta área destina-se exclusivamente à gestão e manutenção da plataforma. Por favor, identifique-se para aceder ao painel de controlo.
              </p>
            </div>
          </div>

          <div className="space-y-4">
             <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#1a1a1a] border border-[#333] text-neutral-400 text-xs rounded-sm font-medium tracking-wide">
                <ShieldAlert size={14} className="text-red-500" />
                <span>SEGURANÇA: NÍVEL MÁXIMO</span>
             </div>
             <p className="text-neutral-600 text-[10px] uppercase font-bold tracking-widest">
               IP registado em: {new Intl.DateTimeFormat('pt-AO', { dateStyle: 'long', timeStyle: 'short' }).format(new Date())}
             </p>
          </div>
        </div>
      </div>

      {/* RIGHT SECTION - LOGIN FORM */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 sm:p-12 relative">
        <div className="w-full max-w-md animate-[fade-in_0.6s_ease-out] relative z-10">
          
          <div className="md:hidden flex items-center gap-3 text-white mb-12">
            <div className="bg-white text-black p-2 rounded-sm">
              <Terminal size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight uppercase leading-none font-display">
                ClinicaPlus
              </h1>
              <p className="text-[10px] tracking-widest text-neutral-400 font-bold uppercase mt-1">
                Administração Global
              </p>
            </div>
          </div>

          <div className="mb-10">
            <h3 className="text-2xl font-semibold mb-2 font-display tracking-tight text-white">Iniciar Sessão</h3>
            <p className="text-sa-text-muted text-sm font-sans">Introduza as suas credenciais de acesso.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2 group">
              <label className="text-xs uppercase tracking-widest font-bold text-neutral-500 group-focus-within:text-white transition-colors duration-200">
                E-mail de Administrador
              </label>
              <div className="relative">
                <input
                  type="email"
                  {...register('email')}
                  className={`w-full bg-[#111] border ${errors.email ? 'border-red-500/50' : isSubmitError ? 'border-red-500/50' : 'border-[#333] group-focus-within:border-white'} text-white px-4 py-3.5 outline-none transition-all duration-200 placeholder:text-neutral-600 rounded-sm font-sans`}
                  placeholder="admin@clinicaplus.ao"
                />
              </div>
              {errors.email && (
                <p className="text-red-400 text-xs flex items-center gap-1.5 mt-2 animate-[slide-in_0.2s_ease-out]">
                  <span className="w-1 h-1 bg-red-400 rounded-full" />
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2 group">
              <label className="text-xs uppercase tracking-widest font-bold text-neutral-500 group-focus-within:text-white transition-colors duration-200">
                Palavra-passe de Segurança
              </label>
              <div className="relative">
                <input
                  type="password"
                  {...register('password')}
                  className={`w-full bg-[#111] border ${errors.password ? 'border-red-500/50' : isSubmitError ? 'border-red-500/50' : 'border-[#333] group-focus-within:border-white'} text-white px-4 py-3.5 pr-10 outline-none transition-all duration-200 placeholder:text-neutral-600 rounded-sm font-sans`}
                  placeholder="••••••••"
                />
                <KeyRound size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-600" />
              </div>
              {errors.password && (
                <p className="text-red-400 text-xs flex items-center gap-1.5 mt-2 animate-[slide-in_0.2s_ease-out]">
                  <span className="w-1 h-1 bg-red-400 rounded-full" />
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-white hover:bg-neutral-200 text-black font-bold uppercase tracking-widest text-sm py-4 flex items-center justify-center gap-3 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group rounded-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>A verificar...</span>
                  </>
                ) : (
                  <>
                    <span>Entrar no Sistema</span>
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
            
            {/* Decoration line */}
            <div className="flex items-center gap-4 mt-12 opacity-40">
              <div className="h-px bg-neutral-600 flex-1" />
              <div className="flex gap-1">
                <div className="w-1 h-1 bg-neutral-500" />
                <div className="w-1 h-1 bg-neutral-500" />
                <div className="w-1 h-1 bg-neutral-500" />
              </div>
              <div className="h-px bg-neutral-600 flex-1" />
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
