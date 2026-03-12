import React, { useState, useEffect } from 'react';
import { Search, Command, Users, Building2, Activity } from 'lucide-react';

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded bg-white/5 border border-sa-border hover:bg-white/10 hover:border-sa-primary/50 text-sm text-sa-text-muted transition-all"
        title="Abrir Centro de Comando (Ctrl+K)"
      >
        <Search className="w-4 h-4" />
        <span className="hidden sm:inline">Pesquisar no sistema...</span>
        <kbd className="hidden sm:flex items-center gap-1 font-mono text-[10px] bg-white/10 px-1.5 py-0.5 rounded ml-2 text-sa-text-muted">
          <Command className="w-3 h-3" /> K
        </kbd>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsOpen(false)}
          />

          {/* Palette */}
          <div className="relative w-full max-w-xl bg-sa-surface border border-sa-border rounded-xl shadow-2xl overflow-hidden animate-scale-in">
            <div className="flex items-center px-4 py-3 border-b border-sa-border">
              <Search className="w-5 h-5 text-sa-primary mr-3" />
              <input 
                type="text" 
                autoFocus
                placeholder="Ir para clínica, utilizador ou registo..."
                className="flex-1 bg-transparent border-none outline-none text-white font-mono text-sm placeholder:text-sa-text-muted"
              />
              <kbd className="font-mono text-[10px] text-sa-text-dim bg-white/5 px-2 py-1 rounded">ESC</kbd>
            </div>

            <div className="p-2 max-h-[60vh] overflow-y-auto">
              {/* Example Categories */}
              <div className="px-3 py-2 text-[10px] font-bold tracking-wider text-sa-text-dim uppercase">
                Ações Rápidas
              </div>
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-left group">
                <Building2 className="w-4 h-4 text-sa-text-muted group-hover:text-sa-primary" />
                <span className="text-sm font-medium">Registar Nova Clínica</span>
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-left group">
                <Users className="w-4 h-4 text-sa-text-muted group-hover:text-sa-primary" />
                <span className="text-sm font-medium">Gerir Utilizadores Globais</span>
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-left group">
                <Activity className="w-4 h-4 text-sa-text-muted group-hover:text-sa-primary" />
                <span className="text-sm font-medium">Ver Registos do Sistema</span>
              </button>
            </div>
            
            <div className="px-4 py-2 bg-white/5 border-t border-sa-border text-xs text-sa-text-dim flex justify-between">
              <span>Centro de Administração Global</span>
              <span>v2.4.0</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
