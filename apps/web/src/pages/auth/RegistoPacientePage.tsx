import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Building2, User, KeyRound, Phone, Calendar, Users, Hexagon } from 'lucide-react';
import { z } from 'zod';

import { authApi } from '../../api/auth';
import { useAuthStore } from '../../stores/auth.store';

const RegisterSchema = z.object({
  clinicaSlug: z.string().min(1, 'Identificador da clínica é obrigatório').trim().toLowerCase(),
  nome: z.string().min(3, 'Nome completo é obrigatório'),
  email: z.string().email('E-mail inválido').trim().toLowerCase(),
  telefone: z.string().min(9, 'Telefone inválido').trim(),
  dataNascimento: z.string().min(1, 'Data de nascimento é obrigatória'),
  genero: z.enum(['M', 'F', 'OUTRO'], { required_error: 'Gênero é obrigatório' }),
  password: z.string().min(8, 'A palavra-passe deve ter pelo menos 8 caracteres'),
});

type RegisterInput = z.infer<typeof RegisterSchema>;

export const RegistoPacientePage = () => {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: { 
      clinicaSlug: '', 
      nome: '', 
      email: '', 
      telefone: '', 
      dataNascimento: '',
      genero: 'M',
      password: '' 
    },
  });

  const mutation = useMutation({
    mutationFn: (data: RegisterInput) => authApi.registerPaciente(data),
    onSuccess: (response) => {
      setSession(response.accessToken, response.utilizador);
      navigate('/paciente/agendamentos');
    },
    onError: (error: unknown) => {
      const apiError = error as { response?: { status?: number }; message?: string };
      const status = apiError.response?.status;
      if (status === 409) {
        setError('email', { message: 'Este e-mail já está registado.' });
      } else if (status === 404) {
        setError('clinicaSlug', { message: 'Clínica não encontrada ou inativa.' });
      } else {
        setError('root', { message: apiError.message || 'Falha ao criar conta.' });
      }
    },
  });

  const onSubmit = (data: RegisterInput) => {
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
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=2000)' }}
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
            O Seu Portal de <br/> <span className="text-teal-400 font-light italic">Saúde Pessoal.</span>
          </h1>
          <p className="text-teal-100/80 text-lg font-light max-w-lg leading-relaxed text-balance">
            Agende consultas, consulte o seu histórico e comunique com o seu médico de forma simples e digital.
          </p>
        </div>
      </div>

      {/* Lado Direito: A Engenharia (P5 Design System) */}
      <div className="w-full lg:w-[50%] xl:w-[45%] h-full bg-white border-l border-slate-100 relative shadow-2xl overflow-y-auto px-6 sm:px-12 xl:px-16">
        <div className="w-full max-w-md mx-auto py-12 lg:py-20 z-10 animate-in fade-in slide-in-from-right-8 duration-700">
          
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Criar Conta</h2>
            <p className="text-slate-500 text-sm font-medium">Preencha os seus dados para aceder ao portal do paciente.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            
            {/* Input Workspace */}
            <div className="space-y-1.5 group">
              <label className="text-sm font-semibold text-slate-700 group-focus-within:text-teal-700 transition-colors">
                Identificador da Clínica
              </label>
              <div className="relative">
                <Building2 className="absolute left-3.5 top-3 h-5 w-5 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
                <input
                  className={`flex h-11 w-full rounded-xl border bg-white px-3 py-2 pl-11 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all ${errors.clinicaSlug ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200'}`}
                  placeholder="slug-da-clinica"
                  {...register('clinicaSlug')}
                  onChange={handleSlugChange}
                />
              </div>
              {errors.clinicaSlug && <p className="text-[13px] text-red-500 font-medium">{errors.clinicaSlug.message}</p>}
            </div>

            {/* Input Nome */}
            <div className="space-y-1.5 group">
              <label className="text-sm font-semibold text-slate-700 group-focus-within:text-teal-700 transition-colors">
                Nome Completo
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 h-5 w-5 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
                <input
                  className={`flex h-11 w-full rounded-xl border bg-white px-3 py-2 pl-11 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all ${errors.nome ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200'}`}
                  placeholder="Ex: João da Silva"
                  {...register('nome')}
                />
              </div>
              {errors.nome && <p className="text-[13px] text-red-500 font-medium">{errors.nome.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Input Data Nascimento */}
              <div className="space-y-1.5 group">
                <label className="text-sm font-semibold text-slate-700 group-focus-within:text-teal-700 transition-colors">
                  Nascimento
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-3 h-5 w-5 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
                  <input
                    type="date"
                    className={`flex h-11 w-full rounded-xl border bg-white px-3 py-2 pl-11 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all ${errors.dataNascimento ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200'}`}
                    {...register('dataNascimento')}
                  />
                </div>
                {errors.dataNascimento && <p className="text-[13px] text-red-500 font-medium">{errors.dataNascimento.message}</p>}
              </div>

              {/* Input Género */}
              <div className="space-y-1.5 group">
                <label className="text-sm font-semibold text-slate-700 group-focus-within:text-teal-700 transition-colors">
                  Género
                </label>
                <div className="relative">
                  <Users className="absolute left-3.5 top-3 h-5 w-5 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
                  <select
                    className={`flex h-11 w-full rounded-xl border bg-white px-3 py-2 pl-11 pr-8 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all appearance-none ${errors.genero ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200'}`}
                    {...register('genero')}
                  >
                    <option value="M">Masculino</option>
                    <option value="F">Feminino</option>
                    <option value="OUTRO">Outro</option>
                  </select>
                </div>
                {errors.genero && <p className="text-[13px] text-red-500 font-medium">{errors.genero.message}</p>}
              </div>
            </div>

            {/* Input Telefone */}
            <div className="space-y-1.5 group">
              <label className="text-sm font-semibold text-slate-700 group-focus-within:text-teal-700 transition-colors">
                Telefone
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-3 h-5 w-5 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
                <input
                  type="tel"
                  className={`flex h-11 w-full rounded-xl border bg-white px-3 py-2 pl-11 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all ${errors.telefone ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200'}`}
                  placeholder="9xx xxx xxx"
                  {...register('telefone')}
                />
              </div>
              {errors.telefone && <p className="text-[13px] text-red-500 font-medium">{errors.telefone.message}</p>}
            </div>

            {/* Input Email */}
            <div className="space-y-1.5 group">
              <label className="text-sm font-semibold text-slate-700 group-focus-within:text-teal-700 transition-colors">
                E-mail
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 h-5 w-5 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
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
              </div>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-3 h-5 w-5 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
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
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                {mutation.isPending ? 'A registar...' : 'Criar Conta Gratuita'}
              </button>
            </div>
            
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-3 justify-center items-center">
            <p className="text-center text-sm text-slate-500">
              Já possui uma conta?{' '}
              <Link 
                to="/login" 
                className="font-semibold text-teal-600 hover:text-teal-700 hover:underline transition-colors focus:outline-none"
              >
                Faça login aqui
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

export default RegistoPacientePage;
