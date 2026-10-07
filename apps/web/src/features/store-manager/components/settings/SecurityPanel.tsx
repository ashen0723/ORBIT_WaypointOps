import { toast } from 'sonner';
import { KeyRoundIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { MANAGER, OUTLET_NAME } from '../../data/schedule';
import { PanelHeading, SettingsSection } from './SettingsSection';

export function SecurityPanel({ live = false, outlet }: { live?: boolean; outlet?: string }) {
  return (
    <>
      <PanelHeading title="Security" subtitle="Keep your Waypoint account and outlet data secure." />
      <SettingsSection title="Password">
        <p className="text-sm text-subtle">{live ? 'Use a strong, unique password for your manager account.' : 'Last changed 17 days ago. Use a strong, unique password for your manager account.'}</p>
        <Button variant="outline" size="md" className="mt-4" onClick={() => live ? toast('Contact your administrator to change your password.') : toast('Password reset link sent', { description: `A secure reset link was sent to ${MANAGER.email}.` })}>
          <KeyRoundIcon aria-hidden="true" className="h-4 w-4" />Change password
        </Button>
      </SettingsSection>
      <SettingsSection title="Active sessions">
        <div className="flex items-center justify-between gap-4 rounded-xl bg-canvas px-4 py-3">
          <div>
            <p className="font-medium text-ink">This device</p>
            <p className="text-sm text-subtle">{live ? outlet ?? 'Your outlet' : OUTLET_NAME} · Active now</p>
          </div>
          <span className="rounded-full bg-brand-pale px-3 py-1 text-xs font-semibold text-forest">Current</span>
        </div>
      </SettingsSection>
    </>);

}
