import { SettingsNavigation, type SettingsTab } from '../components/settings/SettingsNavigation';
import { LiveProfilePanel, ProfilePanel } from '../components/settings/ProfilePanel';
import { SecurityPanel } from '../components/settings/SecurityPanel';
import { NotificationsPanel } from '../components/settings/NotificationsPanel';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { MANAGER, OUTLET_NAME } from '../data/schedule';
import { useScreenInit } from '../useScreenInit.js';
import { useAuth } from '../../../app/providers/AuthProvider';
import { useOrders } from '../contexts/OrdersContext';

export function Settings() {
  const { live, store } = useOrders();
  const { user } = useAuth();
  const screenInit = useScreenInit();
  const initialTab: SettingsTab = ['profile', 'security', 'notifications'].includes(screenInit.active ?? 'profile') ? (screenInit.active ?? 'profile') : 'profile';
  const [active, setActive] = useState<SettingsTab>(initialTab);
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState({
    firstName: 'Priya',
    lastName: 'Raman',
    email: MANAGER.email,
    phone: MANAGER.phone,
    outlet: OUTLET_NAME,
    address: '245 Riverside Avenue, North District'
  });
  const [prefs, setPrefs] = useState<Record<string, boolean>>(() => {
    const defaults = { deferral: true, eta: true, delivered: true, cutoff: false };
    try { return { ...defaults, ...JSON.parse(window.localStorage.getItem(`waypoint-notifications:${user?.email ?? ''}`) ?? '{}') }; }
    catch { return defaults; }
  });
  const togglePreference = (id: string) => {
    setPrefs(previous => {
      const next = { ...previous, [id]: !previous[id] };
      if (live) {
        try { window.localStorage.setItem(`waypoint-notifications:${user?.email ?? ''}`, JSON.stringify(next)); }
        catch { toast.error('Could not save notification preferences on this device.'); return previous; }
      }
      return next;
    });
  };

  const saveProfile = (e: FormEvent) => {
    e.preventDefault();
    setEditing(false);
    toast.success('Profile updated', { description: 'Your contact details have been saved.' });
  };

  return (
    <PageContainer>
      <PageHeader title="Profile Settings" subtitle="Manage your account information and preferences." />

      <div className="mt-6 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <SettingsNavigation active={active} onChange={setActive} />
        <Card className="min-w-0 p-4 md:p-6 lg:p-8">
          {active === 'profile' && (live ?
          <LiveProfilePanel key={user?.email ?? 'account'} name={user?.name ?? 'Store Manager'} email={user?.email ?? ''} outlet={store?.outletName ?? 'Your outlet'} /> :
          <ProfilePanel profile={profile} setProfile={setProfile} editing={editing} setEditing={setEditing} onSave={saveProfile} />)}
          {active === 'security' && <SecurityPanel live={live} outlet={store?.outletName} />}
          {active === 'notifications' && <NotificationsPanel live={live} email={user?.email} prefs={prefs} onToggle={togglePreference} />}
        </Card>
      </div>
    </PageContainer>);

}
