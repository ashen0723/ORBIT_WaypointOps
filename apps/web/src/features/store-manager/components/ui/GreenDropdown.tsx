import { forwardRef, type HTMLAttributes } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

const surface = 'absolute top-full z-50 mt-2 rounded-2xl border border-brand/30 bg-brand-pale shadow-pop';
export const greenDropdownOptionClass = 'flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm text-forest hover:bg-surface focus:bg-surface focus:outline-none aria-selected:font-semibold';

export const GreenDropdownPanel = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function GreenDropdownPanel({ className = '', ...props }, ref) {
    return <div ref={ref} className={`${surface} ${className}`} {...props} />;
  },
);

export function AnimatedGreenDropdownPanel({ className = '', ...props }: HTMLMotionProps<'div'>) {
  return <motion.div initial={{ opacity: 0, y: -4, scale: 0.98 }}
    animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.98 }}
    transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
    className={`${surface} origin-top-right ${className}`} {...props} />;
}
