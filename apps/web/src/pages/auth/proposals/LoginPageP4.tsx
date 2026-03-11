import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

import { LoginSchema, type LoginInput } from '@clinicaplus/types';
import { authApi } from '../../../api/auth';
import { useAuthStore } from '../../../stores/auth.store';
import { ProposalNav } from './LoginPageP1';

// P4: Canvas Design (Clinical Serenity)
// Foco em arte abstrata geométrica, espaçamento drástico humano, tipografia mínima e clínica.
export const LoginPageP4 = () => {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);

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
    <div className="min-h-screen bg-[#FDFDFD] flex items-center justify-center p-4 selection:bg-neutral-200">
      
      {/* 
        Arte Visual de Fundo: Geometric Silence
        Linhas, proporções douradas clássicas, brutalismo hiper-limpo.
      */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-30">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E5E5E5" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          <circle cx="85%" cy="30%" r="400" fill="none" stroke="#D4D4D4" strokeWidth="1" />
          <circle cx="85%" cy="30%" r="200" fill="none" stroke="#E5E5E5" strokeWidth="1" />
          <circle cx="85%" cy="30%" r="600" fill="none" stroke="#F5F5F5" strokeWidth="1" />
          <line x1="10%" y1="0" x2="10%" y2="100%" stroke="#E5E5E5" strokeWidth="1" />
        </svg>
      </div>

      <div className="relative z-10 w-full max-w-5xl flex gap-12 items-end pb-32">
        
        {/* Lado Esquerdo - Branding Titular Absoluto */}
        <div className="flex-1 pb-10">
          <h1 className="text-[6rem] leading-[0.9] font-light text-[#1A1A1A] tracking-tighter mb-4">
            CLÍNI<br/>CA<span className="font-serif italic text-neutral-400">PLUS</span>
          </h1>
          <p className="text-xs uppercase tracking-[0.3em] font-semibold text-[#808080]">
            SISTEMA INTEGRADO V.4.0 <span className="mx-2">|</span> ACESSO RESTRITO
          </p>
        </div>

        {/* Lado Direito - Formulário Clínico e Minimalista */}
        <div className="w-[400px]">
          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-10 border-l border-[#E5E5E5] pl-10 pr-4 py-4">
            
            <div className="relative">
              <label className="absolute -top-6 left-0 text-[10px] uppercase tracking-widest text-[#808080] font-medium">
                01. Identificador
              </label>
              <input
                {...register('clinicaSlug')}
                className="w-full bg-transparent border-b border-[#CCCCCC] pb-2 text-2xl font-light text-[#1A1A1A] placeholder:text-[#CCCCCC] focus:outline-none focus:border-[#1A1A1A] transition-colors"
                placeholder="slug"
              />
            </div>

            <div className="relative">
              <label className="absolute -top-6 left-0 text-[10px] uppercase tracking-widest text-[#808080] font-medium">
                02. Correspondência
              </label>
              <input
                {...register('email')}
                type="email"
                className="w-full bg-transparent border-b border-[#CCCCCC] pb-2 text-2xl font-light text-[#1A1A1A] placeholder:text-[#CCCCCC] focus:outline-none focus:border-[#1A1A1A] transition-colors"
                placeholder="e-mail"
              />
            </div>

            <div className="relative">
              <label className="absolute -top-6 left-0 text-[10px] uppercase tracking-widest text-[#808080] font-medium">
                03. Chave
              </label>
              <input
                {...register('password')}
                type="password"
                className="w-full bg-transparent border-b border-[#CCCCCC] pb-2 text-2xl font-light text-[#1A1A1A] placeholder:text-[#CCCCCC] focus:outline-none focus:border-[#1A1A1A] transition-colors"
                placeholder="••••••"
              />
            </div>

            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full group flex justify-between items-center text-sm font-medium uppercase tracking-widest text-[#1A1A1A] hover:text-[#808080] transition-colors border-b border-transparent hover:border-[#808080] pb-2"
            >
              <span>{mutation.isPending ? 'Verificando...' : 'Autenticar'}</span>
              <ArrowRight size={16} className="transform group-hover:translate-x-2 transition-transform" />
            </button>
            
            {(errors.root || Object.keys(errors).length > 0) && (
              <p className="text-[11px] text-[#A62B2B] uppercase tracking-wider font-semibold">
                Anomalia detetada. Verifique os limites inseridos.
              </p>
            )}
            
          </form>
        </div>

      </div>
      
      {/* Decorative details corners */}
      <div className="fixed top-8 left-8 text-[10px] text-neutral-400 font-mono">CP / 2026</div>
      <div className="fixed bottom-8 right-8 text-[10px] text-neutral-400 font-mono">SYS.VER.4</div>

      <ProposalNav current="p4" />
    </div>
  );
};

export default LoginPageP4;
