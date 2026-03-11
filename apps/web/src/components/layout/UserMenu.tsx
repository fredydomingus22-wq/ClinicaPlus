import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Settings, Shield } from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store';
import { Avatar } from '@clinicaplus/ui';

export function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const { utilizador, clear } = useAuthStore();
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    clear();
    navigate('/login');
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U';
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 hover:bg-[#f5f5f5] transition-colors focus:outline-none"
      >
        <Avatar 
          initials={getInitials(utilizador?.nome || '')} 
          size="sm"
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-1 w-52 bg-white border border-[#e5e5e5] py-1 z-50 animate-in fade-in zoom-in duration-150 origin-top-right shadow-lg">
          <div className="px-4 py-3 border-b border-[#e5e5e5] mb-1">
            <p className="text-[11px] font-bold text-[#1a1a1a] truncate tracking-tight font-mono">
              {utilizador?.nome}
            </p>
            <p className="text-[9px] text-[#737373] font-bold uppercase tracking-[0.2em] mt-0.5 font-mono">
              {utilizador?.papel}
            </p>
          </div>

          <button 
            onClick={() => {
              setIsOpen(false);
              const path = utilizador?.papel === 'PACIENTE' ? '/paciente/perfil' : 
                          utilizador?.papel === 'MEDICO' ? '/medico/perfil' : 
                          '/perfil';
              navigate(path);
            }}
            className="w-full flex items-center gap-3 px-4 py-2 text-[12px] font-medium text-[#404040] hover:text-[#1a1a1a] hover:bg-[#f5f5f5] transition-colors"
          >
            <User className="w-3.5 h-3.5" />
            O Meu Perfil
          </button>

          {utilizador?.papel === 'ADMIN' && (
            <button 
              onClick={() => {
                setIsOpen(false);
                navigate('/admin/configuracao');
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-[12px] font-medium text-[#404040] hover:text-[#1a1a1a] hover:bg-[#f5f5f5] transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              Definições
            </button>
          )}

          {utilizador?.papel === 'SUPER_ADMIN' && (
            <button 
              onClick={() => {
                setIsOpen(false);
                navigate('/superadmin');
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-[12px] font-medium text-[#404040] hover:text-[#1a1a1a] hover:bg-[#f5f5f5] transition-colors"
            >
              <Shield className="w-3.5 h-3.5" />
              Super Admin
            </button>
          )}

          <div className="h-px bg-[#e5e5e5] my-1 mx-0" />

          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-[12px] font-medium text-[#991b1b] hover:bg-[#fef2f2] transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sair da Conta
          </button>
        </div>
      )}
    </div>
  );
}
