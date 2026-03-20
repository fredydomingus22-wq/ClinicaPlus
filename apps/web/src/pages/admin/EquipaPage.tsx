import React, { useState, useEffect } from 'react';
import { useEquipa, useCreateEquipa, useUpdateEquipa } from '../../hooks/useEquipa';
import { 
  Button, 
  Card, 
  Table, 
  Avatar, 
  Badge, 
  Modal, 
  Input, 
  Select, 
  ErrorMessage
} from '@clinicaplus/ui';
import { 
  UserPlus, 
  Search, 
  Edit,
  UserCheck,
  UserX,
  Shield,
  Key
} from 'lucide-react';
import PermissoesModal from '../../components/admin/PermissoesModal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  EquipaCreateSchema, 
  UtilizadorUpdateSchema,
  type UtilizadorDTO,
  type EquipaCreateInput,
  type UtilizadorUpdateInput,
  Papel
} from '@clinicaplus/types';

export const EquipaPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [page] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<UtilizadorDTO | null>(null);
  const [userForPerms, setUserForPerms] = useState<UtilizadorDTO | null>(null);
  
  const { data, isLoading, error } = useEquipa({ 
    page, 
    limit: 15, 
    q: searchTerm || undefined 
  });

  const { mutate: createStaff, isPending: isCreating } = useCreateEquipa();
  const { mutate: updateStaff, isPending: isUpdating } = useUpdateEquipa();

  const isEditing = !!userToEdit;

  // Utilize the schema but omit password fields for updates if they don't apply here
  const schema = isEditing ? UtilizadorUpdateSchema : EquipaCreateSchema;
  
  const form = useForm<EquipaCreateInput | UtilizadorUpdateInput>({
    resolver: zodResolver(schema) as unknown as ReturnType<typeof zodResolver>,
    mode: 'onBlur',
    defaultValues: {
      nome: '',
      email: '',
      papel: Papel.RECEPCIONISTA,
      ativo: true,
    } as unknown as EquipaCreateInput
  });

  useEffect(() => {
    if (userToEdit) {
      form.reset({
        nome: userToEdit.nome,
        email: userToEdit.email,
        papel: userToEdit.papel,
        ativo: userToEdit.ativo,
      });
    } else {
      form.reset({
        nome: '',
        email: '',
        papel: Papel.RECEPCIONISTA,
        ativo: true,
      });
    }
  }, [userToEdit, form]);

  const onSubmit = (values: EquipaCreateInput | UtilizadorUpdateInput) => {
    if (isEditing && userToEdit) {
      updateStaff({ id: userToEdit.id, data: values as UtilizadorUpdateInput }, {
        onSuccess: () => {
          setIsModalOpen(false);
          setUserToEdit(null);
        }
      });
    } else {
      createStaff(values as EquipaCreateInput, {
        onSuccess: () => {
          setIsModalOpen(false);
          form.reset();
        }
      });
    }
  };

  const toggleStatus = (u: UtilizadorDTO) => {
    updateStaff({ id: u.id, data: { ativo: !u.ativo } });
  };

  const openEdit = (u: UtilizadorDTO) => {
    setUserToEdit(u);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setUserToEdit(null);
  };

  const columns = [
    {
      header: 'Nome',
      accessor: (u: UtilizadorDTO) => (
        <div className="flex items-center gap-3">
          <Avatar initials={u.nome.split(' ').map((n: string) => n[0]).join('')} size="sm" />
          <div>
            <p className="font-semibold text-neutral-900">{u.nome}</p>
            <p className="text-xs text-neutral-600">{u.email}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Papel',
      accessor: (u: UtilizadorDTO) => (
        <div className="flex items-center gap-1.5 text-sm font-medium text-neutral-700">
          <Shield className="h-4 w-4 text-primary-500" />
          {u.papel === Papel.ADMIN ? 'Administrador' : 
           u.papel === Papel.SUPER_ADMIN ? 'Super Admin' : 
           u.papel === Papel.MEDICO ? 'Médico' : 
           'Recepcionista'}
        </div>
      )
    },
    {
      header: 'Estado',
      accessor: (u: UtilizadorDTO) => (
        <div role="status" aria-label={`Estado: ${u.ativo ? 'Ativo' : 'Inativo'}`}>
          {u.ativo ? <Badge variant="success">Ativo</Badge> : <Badge variant="neutral">Inativo</Badge>}
        </div>
      )
    },
    {
      header: 'Acções',
      align: 'right' as const,
      accessor: (u: UtilizadorDTO) => (
        <div className="flex items-center justify-end gap-2">
           {/* Não permitir desativar super admin facilmente */}
          {u.papel !== Papel.SUPER_ADMIN && (
            <Button 
              variant="ghost" 
              size="sm" 
              title={u.ativo ? "Desativar Utilizador" : "Ativar Utilizador"}
              onClick={() => toggleStatus(u)}
              className={`p-2 h-8 w-8 ${u.ativo ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50' : 'text-success-600 hover:bg-success-50'}`}
              aria-label={`${u.ativo ? 'Desativar' : 'Ativar'} utilizador ${u.nome}`}
            >
              {u.ativo ? <UserX className="h-4 w-4" aria-hidden="true" /> : <UserCheck className="h-4 w-4" aria-hidden="true" />}
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setUserForPerms(u)} 
            title="Gerir Permissões" 
            className="p-2 h-8 w-8 text-primary-500 hover:text-primary-600 hover:bg-primary-50"
          >
             <Key className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => openEdit(u)} 
            title="Editar Cadastro" 
            className="p-2 h-8 w-8 text-neutral-500 hover:text-primary-600"
            aria-label={`Editar cadastro de ${u.nome}`}
          >
             <Edit className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Equipa e Receção</h1>
          <p className="text-neutral-600 text-sm font-medium">Gestão de administrativos e recepcionistas da clínica.</p>
        </div>
        <Button onClick={() => { setUserToEdit(null); setIsModalOpen(true); }}>
          <UserPlus className="h-4 w-4 mr-2" aria-hidden="true" /> Registar Membro
        </Button>
      </div>

      <Card className="p-0 overflow-hidden border-neutral-100 shadow-sm">
        <div className="border-b border-neutral-100 bg-neutral-50/50 p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" aria-hidden="true" />
            <Input 
              placeholder="Pesquisar por nome ou e-mail..."
              className="pl-10 h-10 w-full bg-white border-neutral-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Pesquisar membros da equipa"
            />
          </div>
        </div>

        {error ? (
          <div className="p-8">
           <ErrorMessage error={error} />
          </div>
        ) : (
          <div aria-busy={isLoading}>
            <Table 
              columns={columns}
              data={data?.items || []}
              isLoading={isLoading}
              keyExtractor={(u) => u.id}
            />
          </div>
        )}
        
        <div className="p-4 bg-neutral-50/50 border-t border-neutral-100 text-right">
            <span className="text-xs font-medium text-neutral-600 bg-white px-3 py-1 rounded-full border border-neutral-200">
               Página {page} de {Math.ceil((data?.total || 0) / 15) || 1}
            </span>
        </div>
      </Card>

      <Modal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal}
        title={isEditing ? `Editar Membro: ${userToEdit?.nome}` : "Registar Novo Membro da Equipa"}
        size="lg"
      >
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-2" noValidate>
          
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-widest flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary-500" aria-hidden="true" /> 
              Dados Pessoais e de Acesso
            </h4>
            
            <div className="grid grid-cols-1 gap-4">
              <Input 
                label="Nome Completo" 
                placeholder="Nome do membro da equipa" 
                required
                {...form.register('nome')}
                error={form.formState.errors.nome?.message as string}
                aria-required="true"
                aria-invalid={!!form.formState.errors.nome}
              />
              <Input 
                label="Email de Acesso" 
                type="email"
                placeholder="email@clinica.com"
                required
                {...form.register('email')}
                error={form.formState.errors.email?.message as string}
                aria-required="true"
                aria-invalid={!!form.formState.errors.email}
              />
              <Select 
                label="Papel / Cargo" 
                placeholder="Selecione o cargo"
                required
                options={[
                  { value: Papel.RECEPCIONISTA, label: 'Recepcionista (Gestão de Agendamentos e Pacientes)' },
                  { value: Papel.MEDICO, label: 'Médico (Corpo Clínico e Consultas)' },
                  { value: Papel.ADMIN, label: 'Administrador (Gestão Total da Clínica)' }
                ]}
                {...form.register('papel')}
                error={form.formState.errors.papel?.message as string}
                aria-required="true"
                aria-invalid={!!form.formState.errors.papel}
              />
            </div>

            {!isEditing && (
              <div className="mt-4 p-4 bg-primary-50 border border-primary-100 rounded-lg space-y-2">
                <p className="text-sm text-primary-800">
                  <span className="font-semibold">Nota:</span> A senha de acesso será gerada automaticamente e enviada para o e-mail cadastrado.
                </p>
                {form.watch('papel') === Papel.MEDICO && (
                  <p className="text-sm text-amber-800 bg-amber-50 p-2 rounded border border-amber-100">
                    <span className="font-semibold underline">Importante:</span> Ao registar um Médico por aqui, deverá depois completar o seu perfil (especialidade, horários e preços) na página de <span className="font-bold">Gestão de Médicos</span>.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-neutral-100">
            <Button variant="ghost" type="button" onClick={handleCloseModal}>Cancelar</Button>
            <Button type="submit" loading={isCreating || isUpdating}>
              {isEditing ? "Guardar Alterações" : "Concluir Registo"}
            </Button>
          </div>
        </form>
      </Modal>

      {userForPerms && (
        <PermissoesModal 
          isOpen={!!userForPerms}
          onClose={() => setUserForPerms(null)}
          utilizadorId={userForPerms.id}
          utilizadorNome={userForPerms.nome}
        />
      )}
    </div>
  );
};

export default EquipaPage;
