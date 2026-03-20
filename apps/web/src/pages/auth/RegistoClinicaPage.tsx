import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, User, KeyRound, Eye, EyeOff, Hexagon, ArrowRight, ShieldCheck } from 'lucide-react';
import { z } from 'zod';

import { authApi } from '../../api/auth';

const RegisterClinicaSchema = z.object({
  clinicaNome: z.string().min(3, 'Nome da clínica é obrigatório'),
  clinicaSlug: z.string().min(3, 'Slug da clínica é obrigatório').regex(/^[a-z0-9-]+$/, 'Apenas letras e hífens permitidos'),
  adminNome: z.string().min(3, 'Nome completo do administrador é obrigatório'),
  email: z.string().email('E-mail inválido').trim().toLowerCase(),
  password: z.string().min(8, 'A palavra-passe deve ter pelo menos 8 caracteres'),
});

type RegisterClinicaInput = z.infer<typeof RegisterClinicaSchema>;

export const RegistoClinicaPage = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<RegisterClinicaInput>({
    resolver: zodResolver(RegisterClinicaSchema),
    defaultValues: { clinicaNome: '', clinicaSlug: '', adminNome: '', email: '', password: '' },
  });

  const mutation = useMutation({
    mutationFn: (data: RegisterClinicaInput) => authApi.registerClinica(data),
    onSuccess: () => {
      // In a real app we'd redirect to a success page or login. Let's just go to login for now.
      navigate('/login?registado=success');
    },
  });

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

          <h1 className="text-5xl lg:text-5xl font-semibold leading-[1.1] mb-6 text-white tracking-tight text-balance">
            Expanda os Horizontes da sua <br/> <span className="text-teal-400 font-light italic">Clínica Médica.</span>
          </h1>
          <p className="text-teal-100/80 text-lg font-light max-w-lg leading-relaxed text-balance mb-8">
            Adira à plataforma inteligente de Agendamentos Clínicos e simplifique as marcações, triagens e receituários da sua clínica.
          </p>

          <div className="flex items-center gap-6 text-sm text-teal-200/60 font-medium">
            <div className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-teal-400"/> Sistema Seguro</div>
            <div className="flex items-center gap-2"><ArrowRight className="w-5 h-5 text-teal-400"/> Registo Rápido</div>
          </div>
        </div>
      </div>

      {/* Lado Direito: A Engenharia (P5 Design System) */}
      <div className="w-full lg:w-[50%] xl:w-[45%] h-full bg-white border-l border-slate-100 relative shadow-2xl overflow-y-auto px-6 sm:px-12 xl:px-16">
        <div className="w-full max-w-md mx-auto py-12 lg:py-20 z-10 animate-in fade-in slide-in-from-right-8 duration-700">
          
          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Registar Clínica</h2>
            <p className="text-slate-500 text-sm font-medium">Configure o seu espaço em 2 minutos.</p>
          </div>

          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4" noValidate>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Input Nome Clínica */}
              <div className="space-y-1.5 group">
                <label className="text-sm font-semibold text-slate-700 group-focus-within:text-teal-700 transition-colors">
                  Nome da Clínica
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-3 h-5 w-5 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
                  <input
                    className={`flex h-11 w-full border bg-white px-3 py-2 pl-11 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all ${errors.clinicaNome ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200'}`}
                    placeholder="Ex: Sagrada Esperança"
                    {...register('clinicaNome')}
                  />
                </div>
                {errors.clinicaNome && <p className="text-[13px] text-red-500 font-medium">{errors.clinicaNome.message}</p>}
              </div>

              {/* Input Workspace Slug */}
              <div className="space-y-1.5 group">
                <label className="text-sm font-semibold text-slate-700 group-focus-within:text-teal-700 transition-colors">
                  Identificador
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-slate-400 group-focus-within:text-teal-500 font-medium text-sm">@</span>
                  <input
                    className={`flex h-11 w-full border bg-white px-3 py-2 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all ${errors.clinicaSlug ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200'}`}
                    placeholder="sagrada-esperanca"
                    {...register('clinicaSlug')}
                    onChange={handleSlugChange}
                  />
                </div>
                {errors.clinicaSlug && <p className="text-[13px] text-red-500 font-medium">{errors.clinicaSlug.message}</p>}
              </div>
            </div>

            <div className="relative py-4 flex items-center">
              <div className="flex-grow border-t border-slate-100"></div>
              <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-semibold uppercase tracking-wider">Dados do Administrador</span>
              <div className="flex-grow border-t border-slate-100"></div>
            </div>

            {/* Input Nome Admin */}
            <div className="space-y-1.5 group">
              <label className="text-sm font-semibold text-slate-700 group-focus-within:text-teal-700 transition-colors">
                Nome do Administrador
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 h-5 w-5 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
                <input
                  className={`flex h-11 w-full border bg-white px-3 py-2 pl-11 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all ${errors.adminNome ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200'}`}
                  placeholder="Ex: Ana Silva"
                  {...register('adminNome')}
                />
              </div>
              {errors.adminNome && <p className="text-[13px] text-red-500 font-medium">{errors.adminNome.message}</p>}
            </div>

            {/* Input Email */}
            <div className="space-y-1.5 group">
              <label className="text-sm font-semibold text-slate-700 group-focus-within:text-teal-700 transition-colors">
                E-mail Institucional
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 h-5 w-5 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
                <input
                  className={`flex h-11 w-full border bg-white px-3 py-2 pl-11 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all ${errors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200'}`}
                  placeholder="admin@clinica.ao"
                  type="email"
                  {...register('email')}
                />
              </div>
              {errors.email && <p className="text-[13px] text-red-500 font-medium">{errors.email.message}</p>}
            </div>

            {/* Input Password */}
            <div className="space-y-1.5 group">
              <label className="text-sm font-semibold text-slate-700 group-focus-within:text-teal-700 transition-colors">
                Palavra-passe
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-3 h-5 w-5 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
                <input
                  className={`flex h-11 w-full border bg-white px-3 py-2 pl-11 pr-11 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all ${errors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200'}`}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 h-5 w-5 text-slate-400 hover:text-slate-600 focus:outline-none focus:text-teal-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-[13px] text-red-500 font-medium">{errors.password.message}</p>}
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={mutation.isPending}
                className="w-full h-12 bg-slate-900 hover:bg-teal-700 text-white font-semibold text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none shadow-md shadow-slate-900/10"
              >
                {mutation.isPending ? 'A registar clínica...' : 'Avançar e Registar Clínica'}
              </button>
            </div>
            
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-3 justify-center items-center">
            <p className="text-center text-sm text-slate-500">
              A sua clínica já está registada?{' '}
              <Link 
                to="/login" 
                className="font-semibold text-teal-600 hover:text-teal-700 hover:underline transition-colors focus:outline-none"
              >
                Faça login
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

export default RegistoClinicaPage;
