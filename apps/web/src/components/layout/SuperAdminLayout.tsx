import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { authApi } from '../../api/auth';
import { 
  Terminal, 
  Building2, 
  Users, 
  Activity, 
  Settings, 
  LogOut,
  X 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useUIStore } from '../../stores/ui.store';
import { StatTicker } from '../../pages/superadmin/components/StatTicker';
import { CommandPalette } from '../../pages/superadmin/components/CommandPalette';

export function SuperAdminLayout() {
  const { utilizador, clear } = useAuthStore();
  const navigate = useNavigate();
  // Using existing global notifications
  const { notifications, dismissNotification } = useUIStore();

  const handleLogout = async () => {
    try {
      await authApi.logout();
      clear();
      navigate('/login');
    } catch {
      toast.error('Erro ao terminar sessão');
    }
  };

  const navItems = [
    { to: '/superadmin', icon: Terminal, label: 'Visão Geral' },
    { to: '/superadmin/clinicas', icon: Building2, label: 'Gestão de Clínicas' },
    { to: '/superadmin/users', icon: Users, label: 'Utilizadores Globais' },
    { to: '/superadmin/logs', icon: Activity, label: 'Registos do Sistema' },
    { to: '/superadmin/settings', icon: Settings, label: 'Configurações' },
  ];

  return (
    <div className="superadmin-theme flex h-screen w-full bg-sa-background text-sa-text font-sans antialiased overflow-hidden selection:bg-sa-primary/30 selection:text-white">
      
      {/* Sidebar: Profissional & Expandível (Visual) */}
      <aside className="w-[var(--sidebar-width-collapsed)] hover:w-[var(--sidebar-width)] group border-r border-sa-border bg-sa-background flex flex-col items-start py-6 z-20 shadow-2xl relative transition-[width] duration-300 ease-in-out">
        <div className="w-full flex justify-center group-hover:justify-start px-4 mb-8 shrink-0">
          <div className="w-10 h-10 rounded bg-sa-primary/10 border border-sa-primary/30 flex items-center justify-center">
            <Terminal className="w-5 h-5 text-sa-primary" />
          </div>
          <span className="hidden group-hover:block ml-3 font-bold text-lg self-center tracking-tight">ClinicaPlus SA</span>
        </div>

        <nav className="flex-1 flex flex-col gap-2 w-full px-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/superadmin'}
              className={({ isActive }) => `
                relative w-full h-11 flex items-center px-3 rounded-lg group/item transition-all duration-200
                ${isActive ? 'bg-sa-primary/10 text-sa-primary' : 'text-sa-text-muted hover:text-white hover:bg-white/5'}
              `}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="hidden group-hover:block ml-3 text-sm font-medium whitespace-nowrap overflow-hidden">
                {item.label}
              </span>
              <NavLink
                to={item.to}
                className={({ isActive }) => isActive ? "absolute left-0 w-1 h-6 bg-sa-primary rounded-r-full group-hover:hidden" : "hidden"}
              />
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-4 w-full px-3">
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group/user">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sa-primary to-sa-background border border-sa-border flex items-center justify-center text-xs font-bold uppercase shrink-0">
              {utilizador?.nome.charAt(0)}
            </div>
            <div className="hidden group-hover:flex flex-col min-w-0">
              <span className="text-sm font-medium text-white truncate">{utilizador?.nome}</span>
              <span className="text-[10px] text-sa-text-muted uppercase">Super Admin</span>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            title="Terminar Sessão"
            className="w-full h-11 flex items-center px-3 rounded-lg text-sa-text-muted hover:text-sa-destructive hover:bg-sa-destructive/10 transition-colors"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span className="hidden group-hover:block ml-3 text-sm font-medium">Sair</span>
          </button>
        </div>
      </aside>

      {/* Área Central (Data View) */}
      <div className="flex-1 flex flex-col min-w-0 bg-sa-surface relative overflow-hidden">
        {/* Topbar: Ticker Data & Command Trigger */}
        <header className="h-[56px] border-b border-sa-border bg-sa-background/50 backdrop-blur-md flex items-center justify-between px-6 z-10 shrink-0">
          <StatTicker />
          <CommandPalette />
        </header>
        
        {/* Main Central View */}
        <main className="flex-1 overflow-y-auto w-full relative">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
          <Outlet />
        </main>

        {/* System Status Footer */}
        <footer className="h-[var(--footer-height)] border-t border-sa-border bg-sa-background/80 backdrop-blur-sm flex items-center justify-between px-6 z-10 shrink-0 select-none">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sa-primary animate-pulse" />
              <span className="text-[10px] uppercase tracking-widest font-mono text-sa-text-muted">Serviço Ativo</span>
            </div>
            <span className="text-[10px] font-mono text-sa-text-dim">|</span>
            <span className="text-[10px] font-mono text-sa-text-muted">ClinicaPlus Core v2.4.0</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-mono text-sa-text-muted uppercase tracking-tighter">Luanda, Angola</span>
            <span className="text-[10px] font-mono text-sa-text-dim">© 2024</span>
          </div>
        </footer>

        {/* Global Notifications (Toasts - Super Admin Style) */}
        <div className="fixed right-6 flex flex-col gap-3 z-50 bottom-6">
          {notifications.map((n) => (
            <div 
              key={n.id}
              className={`
                flex items-center gap-4 p-4 bg-sa-surface rounded-xl shadow-2xl border min-w-[320px] animate-slide-in-right
                ${n.type === 'success' ? 'border-sa-primary/50 text-white' : ''}
                ${n.type === 'error' ? 'border-sa-destructive/50 text-white' : ''}
                ${n.type === 'warning' ? 'border-sa-warning/50 text-white' : ''}
                ${n.type === 'info' ? 'border-sa-info/50 text-white' : ''}
              `}
            >
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[10px] text-sa-text-muted uppercase mb-1">{n.type}</p>
                <p className="text-sm text-white/90">{n.message}</p>
              </div>
              <button 
                onClick={() => dismissNotification(n.id)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-sa-text-muted hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
