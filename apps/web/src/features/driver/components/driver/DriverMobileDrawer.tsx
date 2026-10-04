import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { XIcon } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { DriverLogo } from './DriverLogo';
import { DriverNav } from './DriverNav';
import { DriverProfileSummary } from './DriverProfileSummary';
import { SidebarStatusCard } from './SidebarStatusCard';

interface DriverMobileDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function DriverMobileDrawer({ open, onClose }: DriverMobileDrawerProps) {
  const reduceMotion = useReducedMotion();
  const location = useLocation();
  const previousPath = useRef(location.pathname);

  useEffect(() => {
    if (previousPath.current !== location.pathname) onClose();
    previousPath.current = location.pathname;
  }, [location.pathname, onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose, open]);

  return (
    <AnimatePresence>
      {open &&
      <div className="fixed inset-0 z-50 md:hidden">
          <motion.button
          type="button"
          aria-label="Close navigation"
          className="absolute inset-0 h-full w-full bg-ink/45"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
          onClick={onClose} />
        
          <motion.aside
          role="dialog"
          aria-modal="true"
          aria-label="Driver navigation"
          initial={reduceMotion ? false : { x: '-100%' }}
          animate={{ x: 0 }}
          exit={{ x: '-100%' }}
          transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
          className="absolute inset-y-0 left-0 flex w-[320px] max-w-[88vw] flex-col overflow-y-auto rounded-r-panel bg-canvas p-5 shadow-pop">
          
            <div className="flex items-center justify-between gap-3">
              <DriverLogo />
              <button type="button" onClick={onClose} autoFocus aria-label="Close menu" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-surface text-ink shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"><XIcon aria-hidden className="h-5 w-5" /></button>
            </div>
            <div className="mt-8"><DriverNav variant="sidebar" /></div>
            <div className="mt-auto space-y-4 pt-8"><DriverProfileSummary /><SidebarStatusCard /></div>
          </motion.aside>
        </div>
      }
    </AnimatePresence>);

}