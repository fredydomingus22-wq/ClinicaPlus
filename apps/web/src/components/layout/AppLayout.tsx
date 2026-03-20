import React from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useUIStore } from '../../stores/ui.store';
import { useAuthStore } from '../../stores/auth.store';
import { Outlet, NavLink } from 'react-router-dom';
import { 
  CheckCircle2, 
  AlertCircle, 
  Bell, 
  X
} from 'lucide-react';
import { getNavItems, type NavItem } from '../../lib/navigation';
import { SubscricaoStatusBanner } from '../PlanGate';

interface AppLayoutProps {
  children?: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { notifications, dismissNotification } = useUIStore();
  const { utilizador } = useAuthStore();
  
  const bottomLinks = getNavItems(utilizador?.papel)
    .filter((item: NavItem) => item.priority)
    .slice(0, 5)
    .map((item: NavItem) => ({
      ...item,
      // Special handling for the middle/primary button
      isPrimary: item.to.includes('agendar') || item.to.includes('hoje')
    }));

  return (
    <div className="flex h-screen bg-[#fafafa] overflow-hidden font-sans text-[#1a1a1a] antialiased relative print:block print:h-auto print:overflow-visible">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative print:block print:h-auto print:overflow-visible">
        <TopBar />
        <SubscricaoStatusBanner />
        
        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 md:py-8 bg-[#fafafa] pb-24 md:pb-10 print:block print:h-auto print:overflow-visible print:p-0 print:bg-none">
          <div className="max-w-page mx-auto">
            {children || <Outlet />}
          </div>
        </main>
      </div>

      {/* Global Mobile Bottom Navigation Wrapper */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#e5e5e5] pb-safe z-40">
        <div className="flex items-center justify-around px-2 h-14">
          {bottomLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `
                flex flex-col items-center justify-center w-full h-full relative group
                ${isActive ? 'text-[#1a1a1a]' : 'text-[#737373] hover:text-[#1a1a1a]'}
                ${link.isPrimary ? '-mt-6' : 'space-y-1'}
              `}
            >
              {({ isActive }) => (
                <>
                  {link.isPrimary ? (
                    <div className="h-12 w-12 bg-[#1a1a1a] text-white flex items-center justify-center ring-4 ring-[#fafafa] transition-colors active:bg-black">
                      <link.icon className="h-5 w-5" />
                    </div>
                  ) : (
                    <>
                      <link.icon className={`h-4 w-4 transition-colors ${isActive ? '' : 'group-active:opacity-70'}`} />
                      <span className="text-[9px] font-bold font-mono uppercase tracking-wide text-center truncate w-full px-1">{link.label}</span>
                      {isActive && <span className="absolute top-0 w-8 h-0.5 bg-[#1a1a1a]" />}
                    </>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Global Notifications (Toasts) */}
      <div className="fixed right-6 flex flex-col gap-3 z-50 bottom-20 md:bottom-6">
        {notifications.map((n) => (
          <div 
            key={n.id}
            className={`
              flex items-center gap-3 p-4 bg-white border border-[#e5e5e5] min-w-[300px] animate-slide-in-right
              ${n.type === 'success' ? 'border-l-[3px] border-l-[#166534]' : ''}
              ${n.type === 'error' ? 'border-l-[3px] border-l-[#991b1b]' : ''}
              ${n.type === 'warning' ? 'border-l-[3px] border-l-[#b45309]' : ''}
              ${n.type === 'info' ? 'border-l-[3px] border-l-[#1e40af]' : ''}
            `}
          >
            <div className={`w-8 h-8 flex items-center justify-center shrink-0 ${
              n.type === 'success' ? 'bg-[#f0fdf4] text-[#166534]' : 
              n.type === 'error' ? 'bg-[#fef2f2] text-[#991b1b]' : 
              n.type === 'warning' ? 'bg-[#fffbeb] text-[#b45309]' : 
              'bg-[#eff6ff] text-[#1e40af]'
            }`}>
              {n.type === 'success' && <CheckCircle2 className="w-4 h-4" />}
              {n.type === 'error' && <AlertCircle className="w-4 h-4" />}
              {n.type === 'warning' && <AlertCircle className="w-4 h-4" />}
              {n.type === 'info' && <Bell className="w-4 h-4" />}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-[#1a1a1a] leading-tight mb-0.5 font-mono uppercase tracking-wide">{n.type}</p>
              <p className="text-[12px] text-[#737373] line-clamp-2 leading-relaxed">{n.message}</p>
            </div>
            
            <button 
              onClick={() => dismissNotification(n.id)}
              className="w-6 h-6 flex items-center justify-center text-[#a3a3a3] hover:text-[#1a1a1a] hover:bg-[#f5f5f5] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
