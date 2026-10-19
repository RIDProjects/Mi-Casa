import { useEffect, useRef, useState } from 'react';
import React from 'react';
import { X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

export default function Modal({ isOpen, onClose, title, children, size = 'md' }: Props) {
  const titleId  = 'modal-title';
  // Keep the dialog mounted briefly after closing so it can animate out
  const [rendered, setRendered] = useState(isOpen);
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    if (isOpen) { setRendered(true); setClosing(false); return; }
    if (!rendered) return;
    setClosing(true);
    const t = setTimeout(() => { setRendered(false); setClosing(false); }, 260);
    return () => clearTimeout(t);
  }, [isOpen, rendered]);
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => panelRef.current?.focus(), 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onCloseRef.current(); return; }
      if (e.key !== 'Tab') return;
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus(); } }
      else            { if (document.activeElement === last)  { e.preventDefault(); first.focus(); } }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!rendered) return null;

  return (
    <div className="fixed inset-0 z-50 bg-surface-container-lowest/50 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative w-full ${widths[size]} max-h-[90vh] flex flex-col focus:outline-none ${closing ? 'animate-modal-out' : 'animate-fade-in'} bg-surface-container-lowest border border-border-light rounded-2xl shadow-modal overflow-hidden`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-light bg-surface-gray">
          <h2 id={titleId} className="font-section-title text-section-title text-on-surface tracking-tight">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="p-2 hover:bg-surface-variant rounded-full text-outline transition-colors active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
