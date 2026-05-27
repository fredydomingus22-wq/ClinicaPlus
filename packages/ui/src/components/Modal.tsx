import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';
import * as Dialog from '@radix-ui/react-dialog';
import { cn } from '../utils/cn';

interface ModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ isOpen, title, onClose, children, footer, size = 'md' }: ModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  // Focus trap implementation
  useEffect(() => {
    if (!isOpen) return undefined;

    // Save the previously focused element
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Focus the modal content
    setTimeout(() => {
      contentRef.current?.focus();
    }, 100);

    // Trap focus within modal
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = contentRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (!focusableElements || focusableElements.length === 0) return;

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTab);

    return () => {
      document.removeEventListener('keydown', handleTab);
      // Restore focus to previous element
      previousActiveElement.current?.focus();
    };
  }, [isOpen]);

  return (
    <Dialog.Root open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 animate-fade-in" />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
          <Dialog.Content
            ref={contentRef}
            tabIndex={-1}
            className={cn(
              "pointer-events-auto relative bg-white w-full overflow-hidden flex flex-col max-h-[95vh] animate-scale-in border border-[#e5e5e5]",
              sizeClasses[size]
            )}
            aria-describedby={undefined}
          >
            {/* Header */}
            <div className="px-4 py-3 md:px-6 md:py-4 border-b border-[#e5e5e5] flex items-center justify-between bg-[#f9f9f9]">
              <Dialog.Title className="text-sm font-bold text-[#1a1a1a] leading-tight uppercase tracking-wider font-mono">
                {title}
              </Dialog.Title>
              <Dialog.Close asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-[#737373] hover:text-[#1a1a1a] hover:bg-[#f0f0f0]"
                  aria-label="Fechar"
                >
                  <X className="h-4 w-4" />
                </Button>
              </Dialog.Close>
            </div>

            {/* Body */}
            <div className="px-4 py-4 md:px-6 md:py-5 overflow-y-auto">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="px-4 py-3 md:px-6 md:py-4 border-t border-[#e5e5e5] bg-[#f9f9f9] flex justify-end gap-2">
                {footer}
              </div>
            )}
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
