import { EstadoAgendamento } from '@clinicaplus/types';

export const PROVINCES = [
  'Bengo', 'Benguela', 'Bié', 'Cabinda', 'Cuando Cubango', 'Cuanza Norte',
  'Cuanza Sul', 'Cunene', 'Huambo', 'Huíla', 'Luanda', 'Lunda Norte',
  'Lunda Sul', 'Malanje', 'Moxico', 'Namibe', 'Uíge', 'Zaire'
];

export const SPECIALTIES = [
  'Cardiologia',
  'Cirurgia Geral',
  'Cirurgia Ortopédica',
  'Clínica Geral',
  'Dermatologia',
  'Endocrinologia',
  'Gastroenterologia',
  'Ginecologia e Obstetrícia',
  'Infectologia',
  'Medicina Interna',
  'Nefrologia',
  'Neurologia',
  'Oftalmologia',
  'Oncologia',
  'Otorrinolaringologia',
  'Pediatria',
  'Pneumologia',
  'Psicologia',
  'Psiquiatria',
  'Radiologia',
  'Reumatologia',
  'Urologia',
] as const;

export const APPOINTMENT_STATES: Record<EstadoAgendamento, { label: string; color: string }> = {
  PENDENTE: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
  CONFIRMADO: { label: 'Confirmado', color: 'bg-blue-100 text-blue-800' },
  EM_PROGRESSO: { label: 'Em Progresso', color: 'bg-orange-100 text-orange-800' },
  CONCLUIDO: { label: 'Concluído', color: 'bg-green-100 text-green-800' },
  CANCELADO: { label: 'Cancelado', color: 'bg-red-100 text-red-800' },
  NAO_COMPARECEU: { label: 'Não Compareceu', color: 'bg-gray-100 text-gray-800' },
  EM_ESPERA: { label: 'A Aguardar', color: 'bg-indigo-100 text-indigo-800' },
};

export const DIAS_SEMANA = [
  'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'
];

export const ANGOLA_PHONE_REGEX = /^(?:\+244|00244|244)?[9][1-9]\d{7}$/;
