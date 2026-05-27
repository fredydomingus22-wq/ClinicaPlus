import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { X, ChevronDown, LogOut } from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store';
import { NAV_CONFIG, getParentGroupId } from '../../lib/navigation';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const { utilizador, clear } = useAuthStore();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const papel = utilizador?.papel;
  const links = papel ? NAV_CONFIG.filter(item => item.roles.includes(papel)) : [];

  // Determinar quais grupos devem estar expandidos baseado na rota atual
  React.useEffect(() => {
    if (!papel || !isOpen) return;
    const currentPath = window.location.pathname;
    const parentGroupId = getParentGroupId(currentPath, papel);
    
    if (parentGroupId) {
      setExpandedGroups(prev => new Set([...prev, parentGroupId]));
    }
  }, [papel, isOpen]);

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
    onClose();
  };

  const handleNavClick = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-50 md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-white z-50 md:hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-neutral-200 shrink-0">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="DocAgen" className="h-8 w-8 object-contain" />
            <span className="font-black text-base tracking-tight text-neutral-900 font-mono uppercase">
              DocAgen
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {links.map((item) => {
            const hasChildren = item.children && item.children.length > 0;
            const isExpanded = expandedGroups.has(item.groupId || '');
            const isPlaceholder = item.to === '#';
            
            return (
              <div key={item.to}>
                {/* Item com ou sem filhos */}
                {isPlaceholder ? (
                  <button
                    onClick={() => hasChildren && toggleGroup(item.groupId || '')}
                    className="w-full flex items-center px-3 py-3 transition-colors duration-150 group font-medium text-sm text-neutral-700 hover:bg-neutral-50 rounded-lg min-h-[48px]"
                  >
                    <item.icon className="h-5 w-5 shrink-0 mr-3 text-neutral-500" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {hasChildren && (
                      <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    )}
                  </button>
                ) : (
                  <NavLink
                    to={item.to}
                    onClick={handleNavClick}
                    className={({ isActive }) => `
                      flex items-center px-3 py-3 transition-colors duration-150 group font-medium text-sm rounded-lg min-h-[48px]
                      ${isActive 
                        ? 'bg-neutral-900 text-white' 
                        : 'text-neutral-700 hover:bg-neutral-50'
                      }
                    `}
                  >
                    <item.icon className="h-5 w-5 shrink-0 mr-3 text-current" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {hasChildren && (
                      <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    )}
                  </NavLink>
                )}
                
                {/* Filhos do item (expandidos/colapsados) */}
                {isExpanded && hasChildren && (
                  <div className="ml-4 mt-1 space-y-1">
                    {item.children?.map((child) => {
                      const childHasChildren = child.children && child.children.length > 0;
                      const childIsExpanded = expandedGroups.has(child.groupId || '');
                      const childIsPlaceholder = child.to === '#';
                      
                      return (
                        <div key={child.to}>
                          {childIsPlaceholder ? (
                            <button
                              onClick={() => childHasChildren && toggleGroup(child.groupId || '')}
                              className="w-full flex items-center px-3 py-3 transition-colors duration-150 group font-medium text-sm text-neutral-700 hover:bg-neutral-50 rounded-lg min-h-[48px]"
                            >
                              <child.icon className="h-5 w-5 shrink-0 mr-3 text-neutral-500" />
                              <span className="flex-1 text-left">{child.label}</span>
                              {childHasChildren && (
                                <ChevronDown className={`h-4 w-4 transition-transform ${childIsExpanded ? 'rotate-180' : ''}`} />
                              )}
                            </button>
                          ) : (
                            <NavLink
                              to={child.to}
                              onClick={handleNavClick}
                              className={({ isActive }) => `
                                flex items-center px-3 py-3 transition-colors duration-150 group font-medium text-sm rounded-lg min-h-[48px]
                                ${isActive 
                                  ? 'bg-neutral-900 text-white' 
                                  : 'text-neutral-700 hover:bg-neutral-50'
                                }
                              `}
                            >
                              <child.icon className="h-5 w-5 shrink-0 mr-3 text-current" />
                              <span className="flex-1 text-left">{child.label}</span>
                              {childHasChildren && (
                                <ChevronDown className={`h-4 w-4 transition-transform ${childIsExpanded ? 'rotate-180' : ''}`} />
                              )}
                            </NavLink>
                          )}
                          
                          {/* Netos */}
                          {childIsExpanded && childHasChildren && (
                            <div className="ml-4 mt-1 space-y-1">
                              {child.children?.map((grandchild) => (
                                <NavLink
                                  key={grandchild.to}
                                  to={grandchild.to}
                                  onClick={handleNavClick}
                                  className={({ isActive }) => `
                                    flex items-center px-3 py-3 transition-colors duration-150 group font-medium text-sm rounded-lg min-h-[48px]
                                    ${isActive 
                                      ? 'bg-neutral-900 text-white' 
                                      : 'text-neutral-700 hover:bg-neutral-50'
                                    }
                                  `}
                                >
                                  <grandchild.icon className="h-5 w-5 shrink-0 mr-3 text-current" />
                                  <span className="flex-1 text-left">{grandchild.label}</span>
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
        </nav>

        {/* Footer - User Info & Logout */}
        <div className="p-4 border-t border-neutral-200 space-y-3 shrink-0">
          <div className="px-3 py-3 bg-neutral-50 border border-neutral-200 flex items-center gap-3 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-900 text-sm font-bold font-mono border border-neutral-300">
              {utilizador?.nome[0]}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-neutral-900 truncate leading-none mb-1 font-mono">{utilizador?.nome}</p>
              <p className="text-xs text-neutral-500 uppercase tracking-widest font-black font-mono leading-none">{papel?.toLowerCase()}</p>
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            className="w-full flex items-center px-3 py-3 transition-colors text-neutral-700 hover:text-red-600 hover:bg-red-50 font-medium text-sm rounded-lg min-h-[48px]"
          >
            <LogOut className="h-5 w-5 shrink-0 mr-3" />
            <span>Sair da conta</span>
          </button>
        </div>
      </aside>
    </>
  );
}
