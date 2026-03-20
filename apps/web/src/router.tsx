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
const AdminPerfilPage = React.lazy(() => import('./pages/admin/PerfilPage'));
const AdminIntegracoes = React.lazy(() => import('./pages/admin/IntegracoesPage'));
const AdminRelatorios = React.lazy(() => import('./pages/financeiro/RelatoriosPage'));
const AdminAuditLog = React.lazy(() => import('./pages/admin/AuditLogPage'));
const AdminWhatsApp = React.lazy(() => import('./pages/configuracoes/WhatsappPage').then(m => ({ default: m.WhatsappPage })));
const SubscricaoPage = React.lazy(() => import('./pages/configuracoes/SubscricaoPage').then(m => ({ default: m.SubscricaoPage })));

const FaturasPage = React.lazy(() => import('./pages/financeiro/FaturasPage'));
const NovaFaturaPage = React.lazy(() => import('./pages/financeiro/NovaFaturaPage'));
const FaturaDetalhe = React.lazy(() => import('./pages/financeiro/FaturaDetalhe'));

// Super Admin
const SuperAdminLayout = React.lazy(() => import('./components/layout/SuperAdminLayout').then(m => ({ default: m.SuperAdminLayout })));
const SAOverviewPage = React.lazy(() => import('./pages/superadmin/OverviewPage').then(m => ({ default: m.OverviewPage })));
const SAClinicasGestaoPage = React.lazy(() => import('./pages/superadmin/ClinicasGestaoPage').then(m => ({ default: m.ClinicasGestaoPage })));
const SAUsersPage = React.lazy(() => import('./pages/superadmin/SAUsersPage').then(m => ({ default: m.SAUsersPage })));
const SALogsPage = React.lazy(() => import('./pages/superadmin/SALogsPage').then(m => ({ default: m.SALogsPage })));
const SASettingsPage = React.lazy(() => import('./pages/superadmin/SASettingsPage').then(m => ({ default: m.SASettingsPage })));
const SuperAdminLoginPage = React.lazy(() => import('./pages/superadmin/SuperAdminLoginPage').then(m => ({ default: m.SuperAdminLoginPage })));

const PacienteDashboard = React.lazy(() => import('./pages/paciente/DashboardPage'));
const AgendarPage = React.lazy(() => import('./pages/paciente/AgendarPage'));
const MeusAgendamentosPage = React.lazy(() => import('./pages/paciente/MeusAgendamentosPage'));
const MinhasReceitasPage = React.lazy(() => import('./pages/paciente/MinhasReceitasPage'));
const PerfilPage = React.lazy(() => import('./pages/paciente/PerfilPage'));
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

/**
 * Application router configuration.
 */
export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/style-guide',
    element: (
      <Suspense fallback={<div className="min-h-screen flex justify-center items-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" /></div>}>
        <StyleGuidePage />
      </Suspense>
    ),
  },
  {
    path: '/luxe-design',
    element: (
      <Suspense fallback={<div className="min-h-screen flex justify-center items-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" /></div>}>
        <LuxeStylePage />
      </Suspense>
    ),
  },
  {
    path: '/design/industrial',
    element: (
      <Suspense fallback={<div className="min-h-screen flex justify-center items-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" /></div>}>
        <ProposalIndustrialPage />
      </Suspense>
    ),
  },
  {
    path: '/design/precision',
    element: (
      <Suspense fallback={<div className="min-h-screen flex justify-center items-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" /></div>}>
        <ProposalPrecisionPage />
      </Suspense>
    ),
  },
  {
    path: '/design/brutalist',
    element: (
      <Suspense fallback={<div className="min-h-screen flex justify-center items-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" /></div>}>
        <ProposalBrutalistPage />
      </Suspense>
    ),
  },
  {
    path: '/design/chromatic',
    element: (
      <Suspense fallback={<div className="min-h-screen flex justify-center items-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" /></div>}>
        <ProposalChromaticPage />
      </Suspense>
    ),
  },
  {
    path: '/design/continuum',
    element: (
      <Suspense fallback={<div className="min-h-screen flex justify-center items-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" /></div>}>
        <ProposalContinuityPage />
      </Suspense>
    ),
  },
  {
    path: '/login-p1',
    element: <LoginPageP1 />,
  },
  {
    path: '/login-p2',
    element: <LoginPageP2 />,
  },
  {
    path: '/login-p3',
    element: <LoginPageP3 />,
  },
  {
    path: '/login-p4',
    element: <LoginPageP4 />,
  },
  {
    path: '/login-p5',
    element: <LoginPageP5 />,
  },
  {
    path: '/superadmin/login',
    element: (
      <Suspense fallback={<div className="min-h-screen flex justify-center items-center bg-[#0A0A0A]"><div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" /></div>}>
        <SuperAdminLoginPage />
      </Suspense>
    ),
  },
  {
    path: '/auth/registar-paciente',
    element: (
      <Suspense fallback={<div className="min-h-screen flex justify-center items-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" /></div>}>
        <RegistoPacientePage />
      </Suspense>
    ),
  },
  {
    path: '/auth/forgot-password',
    element: (
      <Suspense fallback={<div className="min-h-screen flex justify-center items-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" /></div>}>
        <ForgotPasswordPage />
      </Suspense>
    ),
  },
  {
    path: '/reset-password',
    element: (
      <Suspense fallback={<div className="min-h-screen flex justify-center items-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" /></div>}>
        <ResetPasswordPage />
      </Suspense>
    ),
  },
  {
    path: '/auth/registar',
    element: (
      <Suspense fallback={<div className="min-h-screen flex justify-center items-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" /></div>}>
        <RegistoClinicaPage />
      </Suspense>
    ),
  },
  {
    // Protected routes
    element: <RequireAuth roles={[]} />,
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
            path: '/admin/perfil',
            element: <AdminPerfilPage />
          },
          {
            path: '/admin/configuracao',
            element: <AdminConfiguracao />
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
            path: '/admin/financeiro/nova',
            element: <NovaFaturaPage />
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
            path: '/admin/notificacoes',
            element: <NotificacoesPage />
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
            path: '/medico/notificacoes',
            element: <NotificacoesPage />
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
