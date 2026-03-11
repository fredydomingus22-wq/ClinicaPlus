import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  ChevronLeft, 
  ShieldCheck,
  LogOut
} from 'lucide-react';
import { useUIStore } from '../../stores/ui.store';
import { useAuthStore } from '../../stores/auth.store';
import { getNavItems } from '../../lib/navigation';

export function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { utilizador, clear } = useAuthStore();

  const papel = utilizador?.papel;
  const links = getNavItems(papel);

  const handleLogout = () => {
    clear();
  };

  return (
    <aside 
      className={`
        hidden md:flex bg-white border-r border-[#e5e5e5] text-[#404040] transition-all duration-200 flex-col z-30 relative
        ${sidebarOpen ? 'w-[240px]' : 'w-[64px]'}
      `}
    >
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-[#e5e5e5] shrink-0">
        <div className="bg-[#1a1a1a] p-1.5 mr-3 shrink-0 flex items-center justify-center">
          <ShieldCheck className="h-4 w-4 text-white" />
        </div>
        {sidebarOpen && (
          <span className="font-black text-sm tracking-tight whitespace-nowrap text-[#1a1a1a] font-mono uppercase">
            ClinicaPlus
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto pt-4 px-2 space-y-0.5">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => `
              flex items-center px-3 py-2 transition-colors duration-150 group font-medium text-[13px]
              ${isActive 
                ? 'bg-[#1a1a1a] text-white' 
                : 'text-[#737373] hover:text-[#1a1a1a] hover:bg-[#f5f5f5]'
              }
            `}
            title={!sidebarOpen ? link.label : undefined}
          >
            <link.icon className={`h-4 w-4 shrink-0 transition-colors ${sidebarOpen ? 'mr-3' : 'mx-auto'}`} />
            {sidebarOpen && <span className="text-[13px] truncate">{link.label}</span>}
            {!sidebarOpen && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-[#1a1a1a] text-white text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 font-mono">
                {link.label}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer Info & Logout */}
      <div className="p-3 border-t border-[#e5e5e5] space-y-1">
        {sidebarOpen && (
          <div className="px-3 py-3 bg-[#f9f9f9] border border-[#e5e5e5] flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-[#e5e5e5] flex items-center justify-center text-[#1a1a1a] text-xs font-bold font-mono border border-[#d4d4d4]">
              {utilizador?.nome[0]}
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-bold text-[#1a1a1a] truncate leading-none mb-1 font-mono">{utilizador?.nome}</p>
              <p className="text-[10px] text-[#525252] uppercase tracking-widest font-black font-mono leading-none">{papel?.toLowerCase()}</p>
            </div>
          </div>
        )}
        
        <button 
          onClick={handleLogout}
          className={`
            w-full flex items-center py-2 transition-colors text-[#737373] hover:text-[#991b1b] hover:bg-[#fef2f2] font-medium text-[13px]
            ${sidebarOpen ? 'px-3' : 'px-0 justify-center'}
          `}
          title={!sidebarOpen ? "Sair da conta" : undefined}
        >
          <LogOut className={`h-4 w-4 shrink-0 ${sidebarOpen ? 'mr-3' : ''}`} />
          {sidebarOpen && <span className="text-[13px]">Sair da conta</span>}
        </button>

        <button 
          onClick={toggleSidebar}
          className={`
            absolute -right-3 top-20 w-6 h-6 bg-white border border-[#e5e5e5] flex items-center justify-center text-[#737373] hover:text-[#1a1a1a] transition-colors duration-150 z-40
            ${!sidebarOpen ? 'rotate-180' : ''}
          `}
          aria-label={sidebarOpen ? "Recolher menu" : "Expandir menu"}
        >
          <ChevronLeft className="w-3 h-3" />
        </button>
      </div>
    </aside>
  );
}
