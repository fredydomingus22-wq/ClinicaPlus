import React from 'react';
import { useForm, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Building2, User } from 'lucide-react';
import { ClinicaCreateSchema, ClinicaCreateInput } from '@clinicaplus/types';
import { useProvisionClinica } from '../../../hooks/useSuperAdmin';
import { Button, Input, Select } from '@clinicaplus/ui';

interface ProvisionTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProvisionTenantModal({ isOpen, onClose }: ProvisionTenantModalProps) {
  const { mutate: provision, isPending } = useProvisionClinica();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<ClinicaCreateInput>({
    resolver: zodResolver(ClinicaCreateSchema) as Resolver<ClinicaCreateInput>,
    defaultValues: {
      plano: 'BASICO',
    },
  });

  const onSubmit = (data: ClinicaCreateInput) => {
    provision(data, {
      onSuccess: () => {
        reset();
        onClose();
      },
    });
  };

  // Auto-generate slug from name if empty
  const clinicName = watch('nome');
  React.useEffect(() => {
    if (clinicName && !watch('slug')) {
      const generatedSlug = clinicName
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setValue('slug', generatedSlug);
    }
  }, [clinicName, setValue, watch]);

  if (!isOpen) return null;

  const planOptions = [
    { value: 'BASICO', label: 'Básico (50.000 Kz/mês)' },
    { value: 'PRO', label: 'Pro (150.000 Kz/mês)' },
    { value: 'ENTERPRISE', label: 'Enterprise (450.000 Kz/mês)' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-sa-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-sa-surface border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-display font-medium text-white">Provisionar Nova Clínica</h3>
            <p className="text-sm text-sa-text-muted">Registe uma nova clínica e o seu primeiro administrador.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-sa-text-muted"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form id="provision-form" onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <div className="space-y-4">
              <h4 className="font-mono text-[10px] uppercase tracking-widest text-sa-primary/70 flex items-center gap-2">
                <Building2 className="w-3 h-3" /> INFORMAÇÃO DA CLÍNICA
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nome da Clínica"
                  placeholder="ex. Clínica Central de Luanda"
                  className="bg-sa-background/50 border-white/5 focus:border-sa-primary/50"
                  error={errors.nome?.message}
                  {...register('nome')}
                />

                <Input
                  label="Slug (URL)"
                  placeholder="ex. clinica-central"
                  className="bg-sa-background/50 border-white/5 focus:border-sa-primary/50 font-mono text-sm"
                  error={errors.slug?.message}
                  {...register('slug')}
                />

                <Input
                  label="Email Público"
                  type="email"
                  placeholder="contacto@clinica.ao"
                  className="bg-sa-background/50 border-white/5 focus:border-sa-primary/50"
                  error={errors.email?.message}
                  {...register('email')}
                />

                <Select
                  label="Plano de Subscrição"
                  options={planOptions}
                  className="bg-sa-background/50"
                  error={errors.plano?.message}
                  {...register('plano')}
                />
              </div>
            </div>

            <div className="h-px bg-white/5" />

            <div className="space-y-4">
              <h4 className="font-mono text-[10px] uppercase tracking-widest text-sa-primary/70 flex items-center gap-2">
                <User className="w-3 h-3" /> CONFIGURAÇÃO DO ADMINISTRADOR
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="lg:col-span-2">
                  <Input
                    label="Nome Completo"
                    placeholder="ex. Dr. Manuel Afonso"
                    className="bg-sa-background/50 border-white/5 focus:border-sa-primary/50"
                    error={errors.adminNome?.message}
                    {...register('adminNome')}
                  />
                </div>

                <Input
                  label="Email do Admin (Login)"
                  type="email"
                  placeholder="admin@clinica.ao"
                  className="bg-sa-background/50 border-white/5 focus:border-sa-primary/50"
                  error={errors.adminEmail?.message}
                  {...register('adminEmail')}
                />

                <Input
                  label="Palavra-passe Inicial"
                  type="password"
                  placeholder="••••••••"
                  className="bg-sa-background/50 border-white/5 focus:border-sa-primary/50"
                  error={errors.adminPassword?.message}
                  {...register('adminPassword')}
                />
              </div>
            </div>

          </form>
        </div>

        <div className="p-6 border-t border-white/5 bg-white/5 flex justify-end gap-3">
          <Button 
            variant="ghost" 
            onClick={onClose}
            type="button"
            className="text-white hover:bg-white/5"
          >
            CANCEL
          </Button>
          <Button 
            form="provision-form"
            type="submit"
            disabled={isPending}
            className="bg-sa-primary text-sa-background font-bold px-8 shadow-[0_0_20px_rgba(var(--sa-primary),0.3)]"
          >
            {isPending ? 'PROVISIONING...' : 'CONFIRM & PROVISION'}
          </Button>
        </div>
      </div>
    </div>
  );
}
