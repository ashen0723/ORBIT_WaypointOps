import React, { ReactNode, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { XIcon } from 'lucide-react';

interface DrawerProps {
  open: boolean;
  title: string;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

const EASE = [0.23, 1, 0.32, 1] as const;

export function Drawer({ open, title, subtitle, onClose, children, footer }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open &&
      <div className="fixed inset-0 z-50">
          <motion.div
          aria-hidden="true"
          className="absolute inset-0 bg-black/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: EASE }}
          onClick={onClose} />
        
          <motion.aside
          role="dialog"
          aria-modal="true"
          aria-labelledby="drawer-title"
          className="absolute inset-y-0 right-0 flex w-full max-w-[560px] flex-col bg-surface shadow-pop sm:inset-y-3 sm:right-3 sm:rounded-card"
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 40, opacity: 0 }}
          transition={{ duration: 0.24, ease: EASE }}>
          
            <header className="flex items-start gap-4 border-b border-line px-5 py-4 md:px-6">
              <div className="min-w-0 flex-1">
                <h2 id="drawer-title" className="text-lg font-semibold text-ink">
                  {title}
                </h2>
                {subtitle && <div className="mt-1 text-sm text-subtle">{subtitle}</div>}
              </div>
              <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-2 grid h-9 w-9 place-items-center rounded-full text-subtle transition-colors duration-150 hover:bg-canvas hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
              
                <XIcon className="h-5 w-5" />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto px-5 py-5 md:px-6">{children}</div>
            {footer && <footer className="flex flex-wrap gap-2 border-t border-line px-5 py-4 md:px-6">{footer}</footer>}
          </motion.aside>
        </div>
      }
    </AnimatePresence>);

}