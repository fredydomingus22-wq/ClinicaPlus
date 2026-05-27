import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal, Input, Button, Textarea } from '@clinicaplus/ui';
import { useInventory } from '../../hooks/useInventory';
import { CreateCategoriaSchema, type CreateCategoriaInput } from '../../schemas/inventory.schema';
import type { CategoriaResponse } from '../../types/inventory.types';

interface CategoryQuickCreateProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (categoryId: string) => void;
}

export const CategoryQuickCreate: React.FC<CategoryQuickCreateProps> = ({ isOpen, onClose, onSuccess }) => {
  const { useCreateCategoria } = useInventory();
  const { mutate: create, isPending } = useCreateCategoria();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateCategoriaInput>({
    resolver: zodResolver(CreateCategoriaSchema) as any,
    defaultValues: {
      nome: '',
    }
  });

  const onSubmit = (data: CreateCategoriaInput) => {
    create(data, {
      onSuccess: (newCat: CategoriaResponse) => {
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
