import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  ChevronLeft, 
  ChevronDown,
  LogOut
} from 'lucide-react';
import { useUIStore } from '../../stores/ui.store';
import { useAuthStore } from '../../stores/auth.store';
import { getFlatNavItems, getParentGroupId } from '../../lib/navigation';

export function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { utilizador, clear } = useAuthStore();
  
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const papel = utilizador?.papel;
  const links = getFlatNavItems(papel);
  
  // Determinar quais grupos devem estar expandidos baseado na rota atual
  React.useEffect(() => {
    const currentPath = window.location.pathname;
    const parentGroupId = getParentGroupId(currentPath, papel);
    
    if (parentGroupId) {
      setExpandedGroups(prev => new Set([...prev, parentGroupId]));
    }
  }, [papel]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const handleLogout = () => {
    clear();
  };

  // Separar itens em grupos e itens individuais
  const groupedItems = links.filter(item => item.children && item.children.length > 0);
  const individualItems = links.filter(item => !item.children || item.children.length === 0);

  return (
    <aside 
      className={`
        hidden md:flex bg-white border-r border-[#e5e5e5] text-[#404040] transition-all duration-200 flex-col z-30 relative
        ${sidebarOpen ? 'w-[240px]' : 'w-[64px]'}
      `}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-[#e5e5e5] shrink-0">
        <div className="mr-3 shrink-0 flex items-center justify-center">
          <img src="/logo.png" alt="DocAgen" className="h-8 w-8 object-contain" />
        </div>
        {sidebarOpen && (
          <span className="font-black text-base tracking-tight whitespace-nowrap text-[#1a1a1a] font-mono uppercase">
            DocAgen
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto pt-4 px-2 space-y-0.5">
        {/* Renderizar grupos colapsáveis */}
        {groupedItems.map((group) => {
          const isExpanded = expandedGroups.has(group.groupId || '');
          const hasChildren = group.children && group.children.length > 0;
          const isPlaceholder = group.to === '#';
          
          return (
            <div key={group.to}>
              {/* Header do grupo */}
              {isPlaceholder ? (
                <button
                  onClick={() => hasChildren && toggleGroup(group.groupId || '')}
                  className={`
                    w-full flex items-center px-3 py-2 transition-colors duration-150 group font-medium text-[13px]
                    ${!hasChildren ? 'text-[#737373] hover:text-[#1a1a1a] hover:bg-[#f5f5f5]' : 'text-[#1a1a1a]'}
                  `}
                  title={!sidebarOpen ? group.label : undefined}
                >
                  <group.icon className={`h-4 w-4 shrink-0 transition-colors ${sidebarOpen ? 'mr-3' : 'mx-auto'}`} />
                  {sidebarOpen && (
                    <>
                      <span className="text-[13px] truncate">{group.label}</span>
                      {hasChildren && (
                        <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      )}
                    </>
                  )}
                  {!sidebarOpen && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-[#1a1a1a] text-white text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 font-mono">
                      {group.label}
                    </div>
                  )}
                </button>
              ) : (
                <NavLink
                  to={group.to}
                  className={({ isActive }) => `
                    flex items-center px-3 py-2 transition-colors duration-150 group font-medium text-[13px]
                    ${isActive 
                      ? 'bg-[#1a1a1a] text-white' 
                      : 'text-[#737373] hover:text-[#1a1a1a] hover:bg-[#f5f5f5]'
                    }
                  `}
                  title={!sidebarOpen ? group.label : undefined}
                >
                  <group.icon className={`h-4 w-4 shrink-0 transition-colors ${sidebarOpen ? 'mr-3' : 'mx-auto'}`} />
                  {sidebarOpen && (
                    <>
                      <span className="text-[13px] truncate flex-1">{group.label}</span>
                      {hasChildren && (
                        <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      )}
                    </>
                  )}
                  {!sidebarOpen && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-[#1a1a1a] text-white text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 font-mono">
                      {group.label}
                    </div>
                  )}
                </NavLink>
              )}
              
              {/* Filhos do grupo (expandidos/colapsados) */}
              {sidebarOpen && isExpanded && hasChildren && (
                <div className="ml-4 space-y-0.5">
                  {group.children?.map((child) => {
                    const childHasChildren = child.children && child.children.length > 0;
                    const childIsExpanded = expandedGroups.has(child.groupId || '');
                    const childIsPlaceholder = child.to === '#';
                    
                    return (
                      <div key={child.to}>
                        {childIsPlaceholder ? (
                          <button
                            onClick={() => childHasChildren && toggleGroup(child.groupId || '')}
                            className={`
                              w-full flex items-center px-3 py-2 transition-colors duration-150 group font-medium text-[13px]
                              ${!childHasChildren ? 'text-[#737373] hover:text-[#1a1a1a] hover:bg-[#f5f5f5]' : 'text-[#1a1a1a]'}
                            `}
                          >
                            <child.icon className="h-4 w-4 shrink-0 mr-3" />
                            <span className="text-[13px] truncate flex-1">{child.label}</span>
                            {childHasChildren && (
                              <ChevronDown className={`h-3 w-3 transition-transform ${childIsExpanded ? 'rotate-180' : ''}`} />
                            )}
                          </button>
                        ) : (
                          <NavLink
                            to={child.to}
                            className={({ isActive }) => `
                              flex items-center px-3 py-2 transition-colors duration-150 group font-medium text-[13px]
                              ${isActive 
                                ? 'bg-[#1a1a1a] text-white' 
                                : 'text-[#737373] hover:text-[#1a1a1a] hover:bg-[#f5f5f5]'
                              }
                            `}
                          >
                            <child.icon className="h-4 w-4 shrink-0 mr-3" />
                            <span className="text-[13px] truncate flex-1">{child.label}</span>
                            {childHasChildren && (
                              <ChevronDown className={`h-3 w-3 transition-transform ${childIsExpanded ? 'rotate-180' : ''}`} />
                            )}
                          </NavLink>
                        )}
                        
                        {/* Netos */}
                        {childIsExpanded && childHasChildren && (
                          <div className="ml-4 space-y-0.5">
                            {child.children?.map((grandchild) => (
                              <NavLink
                                key={grandchild.to}
                                to={grandchild.to}
                                className={({ isActive }) => `
                                  flex items-center px-3 py-2 transition-colors duration-150 group font-medium text-[13px]
                                  ${isActive 
                                    ? 'bg-[#1a1a1a] text-white' 
                                    : 'text-[#737373] hover:text-[#1a1a1a] hover:bg-[#f5f5f5]'
                                  }
                                `}
                              >
                                <grandchild.icon className="h-4 w-4 shrink-0 mr-3" />
                                <span className="text-[13px] truncate">{grandchild.label}</span>
                              </NavLink>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        
        {/* Renderizar itens individuais */}
        {individualItems.map((link) => (
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
