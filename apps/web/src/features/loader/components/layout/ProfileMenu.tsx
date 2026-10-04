import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LogOutIcon } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { LOADER_OPERATOR } from '../../data/loader';
export function ProfileMenu({
  onSignOut


}: {onSignOut: () => void;}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return <div ref={ref} className="relative hidden md:block">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="true" aria-label={`Account menu for ${LOADER_OPERATOR.name}`} className="flex items-center gap-3 rounded-full p-0.5 text-left transition-colors duration-150 hover:bg-surface/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand lg:pr-4">
        <Avatar name={LOADER_OPERATOR.name} />
        <span className="hidden lg:block">
          <span className="block text-sm font-semibold text-ink">{LOADER_OPERATOR.name}</span>
          <span className="block text-xs text-subtle">{LOADER_OPERATOR.role} · Peliyagoda</span>
        </span>
      </button>
      <AnimatePresence>
        {open && <motion.div initial={{
        opacity: 0,
        y: -4,
        scale: 0.98
      }} animate={{
        opacity: 1,
        y: 0,
        scale: 1
      }} exit={{
        opacity: 0,
        y: -4,
        scale: 0.98
      }} transition={{
        duration: 0.16,
        ease: [0.23, 1, 0.32, 1]
      }} className="absolute right-0 top-14 z-40 w-64 origin-top-right rounded-card bg-surface p-2 shadow-pop ring-1 ring-line">
            <div className="px-3 py-2">
              <p className="text-sm font-semibold text-ink">{LOADER_OPERATOR.name}</p>
              <p className="text-xs text-subtle">{LOADER_OPERATOR.role} · Peliyagoda Depot</p>
            </div>
            <button type="button" onClick={() => {
          setOpen(false);
          onSignOut();
        }} className="flex h-10 w-full items-center gap-2 rounded-full px-3 text-sm text-danger-ink transition-colors duration-150 hover:bg-danger-pale">
              <LogOutIcon aria-hidden="true" className="h-4 w-4" />
              Sign out
            </button>
          </motion.div>}
      </AnimatePresence>
    </div>;
}