import React from 'react';
import { useForm } from 'react-hook-form';
import { Modal, Input, Button, Textarea } from '@clinicaplus/ui';
import { useInventory } from '../../hooks/useInventory';

interface CategoryQuickCreateProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (categoryId: string) => void;
}

export const CategoryQuickCreate: React.FC<CategoryQuickCreateProps> = ({ isOpen, onClose, onSuccess }) => {
  const { useCreateCategoria } = useInventory();
  const { mutate: create, isPending } = useCreateCategoria();
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      nome: '',
      descricao: '',
      cor: '#3b82f6',
    }
  });

  const onSubmit = (data: any) => {
    create(data, {
      onSuccess: (newCat: any) => {
        onSuccess?.(newCat.id);
        reset();
        onClose();
      }
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nova Categoria" size="sm">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input 
          label="Nome da Categoria" 
          placeholder="Ex: Antibióticos, Consultas..." 
          {...register('nome', { required: 'Nome é obrigatório' })}
          error={errors.nome?.message}
        />
        <Textarea 
          label="Descrição" 
          placeholder="Opcional..." 
          {...register('descricao')}
        />
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="ghost" fullWidth onClick={onClose}>Cancelar</Button>
          <Button type="submit" fullWidth loading={isPending}>Criar Categoria</Button>
        </div>
      </form>
    </Modal>
  );
};
