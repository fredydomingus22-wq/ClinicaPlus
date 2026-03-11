import React from 'react';
import { X } from 'lucide-react';

interface SlidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function SlidePanel({ isOpen, onClose, title, subtitle, children }: SlidePanelProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-lg h-full bg-sa-surface border-l border-white/10 shadow-2xl flex flex-col animate-slide-in-right">
        <header className="px-6 py-5 border-b border-white/5 flex items-start justify-between shrink-0 bg-white/5">
          <div>
            <h2 className="text-xl font-display font-medium text-white">{title}</h2>
            {subtitle && <p className="text-sa-text-muted font-mono text-xs mt-1">{subtitle}</p>}
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded hover:bg-white/10 text-sa-text-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </header>
        
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
