import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';

import { LoginSchema, type LoginInput } from '@clinicaplus/types';
import { Button } from '@clinicaplus/ui';
import { authApi } from '../../../api/auth';
import { useAuthStore } from '../../../stores/auth.store';
import { ProposalNav } from './LoginPageP1'; // Reutilizando a navegação

// P2: Web Design Guidelines (UX & Acessibilidade)
// Foco em WCAG AAA, focus rings claros, keyboard navigation, sem ambiguidades
export const LoginPageP2 = () => {
  const navigate = useNavigate();
  useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, setValue, setError, formState: { errors, isSubmitting } } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { clinicaSlug: '', email: '', password: '' },
    mode: 'onTouched',
  });

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (response) => {
      setSession(response.accessToken, response.utilizador);
      navigate('/dashboard');
    },
    onError: (error: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      setValue('password', '');
      setError('root', { message: error.message || 'Ocorreu um erro no servidor. Tente novamente.' });
    },
  });

  const onSubmit = (data: LoginInput) => mutation.mutate(data);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <div className="bg-primary-700 p-3 rounded-xl shadow-sm text-white flex items-center gap-2">
            <CheckCircle2 size={28} />
            <span className="text-2xl font-bold tracking-tight">ClinicaPlus</span>
          </div>
        </div>
        <h1 className="text-center text-3xl font-bold tracking-tight text-slate-900 mb-2">
          Acesso Seguro
        </h1>
        <p className="text-center text-sm text-slate-600 mb-8 max-w-sm mx-auto">
          Insira as credenciais da sua instituição de saúde para continuar.
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-200">
          
          {errors.root && (
            <div 
              className="mb-6 p-4 rounded-md bg-red-50 border border-red-200 flex items-start gap-3"
              role="alert" 
              aria-live="assertive"
            >
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-sm font-medium text-red-800">
                {errors.root.message}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
            <div>
              <label 
                htmlFor="clinicaSlug" 
                className="block text-sm font-semibold text-slate-900 mb-1"
              >
                Identificador da Clínica
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-slate-500 sm:text-sm">clinicaplus.ao/</span>
                </div>
                <input
                  id="clinicaSlug"
                  type="text"
                  autoComplete="organization"
                  className={`block w-full pl-[110px] sm:text-sm rounded-md py-2.5 outline-none transition-shadow
                    ${errors.clinicaSlug 
                      ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-2 focus:ring-red-500 focus:border-red-500' 
                      : 'border-slate-300 focus:ring-2 focus:ring-primary-600 focus:border-primary-600 border'
                    }`}
                  placeholder="nome-da-clinica"
                  aria-invalid={errors.clinicaSlug ? "true" : "false"}
                  aria-describedby={errors.clinicaSlug ? "clinicaSlug-error" : "clinicaSlug-hint"}
                  {...register('clinicaSlug')}
                />
              </div>
              {errors.clinicaSlug ? (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1" id="clinicaSlug-error" role="alert">
                  <AlertCircle size={14} /> {errors.clinicaSlug.message}
                </p>
              ) : (
                <p className="mt-2 text-xs text-slate-500" id="clinicaSlug-hint">
                  Apenas letras minúsculas e hífen. Ex: c-medica.
                </p>
              )}
            </div>

            <div>
              <label 
                htmlFor="email" 
                className="block text-sm font-semibold text-slate-900 mb-1"
              >
                Endereço de E-mail
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className={`block w-full px-3 sm:text-sm rounded-md py-2.5 outline-none transition-shadow border
                    ${errors.email 
                      ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-2 focus:ring-red-500 focus:border-red-500' 
                      : 'border-slate-300 focus:ring-2 focus:ring-primary-600 focus:border-primary-600'
                    }`}
                  placeholder="o-seu-email@clinica.ao"
                  aria-invalid={errors.email ? "true" : "false"}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1" id="email-error" role="alert">
                  <AlertCircle size={14} /> {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label 
                  htmlFor="password" 
                  className="block text-sm font-semibold text-slate-900"
                >
                  Palavra-passe
                </label>
                <div className="text-sm">
                  <a href="/auth/recuperar" className="font-semibold text-primary-600 hover:text-primary-500 focus:outline-none focus:underline rounded-sm">
                    Esqueceu-se da senha?
                  </a>
                </div>
              </div>
              <div className="mt-1 relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={`block w-full px-3 pr-10 sm:text-sm rounded-md py-2.5 outline-none transition-shadow border
                    ${errors.password 
                      ? 'border-red-300 text-red-900 focus:ring-2 focus:ring-red-500 focus:border-red-500' 
                      : 'border-slate-300 focus:ring-2 focus:ring-primary-600 focus:border-primary-600'
                    }`}
                  aria-invalid={errors.password ? "true" : "false"}
                  aria-describedby={errors.password ? "password-error" : undefined}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none focus:text-primary-600 rounded-md"
                  aria-label={showPassword ? "Ocultar palavra-passe" : "Mostrar palavra-passe"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1" id="password-error" role="alert">
                  <AlertCircle size={14} /> {errors.password.message}
                </p>
              )}
            </div>

            <div>
              <Button
                type="submit"
                fullWidth
                size="lg"
                loading={mutation.isPending || isSubmitting}
                className="py-6 text-base focus:ring-2 focus:ring-offset-2 focus:ring-primary-600"
                aria-disabled={mutation.isPending || isSubmitting}
              >
                Autenticar
              </Button>
            </div>
          </form>
        </div>
      </div>
      <ProposalNav current="p2" />
    </div>
  );
};

export default LoginPageP2;
