import { CheckIcon } from 'lucide-react';
import { MANAGER } from '../../data/schedule';
import { PanelHeading, SettingsSection } from './SettingsSection';

const PREFERENCES = [
{ id: 'deferral', label: 'Deferral alerts', description: 'When an order is moved to a later run' },
{ id: 'eta', label: 'ETA updates', description: 'When a vehicle is loading or its arrival time changes' },
{ id: 'delivered', label: 'Delivery arrived', description: 'When the driver marks an order delivered' },
{ id: 'cutoff', label: 'Cutoff reminder', description: 'At 3:00 PM if you haven’t placed a Fresh order' }];

export function NotificationsPanel({ prefs, onToggle, live = false, email }: {prefs: Record<string, boolean>;onToggle: (id: string) => void;live?: boolean;email?: string;}) {
  return (
    <>
      <PanelHeading title="Notifications" subtitle="Choose what needs your attention at the outlet." />
      <SettingsSection title="Order updates">
        <ul className="divide-y divide-line">
          {PREFERENCES.map((item) => <NotificationRow key={item.id} {...item} description={live && item.id === 'cutoff' ? 'At 3:00 PM before your outlet’s order cutoff' : item.description} on={prefs[item.id]} onToggle={() => onToggle(item.id)} />)}
        </ul>
      </SettingsSection>
      <SettingsSection title="Delivery channel">
        <div className="grid gap-3 sm:grid-cols-2">
          <ChannelOption title="In-app notifications" detail="Delivery updates in Waypoint" selected />
          <ChannelOption title="Email summaries" detail={`Daily summary to ${live ? email ?? 'your account' : MANAGER.email}`} selected />
        </div>
      </SettingsSection>
      {live && <p className="mt-5 text-sm text-subtle">These preferences are saved on this device. Contact your administrator to change notification delivery for your account.</p>}
    </>);

}

export function NotificationRow({ id, label, description, on, onToggle }: {id: string;label: string;description: string;on: boolean;onToggle: () => void;}) {
  return <li className="flex items-center justify-between gap-4 py-4"><div><p id={`pref-${id}`} className="font-medium text-ink">{label}</p><p className="text-sm text-subtle">{description}</p></div><button type="button" role="switch" aria-checked={on} aria-labelledby={`pref-${id}`} onClick={onToggle} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${on ? 'bg-forest' : 'bg-hatch'}`}><span aria-hidden="true" className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-surface shadow-card transition-transform duration-150 ${on ? 'translate-x-5' : 'translate-x-0'}`} /></button></li>;
}

export function ChannelOption({ title, detail, selected }: {title: string;detail: string;selected: boolean;}) {
  return <div className="flex items-start gap-3 rounded-xl border border-line bg-surface p-4"><span className={`mt-0.5 grid h-5 w-5 place-items-center rounded-full ${selected ? 'bg-forest text-white' : 'border border-line'}`}>{selected && <CheckIcon className="h-3 w-3" strokeWidth={3} />}</span><span><span className="block font-medium text-ink">{title}</span><span className="mt-1 block text-sm text-subtle">{detail}</span></span></div>;
}
