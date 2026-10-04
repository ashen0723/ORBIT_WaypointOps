import React from 'react';
import { CheckIcon, Clock3Icon, TriangleAlertIcon } from 'lucide-react';
import type { SyncState } from '../../types/driver';

const CONFIG = {
  Synced: { icon: CheckIcon, className: 'text-forest' },
  'Saved on phone': { icon: Clock3Icon, className: 'text-amber-ink' },
  'Needs attention': { icon: TriangleAlertIcon, className: 'text-danger-ink' }
} satisfies Record<SyncState, {icon: React.ComponentType<{className?: string;'aria-hidden'?: boolean;}>;className: string;}>;

export function SyncIndicator({ state }: {state: SyncState;}) {
  const config = CONFIG[state];
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${config.className}`}>
      <Icon aria-hidden className="h-3.5 w-3.5" />
      {state}
    </span>);

}