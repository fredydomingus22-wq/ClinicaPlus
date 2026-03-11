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
    { to: '/superadmin', icon: Terminal, label: 'Overview' },
    { to: '/superadmin/clinicas', icon: Building2, label: 'Tenant Control' },
    { to: '/superadmin/users', icon: Users, label: 'Global Users' },
    { to: '/superadmin/logs', icon: Activity, label: 'System Logs' },
    { to: '/superadmin/settings', icon: Settings, label: 'Config' },
  ];

  return (
    <div className="superadmin-theme flex h-screen w-full bg-sa-background text-sa-text font-sans antialiased overflow-hidden selection:bg-sa-primary/30 selection:text-white">
      
      {/* Sidebar minimalista (brutalista) */}
      <aside className="w-[64px] border-r border-white/5 bg-sa-background flex flex-col items-center py-6 z-20 shadow-2xl relative">
        <div className="w-10 h-10 rounded bg-sa-primary/10 border border-sa-primary/30 flex items-center justify-center mb-8 shrink-0">
          <Terminal className="w-5 h-5 text-sa-primary" />
        </div>

        <nav className="flex-1 flex flex-col gap-4 w-full">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/superadmin'}
              title={item.label}
              className={({ isActive }) => `
                relative w-full h-12 flex items-center justify-center group transition-colors duration-200
                ${isActive ? 'text-sa-primary' : 'text-sa-text-muted hover:text-white hover:bg-white/5'}
              `}
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-sa-primary shadow-[0_0_10px_color-mix(in_srgb,var(--sa-primary),transparent_20%)] rounded-r-full" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-4 w-full items-center">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sa-primary to-sa-background border border-sa-border flex items-center justify-center text-xs font-bold uppercase" title={utilizador?.nome}>
            {utilizador?.nome.charAt(0)}
          </div>
          <button
            onClick={handleLogout}
            title="Terminar Sessão"
            className="w-full h-12 flex items-center justify-center text-sa-text-muted hover:text-sa-destructive hover:bg-sa-destructive/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </aside>

      {/* Área Central (Data View) */}
      <div className="flex-1 flex flex-col min-w-0 bg-sa-surface relative overflow-hidden">
        {/* Topbar: Ticker Data & Command Trigger */}
        <header className="h-[56px] border-b border-white/5 bg-sa-background/50 backdrop-blur-md flex items-center justify-between px-6 z-10 shrink-0">
          <StatTicker />
          <CommandPalette />
        </header>
        
        {/* Onde as sub-rotas são injetadas */}
        <main className="flex-1 overflow-y-auto w-full relative">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
          <Outlet />
        </main>

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
