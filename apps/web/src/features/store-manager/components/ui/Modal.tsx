import { ReactNode, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { XIcon } from 'lucide-react';

interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}

const EASE = [0.23, 1, 0.32, 1] as const;

export function Modal({ open, title, description, onClose, children }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const t = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>('select, textarea, input, button:not([data-close])')?.focus();
    }, 50);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(t);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open &&
      <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <motion.div
          aria-hidden="true"
          className="absolute inset-0 bg-black/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: EASE }}
          onClick={onClose} />
        
          <motion.div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className="relative max-h-[90vh] w-full overflow-y-auto rounded-t-panel bg-surface p-6 shadow-pop sm:max-w-lg sm:rounded-card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.22, ease: EASE }}>
          
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <h2 id="modal-title" className="text-lg font-semibold text-ink">
                  {title}
                </h2>
                {description && <p className="mt-1 text-sm text-subtle">{description}</p>}
              </div>
              <button
              type="button"
              data-close
              onClick={onClose}
              aria-label="Close"
              className="-mr-2 -mt-1 grid h-9 w-9 place-items-center rounded-lg text-subtle transition-colors duration-150 hover:bg-canvas hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
              
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-6">{children}</div>
          </motion.div>
        </div>
      }
    </AnimatePresence>);

}