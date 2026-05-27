"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ANGOLA_PHONE_REGEX = exports.DIAS_SEMANA = exports.APPOINTMENT_STATES = exports.SPECIALTIES = exports.PROVINCES = void 0;
exports.PROVINCES = [
    'Bengo', 'Benguela', 'Bié', 'Cabinda', 'Cuando Cubango', 'Cuanza Norte',
    'Cuanza Sul', 'Cunene', 'Huambo', 'Huíla', 'Luanda', 'Lunda Norte',
    'Lunda Sul', 'Malanje', 'Moxico', 'Namibe', 'Uíge', 'Zaire'
];
exports.SPECIALTIES = [
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
];
exports.APPOINTMENT_STATES = {
    PENDENTE: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
    CONFIRMADO: { label: 'Confirmado', color: 'bg-blue-100 text-blue-800' },
    EM_PROGRESSO: { label: 'Em Progresso', color: 'bg-orange-100 text-orange-800' },
    CONCLUIDO: { label: 'Concluído', color: 'bg-green-100 text-green-800' },
    CANCELADO: { label: 'Cancelado', color: 'bg-red-100 text-red-800' },
    NAO_COMPARECEU: { label: 'Não Compareceu', color: 'bg-gray-100 text-gray-800' },
    EM_ESPERA: { label: 'A Aguardar', color: 'bg-indigo-100 text-indigo-800' },
    ATRASADO: { label: 'Atrasado', color: 'bg-amber-100 text-amber-800' },
};
exports.DIAS_SEMANA = [
    'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'
];
exports.ANGOLA_PHONE_REGEX = /^(?:\+244|00244|244)?[9][1-9]\d{7}$/;
//# sourceMappingURL=constants.js.map