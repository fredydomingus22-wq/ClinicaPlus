import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Hexagon, Lock, KeyRound, Eye, EyeOff, CheckCircle2, ArrowLeft } from 'lucide-react';
import { z } from 'zod';

import { authApi } from '../../api/auth';
import type { ResetPasswordInput } from '@clinicaplus/types';

const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string()
    .min(8, 'A palavra-passe deve ter pelo menos 8 caracteres')
    .max(100)
    .regex(/[A-Z]/, 'Deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'Deve conter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'Deve conter pelo menos um número'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'As palavras-passe não coincidem',
  path: ['confirmPassword'],
});

type ResetPasswordForm = z.infer<typeof ResetPasswordSchema>;

export const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [showPassword, setShowPassword] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ResetPasswordForm>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: { 
      token: token || '',
      newPassword: '',
      confirmPassword: ''
    },
  });

  const mutation = useMutation({
    mutationFn: (data: ResetPasswordInput) => authApi.resetPassword(data),
    onSuccess: () => {
      setIsSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    },
  });

  if (!token) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 p-6">
        <div className="bg-white p-8 shadow-xl border border-slate-100 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-6">
             <Hexagon size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Token Inválido</h2>
          <p className="text-slate-500 mb-8">O link de recuperação está incompleto ou expirou. Por favor, solicite um novo link.</p>
          <Link 
            to="/auth/forgot-password" 
            className="inline-flex items-center justify-center w-full h-12 bg-slate-900 text-white font-bold hover:bg-teal-700 transition-colors"
          >
            Solicitar novo link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex bg-slate-50 font-sans selection:bg-emerald-500/30 overflow-hidden">
      
      {/* Lado Esquerdo: A Estética */}
      <div className="hidden lg:flex flex-col justify-center w-[50%] xl:w-[55%] h-full relative overflow-hidden p-12 lg:p-20">
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-[20s] ease-out hover:scale-105"
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=2000)' }}
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
            Segurança em <br/> <span className="text-teal-400 font-light italic">Primeiro Lugar.</span>
          </h1>
          <p className="text-teal-100/80 text-lg font-light max-w-lg leading-relaxed text-balance">
            O seu acesso é protegido com encriptação de nível bancário. Defina uma palavra-passe forte para garantir a privacidade dos seus dados.
          </p>
        </div>
      </div>

      {/* Lado Direito: A Engenharia */}
      <div className="w-full lg:w-[50%] xl:w-[45%] h-full bg-white border-l border-slate-100 relative shadow-2xl overflow-y-auto px-6 sm:px-12 xl:px-16">
        <div className="w-full max-w-md mx-auto py-12 lg:py-28 z-10 animate-in fade-in slide-in-from-right-8 duration-700">
          
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Definir Nova Senha</h2>
            <p className="text-slate-600 text-sm font-medium">Escolha uma nova palavra-passe segura para a sua conta.</p>
          </div>

          {isSuccess ? (
            <div className="p-8 bg-emerald-50 text-emerald-800 border border-emerald-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-500">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 flex items-center justify-center mb-6">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-xl mb-3">Sucesso!</h3>
              <p className="text-emerald-700/80 text-sm leading-relaxed mb-6">
                A sua palavra-passe foi alterada com sucesso. Será redirecionado para o login em instantes...
              </p>
              <Link to="/login" className="text-emerald-600 font-bold hover:underline flex items-center gap-2">
                Ir para o login agora <ArrowLeft className="w-4 h-4 rotate-180" />
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6" noValidate>
              
              <input type="hidden" {...register('token')} />

              {/* Input Nova Senha */}
              <div className="space-y-1.5 group">
                <label className="text-sm font-semibold text-slate-700 group-focus-within:text-teal-700 transition-colors">
                  Nova Palavra-passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-5 w-5 text-slate-500 group-focus-within:text-teal-500 transition-colors" />
                  <input
                    className={`flex h-11 w-full border bg-white px-3 py-2 pl-11 pr-11 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all ${errors.newPassword ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200'}`}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...register('newPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 h-5 w-5 text-slate-400 hover:text-slate-600 focus:outline-none focus:text-teal-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.newPassword && <p className="text-[13px] text-red-500 font-medium">{errors.newPassword.message}</p>}
              </div>

              {/* Input Confirmar Senha */}
              <div className="space-y-1.5 group">
                <label className="text-sm font-semibold text-slate-700 group-focus-within:text-teal-700 transition-colors">
                  Confirmar Palavra-passe
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-3 h-5 w-5 text-slate-500 group-focus-within:text-teal-500 transition-colors" />
                  <input
                    className={`flex h-11 w-full border bg-white px-3 py-2 pl-11 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all ${errors.confirmPassword ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200'}`}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...register('confirmPassword')}
                  />
                </div>
                {errors.confirmPassword && <p className="text-[13px] text-red-500 font-medium">{errors.confirmPassword.message}</p>}
              </div>

              {mutation.isError && (
                <div className="p-4 bg-red-50 text-red-700 text-sm font-medium border border-red-100">
                  Ocorreu um erro ao redefinir a palavra-passe. O link pode ser inválido ou já ter sido utilizado.
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="w-full h-12 bg-slate-900 hover:bg-teal-700 text-white font-bold text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none shadow-md shadow-slate-900/10"
                >
                  {mutation.isPending ? 'A processar...' : 'Confirmar Nova Senha'}
                </button>
              </div>
            </form>
          )}

          <p className="text-center text-xs text-slate-500 mt-10 font-medium">
            &copy; {new Date().getFullYear()} ClinicaPlus. Segurança Garantida.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
