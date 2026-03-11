import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Hexagon } from 'lucide-react';

import { LoginSchema, type LoginInput, Papel } from '@clinicaplus/types';
import { authApi } from '../../../api/auth';
import { useAuthStore } from '../../../stores/auth.store';

// P1: Minimalismo Clínico de Luxo
// Usando classes do Tailwind v3 existentes na base de código, mas focando em estética premium
export const LoginPageP1 = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, setValue, setError, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { clinicaSlug: '', email: '', password: '' },
  });

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (response) => {
      setSession(response.accessToken, response.utilizador);
      navigate('/dashboard');
    },
    onError: (error: any) => {
      setValue('password', '');
      setError('root', { message: error.message || 'Falha na ligação.' });
    },
  });

  const onSubmit = (data: LoginInput) => mutation.mutate(data);

  return (
    <div className="min-h-screen flex bg-neutral-900 font-sans selection:bg-emerald-500/30">
      {/* 
        Frontend Design: Asymmetric Layout 70/30 (lg:w-[65%])
        Rich Emerald/Teal tones instead of default blue.
        Soft glassmorphism form floating over the background.
      */}
      <div className="hidden lg:flex w-[65%] relative overflow-hidden items-end p-20">
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-[20s] ease-out hover:scale-105"
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=2000)' }}
        />
        <div className="absolute inset-0 bg-emerald-950/70 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/40 to-transparent" />

        <div className="relative z-10 w-full max-w-2xl text-white animate-in slide-in-from-bottom-8 fade-in duration-1000">
          <div className="flex items-center gap-3 mb-8">
            <Hexagon size={36} className="text-emerald-400 stroke-[1.5]" />
            <span className="text-2xl font-medium tracking-widest uppercase text-emerald-50/80">ClinicaPlus</span>
          </div>

          <h1 className="text-6xl font-light leading-[1.1] mb-8 text-white tracking-tight">
            Gestão <span className="font-semibold text-emerald-300">Inteligente.</span><br/>
            Cuidado Perfeito.
          </h1>
          <p className="text-emerald-100/70 text-xl font-light max-w-lg leading-relaxed">
            Plataforma premium para gestão clínica integrada, desenhada para excelência e precisão em todas as interações.
          </p>
        </div>
      </div>

      <div className="w-full lg:w-[35%] flex flex-col justify-center px-8 sm:px-16 bg-white relative">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-50/50 via-white to-white" />
        
        <div className="w-full max-w-sm mx-auto z-10 animate-in fade-in slide-in-from-right-8 duration-700">
          
          <div className="mb-12">
            <h2 className="text-3xl font-semibold text-neutral-900 tracking-tight mb-2">Acesso Restrito</h2>
            <p className="text-neutral-500 text-sm">Insira os seus dados para entrar no portal clínico.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="group">
              <label className="block text-xs font-semibold tracking-wider text-neutral-500 uppercase mb-2">
                Clínica
              </label>
              <div className="relative">
                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-neutral-400 text-sm font-medium pr-2 transition-colors group-focus-within:text-emerald-600">
                  cp.ao/
                </span>
                <input
                  {...register('clinicaSlug')}
                  className="w-full bg-transparent border-b-2 border-neutral-200 pl-12 py-3 text-neutral-900 placeholder:text-neutral-300 focus:outline-none focus:border-emerald-500 transition-colors"
                  placeholder="sua-clinica"
                />
              </div>
            </div>

            <div className="group">
              <label className="block text-xs font-semibold tracking-wider text-neutral-500 uppercase mb-2">
                Email
              </label>
              <input
                {...register('email')}
                type="email"
                className="w-full bg-transparent border-b-2 border-neutral-200 py-3 text-neutral-900 placeholder:text-neutral-300 focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder="nome@clinica.ao"
              />
            </div>

            <div className="group">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold tracking-wider text-neutral-500 uppercase">
                  Palavra-passe
                </label>
                <button type="button" className="text-xs text-neutral-400 hover:text-emerald-600 transition-colors">
                  Recuperar
                </button>
              </div>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  className="w-full bg-transparent border-b-2 border-neutral-200 py-3 pr-10 text-neutral-900 placeholder:text-neutral-300 focus:outline-none focus:border-emerald-500 transition-colors"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-neutral-300 hover:text-neutral-600 transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {errors.root && (
              <p className="text-sm text-red-500 mt-2">{errors.root.message}</p>
            )}

            <div className="pt-8">
              <button
                type="submit"
                disabled={mutation.isPending}
                className="w-full bg-neutral-900 hover:bg-emerald-600 text-white font-medium py-4 rounded-none transition-all duration-300 disabled:opacity-50"
              >
                {mutation.isPending ? 'A autenticar...' : 'Entrar no Portal'}
              </button>
            </div>
          </form>

        </div>
      </div>
      
      {/* Selector de navegação temporal para testes */}
      <ProposalNav current="p1" />
    </div>
  );
};

export const ProposalNav = ({ current }: { current: string }) => (
  <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-md px-4 py-2 rounded-full border border-neutral-200 shadow-2xl z-50 flex gap-2 text-xs font-medium text-neutral-600">
    <span className="mr-2 text-neutral-400">Propostas:</span>
    <a href="/login" className="hover:text-primary-600">Original</a>
    <a href="/login-p1" className={current === 'p1' ? 'text-primary-600 font-bold' : 'hover:text-primary-600'}>P1 (Aesthetic)</a>
    <a href="/login-p2" className={current === 'p2' ? 'text-primary-600 font-bold' : 'hover:text-primary-600'}>P2 (A11y/UX)</a>
    <a href="/login-p3" className={current === 'p3' ? 'text-primary-600 font-bold' : 'hover:text-primary-600'}>P3 (Systems)</a>
    <a href="/login-p4" className={current === 'p4' ? 'text-primary-600 font-bold' : 'hover:text-primary-600'}>P4 (Art)</a>
    <a href="/login-p5" className={current === 'p5' ? 'text-teal-600 font-bold' : 'hover:text-teal-600'}>P5 (Campeã)</a>
  </div>
);

export default LoginPageP1;
