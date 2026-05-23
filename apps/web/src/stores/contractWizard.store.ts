import { create } from 'zustand';
import type { ContractItemType, ContractPaymentType } from '../api/contracts';

export type ContractWizardItem = {
  id: string;
  itemType: ContractItemType;
  produtoId: string;
  tipoTratamentoId: string;
  quantidade: number;
  desconto: number;
};

type ContractWizardState = {
  step: number;
  form: {
    pacienteId: string;
    titulo: string;
    dataInicio: string;
    dataFim: string;
    tipoPagamento: ContractPaymentType;
    parcelas: number;
    valorEntrada: number;
    clausulaRescisao: string;
    observacoes: string;
  };
  items: ContractWizardItem[];
  setStep: (step: number) => void;
  setForm: (patch: Partial<ContractWizardState['form']>) => void;
  setItems: (items: ContractWizardItem[]) => void;
  reset: () => void;
};

const initialForm: ContractWizardState['form'] = {
  pacienteId: '',
  titulo: '',
  dataInicio: '',
  dataFim: '',
  tipoPagamento: 'INSTALLMENTS',
  parcelas: 1,
  valorEntrada: 0,
  clausulaRescisao: '',
  observacoes: '',
};

const newItem = (): ContractWizardItem => ({
  id: crypto.randomUUID(),
  itemType: 'SERVICO',
  produtoId: '',
  tipoTratamentoId: '',
  quantidade: 1,
  desconto: 0,
});

const initialItems: ContractWizardItem[] = [newItem()];

export const useContractWizardStore = create<ContractWizardState>((set) => ({
  step: 0,
  form: initialForm,
  items: initialItems,
  setStep: (step) => set({ step }),
  setForm: (patch) => set((s) => ({ form: { ...s.form, ...patch } })),
  setItems: (items) => set({ items }),
  reset: () => set({ step: 0, form: initialForm, items: [newItem()] }),
}));
