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
  Wallet,
  BarChart3,
  Activity,
  History,
  Archive,
  FileSignature,
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
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, priority: true, roles: [Papel.ADMIN] },
  { to: '/medico/dashboard', label: 'Dashboard', icon: LayoutDashboard, priority: true, roles: [Papel.MEDICO] },
  { to: '/medico/agenda', label: 'Minha Agenda', icon: Calendar, priority: true, roles: [Papel.MEDICO] },
  { to: '/medico/historico', label: 'Historico', icon: Clock, priority: true, roles: [Papel.MEDICO] },
  { to: '/recepcao/dashboard', label: 'Dashboard', icon: LayoutDashboard, priority: true, roles: [Papel.RECEPCIONISTA] },
  { to: '/recepcao/hoje', label: 'Hoje', icon: Clock, priority: true, roles: [Papel.RECEPCIONISTA] },
  { to: '/paciente/dashboard', label: 'Dashboard', icon: LayoutDashboard, priority: true, roles: [Papel.PACIENTE] },
  { to: '/admin/agendamentos', label: 'Agendamentos', icon: Calendar, priority: true, roles: [Papel.ADMIN] },
  { to: '/recepcao/agendamentos', label: 'Agendamentos', icon: Calendar, priority: true, roles: [Papel.RECEPCIONISTA] },
  { to: '/paciente/agendamentos', label: 'Meus Agendamentos', icon: Calendar, priority: true, roles: [Papel.PACIENTE] },
  { to: '/paciente/agendar', label: 'Marcar Consulta', icon: Calendar, priority: true, roles: [Papel.PACIENTE] },
  { to: '/admin/pacientes', label: 'Pacientes', icon: Users, priority: true, roles: [Papel.ADMIN] },
  { to: '/medico/exames', label: 'Gestao de Exames', icon: FileText, priority: true, roles: [Papel.MEDICO] },
  { to: '/medico/tratamentos', label: 'Gestao de Tratamentos', icon: Activity, priority: true, roles: [Papel.MEDICO] },
  { to: '/medico/anamneses/templates', label: 'Templates de Anamnese', icon: FileText, roles: [Papel.MEDICO] },
  { to: '/admin/exames', label: 'Gestao de Exames', icon: FileText, priority: true, roles: [Papel.ADMIN] },
  { to: '/admin/tratamentos', label: 'Gestao de Tratamentos', icon: Activity, priority: true, roles: [Papel.ADMIN] },
  { to: '/admin/anamneses/templates', label: 'Templates de Anamnese', icon: FileText, roles: [Papel.ADMIN] },
  { to: '/recepcao/pacientes', label: 'Pacientes', icon: Users, priority: true, roles: [Papel.RECEPCIONISTA] },
  { to: '/medico/receitas', label: 'Receitas', icon: FileText, priority: true, roles: [Papel.MEDICO] },
  { to: '/paciente/receitas', label: 'Minhas Receitas', icon: FileText, priority: true, roles: [Papel.PACIENTE] },
  { to: '/paciente/historico', label: 'Historico Clinico', icon: History, priority: true, roles: [Papel.PACIENTE] },
  { to: '/medico/perfil', label: 'Meu Perfil', icon: User, roles: [Papel.MEDICO] },
  { to: '/admin/perfil', label: 'Meu Perfil', icon: User, roles: [Papel.ADMIN] },
  { to: '/recepcao/perfil', label: 'Meu Perfil', icon: User, roles: [Papel.RECEPCIONISTA] },
  { to: '/paciente/perfil', label: 'O Meu Perfil', icon: User, roles: [Papel.PACIENTE] },
  { to: '/admin/financeiro', label: 'Financeiro', icon: Wallet, priority: true, roles: [Papel.ADMIN] },
  { to: '/admin/financeiro/seguros', label: 'Seguros de Saúde', icon: ShieldCheck, roles: [Papel.ADMIN] },
  { to: '/admin/relatorios', label: 'Relatorios', icon: BarChart3, roles: [Papel.ADMIN] },
  { to: '/recepcao/financeiro', label: 'Financeiro', icon: Wallet, priority: true, roles: [Papel.RECEPCIONISTA] },
  { to: '/recepcao/financeiro/seguros', label: 'Seguros de Saúde', icon: ShieldCheck, roles: [Papel.RECEPCIONISTA] },
  { to: '/medico/financeiro/seguros', label: 'Seguros de Saúde', icon: ShieldCheck, roles: [Papel.MEDICO] },
  { to: '/admin/medicos', label: 'Equipa Medica', icon: Stethoscope, priority: true, roles: [Papel.ADMIN] },
  { to: '/admin/equipa', label: 'Equipa e Recepcao', icon: Users, priority: true, roles: [Papel.ADMIN] },
  { to: '/admin/especialidades', label: 'Especialidades', icon: Stethoscope, roles: [Papel.ADMIN] },
  { to: '/admin/integracoes', label: 'Integracoes', icon: ShieldCheck, roles: [Papel.ADMIN] },
  { to: '/admin/configuracao', label: 'Definicoes', icon: Settings, roles: [Papel.ADMIN] },
  { to: '/admin/contratos', label: 'Contratos', icon: FileSignature, roles: [Papel.ADMIN] },
  { to: '/admin/inventario/dashboard', label: 'Dashboard Inventario', icon: BarChart3, priority: true, roles: [Papel.ADMIN] },
  { to: '/admin/inventario/catalogo', label: 'Catalogo de Itens', icon: Archive, priority: true, roles: [Papel.ADMIN] },
  { to: '/superadmin', label: 'Super Admin', icon: ShieldCheck, roles: [Papel.SUPER_ADMIN] },
];

export function getNavItems(papel?: Papel): NavItem[] {
  if (!papel) return [];
  return NAV_CONFIG.filter((item) => item.roles.includes(papel));
}
