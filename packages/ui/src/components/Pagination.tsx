import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  className = '',
}: PaginationProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  if (totalPages <= 1) return null;

  return (
    <div className={`flex items-center justify-between gap-4 ${className}`}>
      <div className="text-[10px] font-bold text-[#737373] uppercase tracking-[0.15em] font-mono">
        Página <span className="text-[#1a1a1a]">{currentPage}</span> de <span className="text-[#1a1a1a]">{totalPages}</span>
      </div>
      
      <div className="flex items-center gap-1">
        <Button
          variant="secondary"
          size="sm"
          className="h-8 w-8 p-0 border-[#e5e5e5]"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
            const pageNum = i + 1;
            const isActive = pageNum === currentPage;
            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`
                  h-8 min-w-[32px] px-2 text-[11px] font-bold font-mono transition-colors border
                  ${isActive 
                    ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]' 
                    : 'text-[#737373] border-[#e5e5e5] hover:bg-[#f5f5f5] hover:text-[#1a1a1a]'}
                `}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <Button
          variant="secondary"
          size="sm"
          className="h-8 w-8 p-0 border-neutral-200"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
