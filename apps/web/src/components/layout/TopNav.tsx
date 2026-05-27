import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { getSiblingItems } from '../../lib/navigation';
import { useAuthStore } from '../../stores/auth.store';

export function TopNav() {
  const location = useLocation();
  const { utilizador } = useAuthStore();
  
  const siblingItems = getSiblingItems(location.pathname, utilizador?.papel);
  
  // Não renderizar nada se não houver itens irmãos
  if (!siblingItems || siblingItems.length === 0) {
    return null;
  }
  
  return (
    <div className="flex items-center justify-end gap-1 bg-white border-b border-[#e5e5e5] px-4 py-0.5 overflow-x-auto">
      {siblingItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `
            px-4 py-0.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
            ${isActive
              ? 'border-[#1a1a1a] text-[#1a1a1a]'
              : 'border-transparent text-[#737373] hover:text-[#1a1a1a] hover:border-[#d4d4d4]'
            }
          `}
        >
          {item.label}
        </NavLink>
      ))}
    </div>
  );
}
