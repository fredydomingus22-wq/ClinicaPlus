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
  Database,
  Package,
  Building,
  DollarSign,
  type LucideIcon
} from 'lucide-react';
import { Papel } from '@clinicaplus/types';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  roles: Papel[];
  priority?: boolean;
  children?: NavItem[];
  parent?: string;
  groupId?: string; // Identificador do grupo para sidebar colapsável
}

export const NAV_CONFIG: NavItem[] = [
  // Dashboard - sem filhos, links diretos por papel
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, priority: true, roles: [Papel.ADMIN], groupId: 'dashboard' },
  { to: '/medico/dashboard', label: 'Dashboard', icon: LayoutDashboard, priority: true, roles: [Papel.MEDICO], groupId: 'dashboard' },
  { to: '/recepcao/dashboard', label: 'Dashboard', icon: LayoutDashboard, priority: true, roles: [Papel.RECEPCIONISTA], groupId: 'dashboard' },

  // Pessoas - grupo colapsável com filhos
  {
    to: '#',
    label: 'Pessoas',
    icon: Users,
    priority: true,
    roles: [Papel.ADMIN],
    groupId: 'pessoas',
    children: [
      {
        to: '/admin/pacientes',
        label: 'Pacientes',
        icon: Users,
        roles: [Papel.ADMIN],
        parent: 'pessoas',
        groupId: 'pessoas-pacientes'
      },
      {
        to: '/admin/medicos',
        label: 'Médicos',
        icon: Stethoscope,
        roles: [Papel.ADMIN],
        parent: 'pessoas',
        groupId: 'pessoas-medicos'
      },
      {
        to: '/admin/equipa',
        label: 'Equipa',
        icon: Users,
        roles: [Papel.ADMIN],
        parent: 'pessoas',
        groupId: 'pessoas-equipa'
      }
    ]
  },
  {
    to: '#',
    label: 'Pessoas',
    icon: Users,
    priority: true,
    roles: [Papel.RECEPCIONISTA],
    groupId: 'pessoas',
    children: [
      {
        to: '/recepcao/pacientes',
        label: 'Pacientes',
        icon: Users,
        roles: [Papel.RECEPCIONISTA],
        parent: 'pessoas',
        groupId: 'pessoas-pacientes'
      }
    ]
  },

  // Cadastros - grupo colapsável com filhos
  {
    to: '#',
    label: 'Cadastros',
    icon: Database,
    priority: true,
    roles: [Papel.ADMIN],
    groupId: 'cadastros',
    children: [
      {
        to: '/admin/inventario/catalogo',
        label: 'Produtos e Serviços',
        icon: Package,
        roles: [Papel.ADMIN],
        parent: 'cadastros',
        groupId: 'cadastros-produtos-servicos'
      },
      {
        to: '/admin/cadastros/fornecedores',
        label: 'Fornecedores',
        icon: Building,
        roles: [Papel.ADMIN],
        parent: 'cadastros',
        groupId: 'cadastros-fornecedores'
      },
      {
        to: '/admin/configuracao/servicos',
        label: 'Exames e Procedimentos',
        icon: Activity,
        roles: [Papel.ADMIN],
        parent: 'cadastros',
        groupId: 'cadastros-procedimentos'
      },
      {
        to: '/admin/especialidades',
        label: 'Especialidades',
        icon: Stethoscope,
        roles: [Papel.ADMIN],
        parent: 'cadastros',
        groupId: 'cadastros-especialidades'
      }
    ]
  },

  // Agendamentos - sem filhos por enquanto
  { to: '/admin/agendamentos', label: 'Agendamentos', icon: Calendar, priority: true, roles: [Papel.ADMIN], groupId: 'agendamentos' },
  { to: '/recepcao/agendamentos', label: 'Agendamentos', icon: Calendar, priority: true, roles: [Papel.RECEPCIONISTA], groupId: 'agendamentos' },
  { to: '/recepcao/hoje', label: 'Hoje', icon: Clock, priority: true, roles: [Papel.RECEPCIONISTA], groupId: 'agendamentos' },
  { to: '/medico/agenda', label: 'Minha Agenda', icon: Calendar, priority: true, roles: [Papel.MEDICO], groupId: 'agendamentos' },

  // Financeiro - grupo colapsável com filhos
  {
    to: '#',
    label: 'Financeiro',
    icon: DollarSign,
    priority: true,
    roles: [Papel.ADMIN],
    groupId: 'financeiro',
    children: [
      {
        to: '/admin/financeiro',
        label: 'Faturação',
        icon: Wallet,
        roles: [Papel.ADMIN],
        parent: 'financeiro',
        groupId: 'financeiro-faturacao'
      },
      {
        to: '/admin/relatorios',
        label: 'Relatórios',
        icon: BarChart3,
        roles: [Papel.ADMIN],
        parent: 'financeiro',
        groupId: 'financeiro-relatorios'
      },
      {
        to: '/admin/contratos',
        label: 'Contratos',
        icon: FileSignature,
        roles: [Papel.ADMIN],
        parent: 'financeiro',
        groupId: 'financeiro-contratos'
      }
    ]
  },
  {
    to: '/recepcao/financeiro', label: 'Financeiro', icon: Wallet, priority: true, roles: [Papel.RECEPCIONISTA], groupId: 'financeiro' },
  { to: '/recepcao/financeiro/seguros', label: 'Seguros de Saúde', icon: ShieldCheck, roles: [Papel.RECEPCIONISTA], groupId: 'financeiro' },

  // Gestão Clínica - grupo colapsável com filhos
  {
    to: '#',
    label: 'Gestão Clínica',
    icon: Stethoscope,
    priority: true,
    roles: [Papel.ADMIN],
    groupId: 'gestao-clinica',
    children: [
      {
        to: '/admin/tratamentos',
        label: 'Gestão de Tratamentos',
        icon: Activity,
        roles: [Papel.ADMIN],
        parent: 'gestao-clinica',
        groupId: 'gestao-clinica-tratamentos'
      },
      {
        to: '/admin/exames',
        label: 'Gestão de Exames',
        icon: FileText,
        roles: [Papel.ADMIN],
        parent: 'gestao-clinica',
        groupId: 'gestao-clinica-exames'
      },
      {
        to: '/admin/anamneses/templates',
        label: 'Templates de Anamnese',
        icon: FileText,
        roles: [Papel.ADMIN],
        parent: 'gestao-clinica',
        groupId: 'gestao-clinica-anamneses'
      },
      {
        to: '/admin/odontogramas',
        label: 'Odontogramas',
        icon: Activity,
        roles: [Papel.ADMIN],
        parent: 'gestao-clinica',
        groupId: 'gestao-clinica-odontogramas'
      }
    ]
  },

  // Saúde/Exames/Tratamentos - Médico
  { to: '/medico/exames', label: 'Gestao de Exames', icon: FileText, priority: true, roles: [Papel.MEDICO], groupId: 'saude' },
  { to: '/medico/tratamentos', label: 'Gestao de Tratamentos', icon: Activity, priority: true, roles: [Papel.MEDICO], groupId: 'saude' },
  { to: '/medico/anamneses/templates', label: 'Templates de Anamnese', icon: FileText, roles: [Papel.MEDICO], groupId: 'saude' },
  { to: '/medico/receitas', label: 'Receitas', icon: FileText, priority: true, roles: [Papel.MEDICO], groupId: 'saude' },
  { to: '/medico/historico', label: 'Historico', icon: Clock, priority: true, roles: [Papel.MEDICO], groupId: 'saude' },

  // Perfil
  { to: '/medico/perfil', label: 'Meu Perfil', icon: User, roles: [Papel.MEDICO], groupId: 'perfil' },
  { to: '/admin/perfil', label: 'Meu Perfil', icon: User, roles: [Papel.ADMIN], groupId: 'perfil' },
  { to: '/recepcao/perfil', label: 'Meu Perfil', icon: User, roles: [Papel.RECEPCIONISTA], groupId: 'perfil' },

  // Admin - Configurações
  { to: '/admin/integracoes', label: 'Integracoes', icon: ShieldCheck, roles: [Papel.ADMIN], groupId: 'admin' },
  { to: '/admin/configuracao', label: 'Definicoes', icon: Settings, roles: [Papel.ADMIN], groupId: 'admin' },
  { to: '/admin/inventario/dashboard', label: 'Dashboard Inventario', icon: BarChart3, priority: true, roles: [Papel.ADMIN], groupId: 'admin' },
  { to: '/admin/inventario/catalogo', label: 'Catalogo de Itens', icon: Archive, priority: true, roles: [Papel.ADMIN], groupId: 'admin' },

  // Super Admin
  { to: '/superadmin', label: 'Super Admin', icon: ShieldCheck, roles: [Papel.SUPER_ADMIN], groupId: 'superadmin' },
];

