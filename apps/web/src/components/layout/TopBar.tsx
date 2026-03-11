import React, { useState } from 'react';
import { Bell, ChevronRight, Home, ShieldCheck } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useUIStore } from '../../stores/ui.store';
import { UserMenu } from './UserMenu';
import { NotificationsPanel } from './NotificationsPanel';
import { useNotificacoes } from '../../hooks/useNotificacoes';

export function TopBar() {
  useUIStore();
  const { unreadCount } = useNotificacoes();
  const [showNotifications, setShowNotifications] = useState(false);
  const location = useLocation();

  const pathnames = location.pathname.split('/').filter((x) => x);

  return (
    <header className="h-14 bg-white border-b border-[#e5e5e5] flex items-center justify-between px-4 md:px-6 sticky top-0 z-40">
      <div className="flex items-center gap-2 md:gap-3 overflow-hidden">
        {/* Mobile Logo Branding */}
        <div className="md:hidden flex items-center mr-2">
          <div className="bg-[#1a1a1a] p-1.5 mr-2">
            <ShieldCheck className="h-4 w-4 text-white" />
          </div>
          <span className="font-black text-sm tracking-tight text-[#1a1a1a] font-mono uppercase">
            ClinicaPlus
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-[#737373] shrink-0">
          <Home className="w-3.5 h-3.5" />
          <ChevronRight className="w-3 h-3 text-[#a3a3a3]" />
        </div>
        
        <nav className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
          {pathnames.map((value, index) => {
            const isLast = index === pathnames.length - 1;
            const to = `/${pathnames.slice(0, index + 1).join('/')}`;

            if (pathnames.length > 1 && index < pathnames.length - 2) {
              return null;
            }

            return isLast ? (
              <span key={to} className="text-[13px] font-bold text-[#1a1a1a] capitalize truncate max-w-[120px] md:max-w-[200px] font-mono">
                {value.replace(/-/g, ' ')}
              </span>
            ) : (
              <React.Fragment key={to}>
                <Link to={to} className="text-[13px] font-medium text-[#737373] hover:text-[#1a1a1a] transition-colors capitalize truncate max-w-[80px] md:max-w-[120px] font-mono">
                  {value.replace(/-/g, ' ')}
                </Link>
                <ChevronRight className="w-3 h-3 text-[#a3a3a3] shrink-0" />
              </React.Fragment>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        {/* Notifications */}
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className={`relative p-2 transition-colors ${showNotifications ? 'bg-[#f5f5f5] text-[#1a1a1a]' : 'text-[#737373] hover:bg-[#f5f5f5]'}`}
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 h-4 min-w-[16px] px-1 bg-[#991b1b] text-white text-[9px] font-black border-2 border-white flex items-center justify-center font-mono">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          
          <NotificationsPanel 
            isOpen={showNotifications} 
            onClose={() => setShowNotifications(false)} 
          />
        </div>

        <div className="hidden md:block h-5 w-px bg-[#e5e5e5] mx-1" />

        {/* User Profile Summary / Menu */}
        <UserMenu />
      </div>
    </header>
  );
}
