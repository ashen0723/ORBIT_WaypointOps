import { BellRingIcon, ShieldCheckIcon, UserRoundIcon } from 'lucide-react';
import { Card } from '../ui/Card';

export type SettingsTab = 'profile' | 'security' | 'notifications';

const TABS: {id: SettingsTab;label: string;Icon: typeof UserRoundIcon;}[] = [
{ id: 'profile', label: 'Profile', Icon: UserRoundIcon },
{ id: 'security', label: 'Security', Icon: ShieldCheckIcon },
{ id: 'notifications', label: 'Notifications', Icon: BellRingIcon }];

export function SettingsNavigation({ active, onChange }: {active: SettingsTab;onChange: (tab: SettingsTab) => void;}) {
  return (
    <>
      <Card className="hidden h-fit p-3 lg:block">
        <nav aria-label="Profile settings">
          <ul className="space-y-1">
            {TABS.map(({ id, label, Icon }) =>
            <li key={id}>
                <button
                type="button"
                onClick={() => onChange(id)}
                aria-current={active === id ? 'page' : undefined}
                className={`flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                active === id ? 'bg-brand-pale font-semibold text-forest' : 'text-subtle hover:bg-canvas hover:text-ink'}`
                }>
                
                  <Icon aria-hidden="true" className="h-4 w-4" />
                  {label}
                </button>
              </li>
            )}

          </ul>
        </nav>
      </Card>

      <nav aria-label="Profile settings" className="-mx-4 overflow-x-auto px-4 lg:hidden">
        <div className="inline-flex min-w-max gap-2 rounded-full bg-surface p-1 shadow-card">
          {TABS.map(({ id, label, Icon }) =>
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-current={active === id ? 'page' : undefined}
            className={`flex h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
            active === id ? 'bg-forest text-white' : 'text-subtle hover:text-ink'}`
            }>
            
              <Icon aria-hidden="true" className="h-4 w-4" />
              {label}
            </button>
          )}
        </div>
      </nav>
    </>);

}
