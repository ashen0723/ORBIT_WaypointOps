import { motion, useReducedMotion } from 'framer-motion';
import { TriangleAlertIcon } from 'lucide-react';
import { Button } from '../ui/Button';

export function ConflictDialog({ onAcknowledge, message }: {onAcknowledge: () => void; message: string;}) {
  const reduceMotion = useReducedMotion();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-6">
      <motion.div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="conflict-title"
        aria-describedby="conflict-body"
        initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-md rounded-panel border-2 border-danger bg-surface p-6 shadow-pop">
        
        <span className="grid h-12 w-12 place-items-center rounded-full bg-danger-pale text-danger-ink"><TriangleAlertIcon aria-hidden className="h-6 w-6" /></span>
        <h2 id="conflict-title" className="mt-4 text-xl font-bold text-ink">Route changed while offline</h2>
        <p id="conflict-body" className="mt-2 text-sm leading-6 text-subtle">{message}</p>
        <Button size="lg" fullWidth className="mt-6" onClick={onAcknowledge} autoFocus>Understood</Button>
      </motion.div>
    </div>);

}