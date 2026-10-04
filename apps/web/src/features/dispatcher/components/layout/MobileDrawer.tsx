import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { XIcon } from 'lucide-react';
import { Logo } from './Logo';
import { NextUpCard } from './NextUpCard';
import { HOME_BY_ROLE, navByRole } from '../../data/navigation';
import { ROLE_LABEL } from '../../data/users';
import { useNavCounts } from '../../hooks/useNavCounts';
import { useDispatch } from '../../contexts/DispatchContext';

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
}

const EASE = [0.23, 1, 0.32, 1] as const;

export function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  const counts = useNavCounts();
  const { user } = useDispatch();

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
      <div className="fixed inset-0 z-50 md:hidden">
          <motion.div aria-hidden="true" className="absolute inset-0 bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: EASE }} onClick={onClose} />
          <motion.aside
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className="absolute inset-y-0 left-0 flex w-[300px] max-w-[85vw] flex-col overflow-y-auto rounded-r-panel bg-canvas shadow-pop"
          initial={{ x: '-100%' }}
          animate={{ x: 0 }}
          exit={{ x: '-100%' }}
          transition={{ duration: 0.25, ease: EASE }}>
          
            <div className="flex h-16 shrink-0 items-center justify-between px-4">
              <Logo subtitle={ROLE_LABEL[user.role]} to={HOME_BY_ROLE[user.role]} />
              <button type="button" onClick={onClose} aria-label="Close menu" className="grid h-11 w-11 place-items-center rounded-full text-subtle hover:bg-surface hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <nav aria-label="Main" className="mt-4 px-3">
              <div className="flex flex-col gap-1">
                {navByRole[user.role].map(({ to, label, icon: Icon, end }) => {
                const count = counts[to];
                return (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    onClick={onClose}
                    className={({ isActive }) => `flex h-12 items-center gap-3 rounded-full px-4 text-base transition-colors duration-150 ${isActive ? 'bg-surface font-semibold text-ink' : 'font-medium text-subtle hover:text-ink'}`}>
                    
                      <Icon aria-hidden="true" className="h-5 w-5" />
                      {label}
                      {count && <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${count.tone === 'danger' ? 'bg-danger-pale text-danger-ink' : 'bg-surface text-ink ring-1 ring-line'}`}>{count.value}</span>}
                    </NavLink>);

              })}
              </div>
            </nav>
            {user.role === 'dispatcher' &&
          <div className="mt-auto p-4 pt-8">
                <NextUpCard />
              </div>
          }
          </motion.aside>
        </div>
      }
    </AnimatePresence>);

}