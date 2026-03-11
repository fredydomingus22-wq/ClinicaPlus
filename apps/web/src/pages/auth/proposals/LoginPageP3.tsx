import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Building2, User, KeyRound } from 'lucide-react';

import { LoginSchema, type LoginInput } from '@clinicaplus/types';
import { authApi } from '../../../api/auth';
import { useAuthStore } from '../../../stores/auth.store';
import { ProposalNav } from './LoginPageP1';

// P3: Tailwind Design System
// Foco em UI centralizada modular (simulação local de componentes UI system)
// Utiliza borders firmes, backgrounds flat, focus-visible preciso.
export const LoginPageP3 = () => {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
  });

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (res) => {
      setSession(res.accessToken, res.utilizador);
      navigate('/dashboard');
    },
  });

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-[900px] bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row border border-slate-200">
        
        {/* Lado Direito (Branding / Sistema) */}
        <div className="w-full md:w-1/2 bg-slate-900 p-8 md:p-12 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500 rounded-full blur-[100px] opacity-20 -mr-10 -mt-10" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500 rounded-full blur-[100px] opacity-20 -ml-10 -mb-10" />
          
          <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-2">ClinicaPlus UI</h2>
            <p className="text-slate-400 font-medium tracking-wide text-sm">DESIGN SYSTEM v4 COMPLIANT</p>
          </div>
          
          <div className="relative z-10 mt-12 md:mt-0">
            <h1 className="text-4xl font-semibold leading-tight mb-4">
              Escalável.<br/>Consistente.<br/>Sólido.
            </h1>
            <p className="text-slate-300">
              A base tecnológica construída com componentes CVA para interfaces modulares e adaptativas de saúde.
            </p>
          </div>
        </div>

        {/* Lado Esquerdo (Auth via Tokens) */}
        <div className="w-full md:w-1/2 p-8 md:p-12 bg-white">
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-slate-900">Iniciar Sessão</h3>
            <p className="text-slate-500 text-sm mt-1">Utilize a sua conta do sistema da clínica.</p>
          </div>

          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-700">
                Workspace (Clínica)
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 pl-9 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                  placeholder="slug-da-clinica"
                  {...register('clinicaSlug')}
                />
              </div>
              {errors.clinicaSlug && <p className="text-[13px] text-red-500 font-medium">{errors.clinicaSlug.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-700">
                Email
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 pl-9 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                  placeholder="utilizador@clinica.ao"
                  type="email"
                  {...register('email')}
                />
              </div>
              {errors.email && <p className="text-[13px] text-red-500 font-medium">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-700">
                  Password
                </label>
                <a href="#" className="text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors">
                  Esqueceu a senha?
                </a>
              </div>
              <div className="relative">
                <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 pl-9 pr-9 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-[13px] text-red-500 font-medium">{errors.password.message}</p>}
            </div>

            {errors.root && (
              <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm font-medium border border-red-100">
                {errors.root.message}
              </div>
            )}

            <button
              type="submit"
              disabled={mutation.isPending}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-slate-900 text-slate-50 hover:bg-slate-900/90 h-10 px-4 py-2 w-full mt-4"
            >
              {mutation.isPending ? 'Validando...' : 'Iniciar Sessão'}
            </button>
          </form>
        </div>

      </div>
      <ProposalNav current="p3" />
    </div>
  );
};

export default LoginPageP3;
