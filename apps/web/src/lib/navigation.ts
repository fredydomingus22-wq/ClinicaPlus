import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Stethoscope, 
  FileText, 
  Settings, 
  ShieldCheck,
  Clock,
  User,
  type LucideIcon
} from 'lucide-react';
import { Papel } from '@clinicaplus/types';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  roles: Papel[];
  priority?: boolean;
}

export const NAV_CONFIG: NavItem[] = [
  { 
    to: '/admin/dashboard', 
    label: 'Dashboard', 
    icon: LayoutDashboard, 
    priority: true,
    roles: [Papel.ADMIN] 
  },
  { 
    to: '/medico/dashboard', 
    label: 'Dashboard', 
    icon: LayoutDashboard, 
    priority: true,
    roles: [Papel.MEDICO] 
  },
  { 
    to: '/medico/agenda', 
    label: 'Minha Agenda', 
    icon: Calendar, 
    priority: true,
    roles: [Papel.MEDICO] 
  },
  { 
    to: '/medico/historico', 
    label: 'Histórico', 
    icon: Clock, 
    priority: true,
    roles: [Papel.MEDICO] 
  },
  { 
    to: '/recepcao/dashboard', 
    label: 'Dashboard', 
    icon: LayoutDashboard, 
    priority: true,
    roles: [Papel.RECEPCIONISTA] 
  },
  { 
    to: '/recepcao/hoje', 
    label: 'Hoje', 
    icon: Clock, 
    priority: true,
    roles: [Papel.RECEPCIONISTA] 
  },
  { 
    to: '/paciente/dashboard', 
    label: 'Dashboard', 
    icon: LayoutDashboard, 
    priority: true,
    roles: [Papel.PACIENTE] 
  },
  { 
    to: '/admin/agendamentos', 
    label: 'Agendamentos', 
    icon: Calendar, 
    priority: true,
    roles: [Papel.ADMIN] 
  },
  { 
    to: '/recepcao/agendamentos', 
    label: 'Agendamentos', 
    icon: Calendar, 
    priority: true,
    roles: [Papel.RECEPCIONISTA] 
  },
  { 
    to: '/paciente/agendamentos', 
    label: 'Meus Agendamentos', 
    icon: Calendar, 
    priority: true,
    roles: [Papel.PACIENTE] 
  },
  { 
    to: '/paciente/agendar', 
    label: 'Marcar Consulta', 
    icon: Calendar, 
    priority: true,
    roles: [Papel.PACIENTE] 
  },
  { 
    to: '/admin/pacientes', 
    label: 'Pacientes', 
    icon: Users, 
    priority: true,
    roles: [Papel.ADMIN] 
  },
  { 
    to: '/recepcao/pacientes', 
    label: 'Pacientes', 
    icon: Users, 
    priority: true,
    roles: [Papel.RECEPCIONISTA] 
  },
  { 
    to: '/medico/receitas', 
    label: 'Receitas', 
    icon: FileText, 
    priority: true,
    roles: [Papel.MEDICO] 
  },
  { 
    to: '/paciente/receitas', 
    label: 'Minhas Receitas', 
    icon: FileText, 
    priority: true,
    roles: [Papel.PACIENTE] 
  },
  { 
    to: '/medico/perfil', 
    label: 'Meu Perfil', 
    icon: User, 
    roles: [Papel.MEDICO] 
  },
  { 
    to: '/paciente/perfil', 
    label: 'O Meu Perfil', 
    icon: User, 
    roles: [Papel.PACIENTE] 
  },
  { 
    to: '/admin/medicos', 
    label: 'Equipa Médica', 
    icon: Stethoscope, 
    priority: true,
    roles: [Papel.ADMIN] 
  },
  { 
    to: '/admin/equipa', 
    label: 'Equipa & Receção', 
    icon: Users, 
    priority: true,
    roles: [Papel.ADMIN] 
  },
  { 
    to: '/admin/especialidades', 
    label: 'Especialidades', 
    icon: Stethoscope, 
    roles: [Papel.ADMIN] 
  },
  { 
    to: '/admin/configuracao', 
    label: 'Definições', 
    icon: Settings, 
    roles: [Papel.ADMIN] 
  },
  { 
    to: '/superadmin', 
    label: 'Super Admin', 
    icon: ShieldCheck, 
    roles: [Papel.SUPER_ADMIN] 
  },
];

export function getNavItems(papel?: Papel): NavItem[] {
  if (!papel) return [];
  return NAV_CONFIG.filter(item => item.roles.includes(papel));
}
