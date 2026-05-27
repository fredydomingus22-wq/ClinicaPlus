import React, { Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from './stores/auth.store';
import { Papel } from '@clinicaplus/types';
import { LoginPage } from './pages/auth/LoginPage';
import { LoginPageP1 } from './pages/auth/proposals/LoginPageP1';
import { LoginPageP2 } from './pages/auth/proposals/LoginPageP2';
import { LoginPageP3 } from './pages/auth/proposals/LoginPageP3';
import { LoginPageP4 } from './pages/auth/proposals/LoginPageP4';
import { LoginPageP5 } from './pages/auth/proposals/LoginPageP5';
import { AppLayout } from './components/layout/AppLayout';

const RegistoPacientePage = React.lazy(() => import('./pages/auth/RegistoPacientePage'));
const ForgotPasswordPage = React.lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = React.lazy(() => import('./pages/auth/ResetPasswordPage'));
const RegistoClinicaPage = React.lazy(() => import('./pages/auth/RegistoClinicaPage'));

// Lazy load principal areas
const HojePage = React.lazy(() => import('./pages/recepcao').then(m => ({ default: m.HojePage })));
const AgendamentosPage = React.lazy(() => import('./pages/recepcao').then(m => ({ default: m.AgendamentosPage })));
const PacientesPage = React.lazy(() => import('./pages/recepcao').then(m => ({ default: m.PacientesPage })));
const DashboardRecepcao = React.lazy(() => import('./pages/recepcao').then(m => ({ default: m.DashboardRecepcao })));

const MedicoDashboard = React.lazy(() => import('./pages/medico').then(m => ({ default: m.DashboardPage })));
const AgendaPage = React.lazy(() => import('./pages/medico').then(m => ({ default: m.AgendaPage })));
const HistoricoAtendimentosPage = React.lazy(() => import('./pages/medico').then(m => ({ default: m.HistoricoAtendimentosPage })));
const ConsultaPage = React.lazy(() => import('./pages/medico').then(m => ({ default: m.ConsultaPage })));
const ReceitasPage = React.lazy(() => import('./pages/medico').then(m => ({ default: m.ReceitasPage })));
const MedicoPerfilPage = React.lazy(() => import('./pages/medico/PerfilPage'));

const AdminDashboard = React.lazy(() => import('./pages/admin/DashboardPage'));
const AdminAgendamentos = React.lazy(() => import('./pages/admin/AgendamentosPage'));
const AdminPacientes = React.lazy(() => import('./pages/admin/PacientesPage'));
const AdminMedicos = React.lazy(() => import('./pages/admin/MedicosPage'));
const AdminEspecialidades = React.lazy(() => import('./pages/admin/EspecialidadesPage'));
const AdminEquipa = React.lazy(() => import('./pages/admin/EquipaPage').then(m => ({ default: m.EquipaPage })));
const AdminConfiguracao = React.lazy(() => import('./pages/admin/ConfiguracaoPage'));
const AdminConfiguracaoFiscal = React.lazy(() => import('./pages/admin/ConfiguracaoFiscalPage'));
const AdminPerfilPage = React.lazy(() => import('./pages/admin/PerfilPage'));
const AdminIntegracoes = React.lazy(() => import('./pages/admin/IntegracoesPage'));
const AdminServicosPrecos = React.lazy(() => import('./pages/admin/ServicosPrecosPage'));
const AdminExames = React.lazy(() => import('./pages/admin/GestaoExamesPage'));
const AdminTratamentos = React.lazy(() => import('./pages/admin/GestaoTratamentosPage'));
const AdminFornecedores = React.lazy(() => import('./pages/admin/FornecedoresPage'));
const AdminOdontogramas = React.lazy(() => import('./pages/admin/OdontogramasPage'));
const AnamneseTemplatesManagementPage = React.lazy(() => import('./pages/AnamneseTemplatesManagementPage'));
const AdminInventarioCatalogo = React.lazy(() => import('./pages/inventario/CatalogoPage'));
const AdminInventarioDashboard = React.lazy(() => import('./pages/inventario/DashboardPage'));
const AdminInventarioLotes = React.lazy(() => import('./pages/inventario/LotesPage'));
const AdminRelatorios = React.lazy(() => import('./pages/financeiro/RelatoriosPage'));
const AdminConsolaFiscal = React.lazy(() => import('./pages/financeiro/ConsolaFiscalPage'));
const AdminAuditLog = React.lazy(() => import('./pages/admin/AuditLogPage'));
const AdminWhatsApp = React.lazy(() => import('./pages/configuracoes/WhatsappPage').then(m => ({ default: m.WhatsappPage })));
const SubscricaoPage = React.lazy(() => import('./pages/configuracoes/SubscricaoPage').then(m => ({ default: m.SubscricaoPage })));
const ContratosPage = React.lazy(() => import('./pages/admin/ContratosPage'));
const ContratoDetalhe = React.lazy(() => import('./pages/admin/ContratoDetalhePage'));

const FaturasPage = React.lazy(() => import('./pages/financeiro/FaturasPage'));
const DocumentosFiscaisPage = React.lazy(() => import('./pages/financeiro/DocumentosFiscaisPage'));
const NovaFaturaPage = React.lazy(() => import('./pages/financeiro/NovaFaturaPage'));
const FaturaDetalhe = React.lazy(() => import('./pages/financeiro/FaturaDetalhe'));
const SegurosPage = React.lazy(() => import('./pages/financeiro/SegurosPage'));

// Super Admin
const SuperAdminLayout = React.lazy(() => import('./components/layout/SuperAdminLayout').then(m => ({ default: m.SuperAdminLayout })));
const SAOverviewPage = React.lazy(() => import('./pages/superadmin/OverviewPage').then(m => ({ default: m.OverviewPage })));
const SAClinicasGestaoPage = React.lazy(() => import('./pages/superadmin/ClinicasGestaoPage').then(m => ({ default: m.ClinicasGestaoPage })));
const SAClinicaDetalhePage = React.lazy(() => import('./pages/superadmin/ClinicaDetalhePage').then(m => ({ default: m.ClinicaDetalhePage })));
const SAObservabilidadePage = React.lazy(() => import('./pages/superadmin/ObservabilidadePage').then(m => ({ default: m.ObservabilidadePage })));
const SAFinanceiroPage = React.lazy(() => import('./pages/superadmin/FinanceiroPage').then(m => ({ default: m.FinanceiroPage })));
const SASistemaPage = React.lazy(() => import('./pages/superadmin/SistemaPage').then(m => ({ default: m.SistemaPage })));
const SASuportePage = React.lazy(() => import('./pages/superadmin/SuportePage').then(m => ({ default: m.SuportePage })));
const SAUsersPage = React.lazy(() => import('./pages/superadmin/SAUsersPage').then(m => ({ default: m.SAUsersPage })));
const SALogsPage = React.lazy(() => import('./pages/superadmin/SALogsPage').then(m => ({ default: m.SALogsPage })));
const SASettingsPage = React.lazy(() => import('./pages/superadmin/SASettingsPage').then(m => ({ default: m.SASettingsPage })));
const SuperAdminLoginPage = React.lazy(() => import('./pages/superadmin/SuperAdminLoginPage').then(m => ({ default: m.SuperAdminLoginPage })));
const SuperAdminMFASetupPage = React.lazy(() => import('./pages/superadmin/SuperAdminMFASetupPage').then(m => ({ default: m.SuperAdminMFASetupPage })));

const PacienteDashboard = React.lazy(() => import('./pages/paciente/DashboardPage'));
const AgendarPage = React.lazy(() => import('./pages/paciente/AgendarPage'));
const MeusAgendamentosPage = React.lazy(() => import('./pages/paciente/MeusAgendamentosPage'));
const MinhasReceitasPage = React.lazy(() => import('./pages/paciente/MinhasReceitasPage'));
const PerfilPage = React.lazy(() => import('./pages/paciente/PerfilPage'));
const HistoricoClinicoPage = React.lazy(() => import('./pages/paciente/HistoricoClinicoPage').then(m => ({ default: m.HistoricoClinicoPage })));
const NotificacoesPage = React.lazy(() => import('./pages/NotificacoesPage'));
const StyleGuidePage = React.lazy(() => import('./pages/StyleGuidePage'));
const LuxeStylePage = React.lazy(() => import('./pages/LuxeStylePage'));
const ProposalIndustrialPage = React.lazy(() => import('./pages/ProposalIndustrialPage'));
const ProposalPrecisionPage = React.lazy(() => import('./pages/ProposalPrecisionPage'));
const ProposalBrutalistPage = React.lazy(() => import('./pages/ProposalBrutalistPage'));
const ProposalChromaticPage = React.lazy(() => import('./pages/ProposalChromaticPage'));
const ProposalContinuityPage = React.lazy(() => import('./pages/ProposalContinuityPage'));

/**
 * Route guard component for authenticated routes.
 */
function RequireAuth({ roles }: { roles: Papel[] }) {
  const { utilizador, isRestoring } = useAuthStore();

  if (isRestoring) return null; // Handled by App.tsx, but good to have safety
  
  if (!utilizador) {
    return <Navigate to="/login" replace />;
  }

  if (roles.length > 0 && !roles.includes(utilizador.papel)) {
    // Force re-authentication or block if unauthorized
    return <Navigate to="/login" replace />;
  }

  return (
    <Suspense fallback={
      <div className="p-12 flex justify-center items-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    }>
      <Outlet />
    </Suspense>
  );
}

/**
 * Component to redirect to the correct dashboard based on user role.
 */
function DashboardRedirect() {
  const { utilizador } = useAuthStore();
  
  if (!utilizador) return <Navigate to="/login" replace />;

  switch (utilizador.papel) {
    case Papel.ADMIN:
      return <Navigate to="/admin/dashboard" replace />;
    case Papel.MEDICO:
      return <Navigate to="/medico/dashboard" replace />;
    case Papel.RECEPCIONISTA:
      return <Navigate to="/recepcao/dashboard" replace />;
    case Papel.PACIENTE:
      return <Navigate to="/paciente/dashboard" replace />;
    default:
      return <Navigate to="/dashboard/geral" replace />;
  }
}

/**
 * Component to redirect legacy generic routes to role-prefixed routes.
 */
function RoleAwareRedirect({ to }: { to: string }) {
  const { utilizador } = useAuthStore();
  const location = useLocation();
  
  if (!utilizador) return <Navigate to="/login" replace />;

  const papel = utilizador.papel.toLowerCase();
  const basePath = papel === 'recepcionista' ? 'recepcao' : papel;

  // Handle legacy subpaths (e.g., /agendamentos/123)
  const segments = location.pathname.split('/').filter(Boolean);
  const id = segments.length > 1 ? segments[1] : null;

  let targetPath = `/${basePath}/${to}`;

  // Handle special cases
  if (to === 'agendamentos' && utilizador.papel === Papel.MEDICO) {
    targetPath = '/medico/agenda';
  }

  // If there's an ID, transform it into a query parameter for the list page
  if (id) {
    return <Navigate to={`${targetPath}?id=${id}`} replace />;
  }

  return <Navigate to={targetPath} replace />;
}

import { GlobalError } from './components/common/GlobalError';

/**
 * Application router configuration.
 */
export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
    errorElement: <GlobalError />,
  },
  {
    path: '/style-guide',
    element: (
      <Suspense fallback={<div className="min-h-screen flex justify-center items-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" /></div>}>
        <StyleGuidePage />
      </Suspense>
    ),
    errorElement: <GlobalError />,
  },
  {
    path: '/luxe-design',
    element: (
      <Suspense fallback={<div className="min-h-screen flex justify-center items-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" /></div>}>
        <LuxeStylePage />
      </Suspense>
    ),
    errorElement: <GlobalError />,
  },
  {
    path: '/design/industrial',
    element: (
      <Suspense fallback={<div className="min-h-screen flex justify-center items-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" /></div>}>
        <ProposalIndustrialPage />
      </Suspense>
    ),
    errorElement: <GlobalError />,
  },
  {
    path: '/design/precision',
    element: (
      <Suspense fallback={<div className="min-h-screen flex justify-center items-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" /></div>}>
        <ProposalPrecisionPage />
      </Suspense>
    ),
    errorElement: <GlobalError />,
  },
  {
    path: '/design/brutalist',
    element: (
      <Suspense fallback={<div className="min-h-screen flex justify-center items-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" /></div>}>
        <ProposalBrutalistPage />
      </Suspense>
    ),
    errorElement: <GlobalError />,
  },
  {
    path: '/design/chromatic',
    element: (
      <Suspense fallback={<div className="min-h-screen flex justify-center items-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" /></div>}>
        <ProposalChromaticPage />
      </Suspense>
    ),
    errorElement: <GlobalError />,
  },
  {
    path: '/design/continuum',
    element: (
      <Suspense fallback={<div className="min-h-screen flex justify-center items-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" /></div>}>
        <ProposalContinuityPage />
      </Suspense>
    ),
    errorElement: <GlobalError />,
  },
  {
    path: '/login-p1',
    element: <LoginPageP1 />,
    errorElement: <GlobalError />,
  },
  {
    path: '/login-p2',
    element: <LoginPageP2 />,
    errorElement: <GlobalError />,
  },
  {
    path: '/login-p3',
    element: <LoginPageP3 />,
    errorElement: <GlobalError />,
  },
  {
    path: '/login-p4',
    element: <LoginPageP4 />,
    errorElement: <GlobalError />,
  },
  {
    path: '/login-p5',
    element: <LoginPageP5 />,
    errorElement: <GlobalError />,
  },
  {
    path: '/superadmin/login',
    element: (
      <Suspense fallback={<div className="min-h-screen flex justify-center items-center bg-[#0A0A0A]"><div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" /></div>}>
        <SuperAdminLoginPage />
      </Suspense>
    ),
    errorElement: <GlobalError />,
  },
  {
    path: '/superadmin/mfa-setup',
    element: (
      <Suspense fallback={<div className="min-h-screen flex justify-center items-center bg-[#050505]"><div className="h-6 w-6 animate-spin rounded-full border-2 border-sa-primary border-t-transparent" /></div>}>
        <SuperAdminMFASetupPage />
      </Suspense>
    ),
    errorElement: <GlobalError />,
  },
  {
    path: '/auth/registar-paciente',
    element: (
      <Suspense fallback={<div className="min-h-screen flex justify-center items-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" /></div>}>
        <RegistoPacientePage />
      </Suspense>
    ),
    errorElement: <GlobalError />,
  },
  {
    path: '/auth/forgot-password',
    element: (
      <Suspense fallback={<div className="min-h-screen flex justify-center items-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" /></div>}>
        <ForgotPasswordPage />
      </Suspense>
    ),
    errorElement: <GlobalError />,
  },
  {
    path: '/reset-password',
    element: (
      <Suspense fallback={<div className="min-h-screen flex justify-center items-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" /></div>}>
        <ResetPasswordPage />
      </Suspense>
    ),
    errorElement: <GlobalError />,
  },
  {
    path: '/auth/registar',
    element: (
      <Suspense fallback={<div className="min-h-screen flex justify-center items-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" /></div>}>
        <RegistoClinicaPage />
      </Suspense>
    ),
    errorElement: <GlobalError />,
  },
  {
    // Protected routes
    element: <RequireAuth roles={[]} />,
    errorElement: <GlobalError />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            path: '/',
            element: <Navigate to="/dashboard" replace />
          },
          {
            path: '/dashboard',
            element: <DashboardRedirect />
          },
          {
            path: '/notificacoes',
            element: <NotificacoesPage />
          },
          {
            path: '/agendamentos/:id?',
            element: <RoleAwareRedirect to="agendamentos" />
          },
          {
            path: '/pacientes/:id?',
            element: <RoleAwareRedirect to="pacientes" />
          },
          {
            path: '/receitas/:id?',
            element: <RoleAwareRedirect to="receitas" />
          },
          {
            path: '/perfil',
            element: <RoleAwareRedirect to="perfil" />
          },
          {
            path: '/configuracoes/subscricao',
            element: <Navigate to="/admin/configuracao/subscricao" replace />
          }
        ]
      }
    ]
  },
  {
    // Recepção Dashboard & Operations
    element: <RequireAuth roles={[Papel.RECEPCIONISTA, Papel.ADMIN]} />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            path: '/recepcao/dashboard',
            element: <DashboardRecepcao />
          },
          {
            path: '/recepcao/hoje',
            element: <HojePage />
          },
          {
            path: '/recepcao/agendamentos',
            element: <AgendamentosPage />
          },
          {
            path: '/recepcao/pacientes',
            element: <PacientesPage />
          },
          {
            path: '/recepcao/perfil',
            element: <AdminPerfilPage />
          },
          {
            path: '/recepcao/financeiro',
            element: <FaturasPage />
          },
          {
            path: '/recepcao/financeiro/documentos',
            element: <DocumentosFiscaisPage />
          },
          {
            path: '/recepcao/financeiro/seguros',
            element: <SegurosPage />
          },
          {
            path: '/recepcao/financeiro/nova',
            element: <NovaFaturaPage />
          },
          {
            path: '/recepcao/financeiro/:id',
            element: <FaturaDetalhe />
          },
          {
            path: '/recepcao/notificacoes',
            element: <NotificacoesPage />
          }
        ]
      }
    ]
  },
  {
    // Admin routes
    element: <RequireAuth roles={[Papel.ADMIN]} />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            path: '/admin/dashboard',
            element: <AdminDashboard />
          },
          {
            path: '/admin/agendamentos',
            element: <AdminAgendamentos />
          },
          {
            path: '/admin/pacientes',
            element: <AdminPacientes />
          },
          {
            path: '/admin/pacientes/:id/historico',
            element: <HistoricoClinicoPage />
          },
          {
            path: '/admin/medicos',
            element: <AdminMedicos />
          },
          {
            path: '/admin/equipa',
            element: <AdminEquipa />
          },
          {
            path: '/admin/especialidades',
            element: <AdminEspecialidades />
          },
          {
            path: '/admin/cadastros/fornecedores',
            element: <AdminFornecedores />
          },
          {
            path: '/admin/perfil',
            element: <AdminPerfilPage />
          },
          {
            path: '/admin/configuracao',
            element: <AdminConfiguracao />
          },
          {
            path: '/admin/configuracao/fiscal',
            element: <AdminConfiguracaoFiscal />
          },
          {
            path: '/admin/configuracao/servicos',
            element: <AdminServicosPrecos />
          },
          {
            path: '/admin/configuracao/subscricao',
            element: <SubscricaoPage />
          },
          {
            path: '/admin/configuracao/whatsapp',
            element: <AdminWhatsApp />
          },
          {
            path: '/admin/financeiro',
            element: <FaturasPage />
          },
          {
            path: '/admin/financeiro/documentos',
            element: <DocumentosFiscaisPage />
          },
          {
            path: '/admin/financeiro/seguros',
            element: <SegurosPage />
          },
          {
            path: '/admin/financeiro/nova',
            element: <NovaFaturaPage />
          },
          {
            path: '/admin/financeiro/consola-fiscal',
            element: <AdminConsolaFiscal />
          },
          {
            path: '/admin/financeiro/:id',
            element: <FaturaDetalhe />
          },
          {
            path: '/admin/relatorios',
            element: <AdminRelatorios />
          },
          {
            path: '/admin/integracoes',
            element: <AdminIntegracoes />
          },
          {
            path: '/admin/audit-logs',
            element: <AdminAuditLog />
          },
          {
            path: '/admin/exames',
            element: <AdminExames />
          },
          {
            path: '/admin/tratamentos',
            element: <AdminTratamentos />
          },
          {
            path: '/admin/odontogramas',
            element: <AdminOdontogramas />
          },
          {
            path: '/admin/anamneses/templates',
            element: <AnamneseTemplatesManagementPage />
          },
          {
            path: '/admin/notificacoes',
            element: <NotificacoesPage />
          },
          {
            path: '/admin/inventario/catalogo',
            element: <AdminInventarioCatalogo />
          },
          {
            path: '/admin/inventario/dashboard',
            element: <AdminInventarioDashboard />
          },
          {
            path: '/admin/inventario/lotes/:id',
            element: <AdminInventarioLotes />
          },
          {
            path: '/admin/contratos',
            element: <ContratosPage />
          },
          {
            path: '/admin/contratos/:id',
            element: <ContratoDetalhe />
          }
        ]
      }
    ]
  },
  {
    // Medico routes
    element: <RequireAuth roles={[Papel.MEDICO]} />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            path: '/medico/dashboard',
            element: <MedicoDashboard />
          },
          {
            path: '/medico/agenda',
            element: <AgendaPage />
          },
          {
            path: '/medico/historico',
            element: <HistoricoAtendimentosPage />
          },
          {
            path: '/medico/pacientes/:id/historico',
            element: <HistoricoClinicoPage />
          },
          {
            path: '/medico/consulta/:id',
            element: <ConsultaPage />
          },
          {
            path: '/medico/receitas',
            element: <ReceitasPage />
          },
          {
            path: '/medico/perfil',
            element: <MedicoPerfilPage />
          },
          {
            path: '/medico/exames',
            element: <AdminExames />
          },
          {
            path: '/medico/tratamentos',
            element: <AdminTratamentos />
          },
          {
            path: '/medico/anamneses/templates',
            element: <AnamneseTemplatesManagementPage />
          },
          {
            path: '/medico/notificacoes',
            element: <NotificacoesPage />
          },
          {
            path: '/medico/inventario/catalogo',
            element: <AdminInventarioCatalogo />
          },
          {
            path: '/medico/inventario/dashboard',
            element: <AdminInventarioDashboard />
          },
          {
            path: '/medico/financeiro/seguros',
            element: <SegurosPage />
          }
        ]
      }
    ]
  },
  {
    // Paciente routes
    element: <RequireAuth roles={[Papel.PACIENTE]} />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            path: '/paciente/dashboard',
            element: <PacienteDashboard />
          },
          {
            path: '/paciente/agendar',
            element: <AgendarPage />
          },
          {
            path: '/paciente/agendamentos',
            element: <MeusAgendamentosPage />
          },
          {
            path: '/paciente/receitas',
            element: <MinhasReceitasPage />
          },
          {
            path: '/paciente/perfil',
            element: <PerfilPage />
          },
          {
            path: '/paciente/historico',
            element: <HistoricoClinicoPage />
          },
          {
            path: '/paciente/notificacoes',
            element: <NotificacoesPage />
          }
        ]
      }
    ]
  },
  {
    // Super Admin routes
    element: <RequireAuth roles={[Papel.SUPER_ADMIN]} />,
    children: [
      {
        element: <SuperAdminLayout />,
        children: [
          {
            path: '/superadmin',
            element: <SAOverviewPage />
          },
          {
            path: '/superadmin/clinicas',
            element: <SAClinicasGestaoPage />
          },
          {
            path: '/superadmin/clinicas/:id',
            element: <SAClinicaDetalhePage />
          },
          {
            path: '/superadmin/observabilidade',
            element: <SAObservabilidadePage />
          },
          {
            path: '/superadmin/financeiro',
            element: <SAFinanceiroPage />
          },
          {
            path: '/superadmin/sistema',
            element: <SASistemaPage />
          },
          {
            path: '/superadmin/suporte',
            element: <SASuportePage />
          },
          {
            path: '/superadmin/users',
            element: <SAUsersPage />
          },
          {
            path: '/superadmin/logs',
            element: <SALogsPage />
          },
          {
            path: '/superadmin/settings',
            element: <SASettingsPage />
          }
        ]
      }
    ]
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
