import React from 'react';

interface TabItem {
  id: string;
  label: string;
}

interface TabsProps {
  items: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ items, activeTab, onChange, className = '' }: TabsProps) {
  return (
    <div className={`overflow-x-auto overflow-y-hidden whitespace-nowrap scrollbar-hide flex items-center ${className}`}>
      <div className="flex items-center min-w-full">
        {items.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={`
                px-4 py-2 text-[11px] font-bold uppercase tracking-[0.15em] font-mono transition-colors shrink-0
                ${isActive 
                  ? 'text-[#1a1a1a] bg-[#f5f5f5] rounded-lg' 
                  : 'text-[#737373] hover:text-[#1a1a1a] hover:bg-[#f5f5f5]'}
              `}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
