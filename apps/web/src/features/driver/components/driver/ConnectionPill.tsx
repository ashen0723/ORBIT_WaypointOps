import { WifiIcon, WifiOffIcon } from 'lucide-react';
import type { ConnectionState } from '../../types/driver';

export function ConnectionPill({ connection }: {connection: ConnectionState;}) {
  const offline = connection === 'offline';
  return (
    <span className={`inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-xs font-semibold ${offline ? 'bg-amber-pale text-amber-ink' : 'bg-brand-pale text-forest'}`}>
      {offline ? <WifiOffIcon aria-hidden className="h-4 w-4" /> : <WifiIcon aria-hidden className="h-4 w-4" />}
      {offline ? 'Offline' : connection === 'syncing' ? 'Syncing' : 'Online'}
    </span>);

}