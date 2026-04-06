import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CriarExameSchema, CriarExameDto } from '@clinicaplus/types';
import { useTiposExameClinica, useCriarExame } from '../../hooks/useTratamentos';
import { Button, Select, Textarea, ErrorMessage, Spinner } from '@clinicaplus/ui';

interface CriarExameFormProps {
  pacienteId: string;
  medicoId: string;
  agendamentoId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const CriarExameForm: React.FC<CriarExameFormProps> = ({
  pacienteId,
  medicoId,
  agendamentoId,
  onSuccess,
  onCancel,
}) => {
  const { data: tiposExame, isLoading: loadingTipos } = useTiposExameClinica();
  const { mutate: criarExame, isPending } = useCriarExame();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CriarExameDto>({
    resolver: zodResolver(CriarExameSchema),
    defaultValues: {
      pacienteId,
      medicoId,
      agendamentoId,
    },
  });

  const onSubmit = (data: CriarExameDto) => {
    criarExame(data, {
      onSuccess: () => {
        onSuccess?.();
      },
    });
  };

  if (loadingTipos) {
    return (
      <div className="flex justify-center p-8">
        <Spinner className="w-8 h-8 text-primary-600" />
      </div>
    );
  }

  // Regra UI Limitativa: Se não houver tipos no catálogo
  if (!tiposExame || tiposExame.length < 1) {
    return (
      <div className="p-6 rounded-lg border border-amber-200 bg-amber-50 text-center">
        <div className="text-amber-700 font-medium mb-2">
          Não tem exames no Catálogo.
        </div>
        <p className="text-amber-600 text-sm mb-4">
          É necessário configurar os tipos de exames aceitos pela clínica antes de realizar pedidos.
        </p>
        <Button 
          variant="outline" 
          onClick={() => window.location.href = '/configuracoes/tratamentos'}
          className="text-amber-700 border-amber-300 hover:bg-amber-100"
        >
          Clique aqui para configurar primeiro
        </Button>
      </div>
    );
  }

  const options = (tiposExame as Array<{ id: string; nome: string }>).map((t) => ({
    value: t.id,
    label: t.nome,
  }));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 p-1">
      <Select
        label="Tipo de Exame (Catálogo)"
        placeholder="Selecione o exame..."
        options={options}
        error={errors.tipoExameId?.message}
        required
        {...register('tipoExameId')}
      />

      <Textarea
        label="Descrição / Indicações"
        placeholder="Notas adicionais para o laboratório ou técnico..."
        error={errors.descricao?.message}
        {...register('descricao')}
        rows={3}
      />

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
        <Button 
          type="button" 
          variant="ghost" 
          onClick={onCancel}
          disabled={isPending}
        >
          Cancelar
        </Button>
        <Button 
          type="submit" 
          variant="primary" 
          disabled={isPending}
        >
          {isPending ? 'A guardar...' : 'Guardar Pedido'}
        </Button>
      </div>

      {errors.root && (
        <ErrorMessage error={errors.root} />
      )}
    </form>
  );
};
