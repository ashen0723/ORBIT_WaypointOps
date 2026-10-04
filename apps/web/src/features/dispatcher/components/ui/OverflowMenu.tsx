import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MoreHorizontalIcon } from 'lucide-react';

export interface OverflowItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
}

interface OverflowMenuProps {
  label: string;
  items: OverflowItem[];
}

export function OverflowMenu({ label, items }: OverflowMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
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

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="grid h-9 w-9 place-items-center rounded-full text-subtle transition-colors duration-150 hover:bg-canvas hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
        
        <MoreHorizontalIcon className="h-5 w-5" />
      </button>
      <AnimatePresence>
        {open &&
        <motion.div
          role="menu"
          initial={{ opacity: 0, scale: 0.96, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.14, ease: [0.23, 1, 0.32, 1] }}
          className="absolute right-0 top-full z-30 mt-1 min-w-[180px] origin-top-right rounded-2xl bg-surface p-1.5 shadow-pop ring-1 ring-line">
          
            {items.map((item) =>
          <button
            key={item.label}
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              item.onClick();
            }}
            className={`flex h-10 w-full items-center rounded-xl px-3 text-left text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
            item.danger ? 'text-danger-ink hover:bg-danger-pale' : 'text-ink hover:bg-canvas'}`
            }>
            
                {item.label}
              </button>
          )}
          </motion.div>
        }
      </AnimatePresence>
    </div>);

}