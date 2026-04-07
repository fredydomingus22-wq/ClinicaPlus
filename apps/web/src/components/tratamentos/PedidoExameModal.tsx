import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CriarExameSchema, type CriarExameDto, type TipoExameClinicaDTO } from '@clinicaplus/types';
import { useTiposExameClinica, useCriarExame } from '../../hooks/useTratamentos';
import { useMedicos } from '../../hooks/useMedicos';
import { Modal, Select, Textarea, Button } from '@clinicaplus/ui';

interface PedidoExameModalProps {
  isOpen: boolean;
  onClose: () => void;
  pacienteId?: string;
  agendamentoId?: string;
  medicoId?: string;
  onSuccess?: () => void;
}

export function PedidoExameModal({ isOpen, onClose, pacienteId, agendamentoId, medicoId, onSuccess }: PedidoExameModalProps) {
  const { data: tiposExame } = useTiposExameClinica();
  const { data: medicos } = useMedicos({ ativo: true, page: 1, limit: 100 });
  const { mutate: criarExame, isPending } = useCriarExame();

  const { register, handleSubmit, formState: { errors }, reset } = useForm<CriarExameDto>({
    resolver: zodResolver(CriarExameSchema),
    defaultValues: {
      pacienteId: pacienteId || '',
      agendamentoId: agendamentoId || '',
      medicoId: medicoId || '',
    }
  });

  const onSubmit = (data: CriarExameDto) => {
    criarExame(data, {
      onSuccess: () => {
        reset();
        onSuccess?.();
        onClose();
      }
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Solicitar Exame Clínico"
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-2">
        <div className="space-y-4">
          <Select 
            label="Tipo de Exame"
            required
            options={(tiposExame || []).map((t: TipoExameClinicaDTO) => ({ value: t.id, label: t.nome }))}
            {...register('tipoExameId')}
            error={errors.tipoExameId?.message}
            placeholder="Selecione o exame no catálogo"
          />

          <Select 
            label="Médico Solicitante"
            required
            options={(medicos?.items || []).map(m => ({ value: m.id, label: m.nome }))}
            {...register('medicoId')}
            error={errors.medicoId?.message}
            placeholder="Selecione o médico"
          />

          <Textarea 
            label="Justificação / Indicação Clínica"
            placeholder="Descreva o motivo da solicitação deste exame..."
            {...register('descricao')}
            error={errors.descricao?.message}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
          <Button variant="ghost" type="button" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={isPending}>Solicitar Exame</Button>
        </div>
      </form>
    </Modal>
  );
}