export function getNavItems(papel?: Papel): NavItem[] {
  if (!papel) return [];
  return NAV_CONFIG.filter((item) => item.roles.includes(papel));
}

/**
 * Achata a estrutura hierárquica para renderização no Sidebar
 * Retorna apenas itens de nível superior e seus filhos diretos
 */
export function getFlatNavItems(papel?: Papel): NavItem[] {
  if (!papel) return [];
  
  const items: NavItem[] = [];
  const topLevelItems = NAV_CONFIG.filter((item) => item.roles.includes(papel) && !item.parent);
  
  for (const item of topLevelItems) {
    items.push(item);
    if (item.children) {
      // Adicionar filhos diretos
      for (const child of item.children) {
        if (child.roles.includes(papel)) {
          items.push(child);
          // Adicionar netos se existirem
          if (child.children) {
            for (const grandchild of child.children) {
              if (grandchild.roles.includes(papel)) {
                items.push(grandchild);
              }
            }
          }
        }
      }
    }
  }
  
  return items;
}

/**
 * Obtém os itens irmãos (mesmo pai) para o TopNav
 * Retorna null se não houver pai ou se o item for de nível superior
 */
export function getSiblingItems(currentPath: string, papel?: Papel): NavItem[] | null {
  if (!papel) return null;
  
  // Encontrar o item atual
  const findItem = (items: NavItem[], path: string): NavItem | null => {
    for (const item of items) {
      if (item.to === path) return item;
      if (item.children) {
        const found = findItem(item.children, path);
        if (found) return found;
      }
    }
    return null;
  };
  
  const currentItem = findItem(NAV_CONFIG, currentPath);
  if (!currentItem || !currentItem.parent) return null;
  
  // Encontrar o pai e retornar seus filhos
  const findParent = (items: NavItem[], parentId: string): NavItem | null => {
    for (const item of items) {
      if (item.groupId === parentId) return item;
      if (item.children) {
        const found = findParent(item.children, parentId);
        if (found) return found;
      }
    }
    return null;
  };
  
  const parent = findParent(NAV_CONFIG, currentItem.parent);
  if (!parent || !parent.children) return null;
  
  // Filtrar filhos pelo papel
  return parent.children.filter(child => child.roles.includes(papel));
}

/**
 * Obtém o grupo pai de um item para controle de expansão no Sidebar
 */
export function getParentGroupId(currentPath: string, papel?: Papel): string | null {
  if (!papel) return null;
  
  const findItem = (items: NavItem[], path: string): NavItem | null => {
    for (const item of items) {
      if (item.to === path) return item;
      if (item.children) {
        const found = findItem(item.children, path);
        if (found) return found;
      }
    }
    return null;
  };
  
  const currentItem = findItem(NAV_CONFIG, currentPath);
  return currentItem?.parent || null;
}
