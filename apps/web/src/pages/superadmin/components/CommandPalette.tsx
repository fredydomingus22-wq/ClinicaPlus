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
        className="flex items-center gap-2 px-3 py-1.5 rounded bg-white/5 border border-white/10 hover:bg-white/10 hover:border-sa-primary/50 text-sm text-sa-text-muted transition-all"
        title="Open Command Palette (Ctrl+K)"
      >
        <Search className="w-4 h-4" />
        <span className="hidden sm:inline">Search namespace...</span>
        <kbd className="hidden sm:flex items-center gap-1 font-mono text-[10px] bg-white/10 px-1.5 py-0.5 rounded ml-2 text-white/70">
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
          <div className="relative w-full max-w-xl bg-sa-surface border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-scale-in">
            <div className="flex items-center px-4 py-3 border-b border-white/10">
              <Search className="w-5 h-5 text-sa-primary mr-3" />
              <input 
                type="text" 
                autoFocus
                placeholder="Jump to clinic, user, or log..."
                className="flex-1 bg-transparent border-none outline-none text-white font-mono text-sm placeholder:text-sa-text-muted"
              />
              <kbd className="font-mono text-[10px] text-sa-text-muted bg-white/5 px-2 py-1 rounded">ESC</kbd>
            </div>

            <div className="p-2 max-h-[60vh] overflow-y-auto">
              {/* Example Categories */}
              <div className="px-3 py-2 text-[10px] font-bold tracking-wider text-sa-text-muted uppercase">
                Quick Actions
              </div>
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-left group">
                <Building2 className="w-4 h-4 text-sa-text-muted group-hover:text-sa-primary" />
                <span className="text-sm font-medium">Add New Tenant</span>
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-left group">
                <Users className="w-4 h-4 text-sa-text-muted group-hover:text-sa-primary" />
                <span className="text-sm font-medium">Manage Super Users</span>
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-left group">
                <Activity className="w-4 h-4 text-sa-text-muted group-hover:text-sa-primary" />
                <span className="text-sm font-medium">View System Logs</span>
              </button>
            </div>
            
            <div className="px-4 py-2 bg-white/5 border-t border-white/5 text-xs text-sa-text-muted flex justify-between">
              <span>Super Admin Command Center</span>
              <span>v1.0.0</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
