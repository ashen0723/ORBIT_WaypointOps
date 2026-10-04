import type { LucideIcon } from 'lucide-react';
import { CheckIcon, Clock3Icon, TriangleAlertIcon } from 'lucide-react';
import type { SyncState } from '../../types/driver';

const CONFIG = {
  Pending: { icon: Clock3Icon, className: 'text-amber-ink' },
  Syncing: { icon: Clock3Icon, className: 'text-amber-ink' },
  Failed: { icon: TriangleAlertIcon, className: 'text-danger-ink' },
  Conflict: { icon: TriangleAlertIcon, className: 'text-danger-ink' },
  'Demo only': { icon: TriangleAlertIcon, className: 'text-amber-ink' },
  Synced: { icon: CheckIcon, className: 'text-forest' },
  'Saved on phone': { icon: Clock3Icon, className: 'text-amber-ink' },
  'Needs attention': { icon: TriangleAlertIcon, className: 'text-danger-ink' }
} satisfies Record<SyncState, {icon: LucideIcon;className: string;}>;

export function SyncIndicator({ state }: {state: SyncState;}) {
  const config = CONFIG[state];
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${config.className}`}>
      <Icon aria-hidden className="h-3.5 w-3.5" />
      {state}
    </span>);

}