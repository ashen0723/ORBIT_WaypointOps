import React, { FormEvent, useState } from 'react';
import { toast } from 'sonner';
import {
  BellRingIcon,
  CheckIcon,
  KeyRoundIcon,
  PencilIcon,
  ShieldCheckIcon,
  UserRoundIcon } from
'lucide-react';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { MANAGER, OUTLET_NAME } from '../data/schedule';
import { useScreenInit } from '../useScreenInit.js';

type SettingsTab = 'profile' | 'security' | 'notifications';

const TABS: {id: SettingsTab;label: string;Icon: typeof UserRoundIcon;}[] = [
{ id: 'profile', label: 'Profile', Icon: UserRoundIcon },
{ id: 'security', label: 'Security', Icon: ShieldCheckIcon },
{ id: 'notifications', label: 'Notifications', Icon: BellRingIcon }];


const INPUT =
'mt-1.5 h-11 w-full rounded-xl border border-line bg-surface px-3 text-base text-ink placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:bg-canvas disabled:text-subtle lg:text-sm';

const PREFERENCES = [
{ id: 'deferral', label: 'Deferral alerts', description: 'When an order is moved to a later run' },
{ id: 'eta', label: 'ETA updates', description: 'When a vehicle is loading or its arrival time changes' },
{ id: 'delivered', label: 'Delivery arrived', description: 'When the driver marks an order delivered' },
{ id: 'cutoff', label: 'Cutoff reminder', description: 'At 3:00 PM if you haven’t placed a Fresh order' }];


export function Settings() {
  const screenInit = useScreenInit();
  const initialTab: SettingsTab = ['profile', 'security', 'notifications'].includes(screenInit.active) ? screenInit.active : 'profile';
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
  const [prefs, setPrefs] = useState<Record<string, boolean>>({ deferral: true, eta: true, delivered: true, cutoff: false });

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
          {active === 'profile' &&
          <ProfilePanel profile={profile} setProfile={setProfile} editing={editing} setEditing={setEditing} onSave={saveProfile} />
          }
          {active === 'security' && <SecurityPanel />}
          {active === 'notifications' && <NotificationsPanel prefs={prefs} onToggle={(id) => setPrefs((prev) => ({ ...prev, [id]: !prev[id] }))} />}
        </Card>
      </div>
    </PageContainer>);

}

function SettingsNavigation({ active, onChange }: {active: SettingsTab;onChange: (tab: SettingsTab) => void;}) {
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

function ProfilePanel({
  profile,
  setProfile,
  editing,
  setEditing,
  onSave






}: {profile: {firstName: string;lastName: string;email: string;phone: string;outlet: string;address: string;};setProfile: React.Dispatch<React.SetStateAction<{firstName: string;lastName: string;email: string;phone: string;outlet: string;address: string;}>>;editing: boolean;setEditing: (editing: boolean) => void;onSave: (e: FormEvent) => void;}) {
  const set = (key: keyof typeof profile, value: string) => setProfile((prev) => ({ ...prev, [key]: value }));

  return (
    <form onSubmit={onSave}>
      <PanelHeading title="My Profile" action={editing ? undefined : <EditButton onClick={() => setEditing(true)} />} />
      <div className="mt-6 flex flex-col gap-4 rounded-card border border-line bg-canvas/40 p-4 sm:flex-row sm:items-center md:p-5">
        <Avatar name={`${profile.firstName} ${profile.lastName}`} src={MANAGER.avatar} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">{profile.firstName} {profile.lastName}</p>
          <p className="text-sm text-subtle">{profile.email}</p>
          <p className="text-sm text-subtle">Store Manager · {profile.outlet}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => toast('Photo updates are unavailable in this prototype.')}>
          <PencilIcon aria-hidden="true" className="h-3.5 w-3.5" />
          Change photo
        </Button>
      </div>

      <SettingsSection title="Personal Information" action={editing ? <span className="text-xs font-medium text-forest">Editing</span> : <EditButton onClick={() => setEditing(true)} />}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name"><input disabled={!editing} value={profile.firstName} onChange={(e) => set('firstName', e.target.value)} className={INPUT} /></Field>
          <Field label="Last name"><input disabled={!editing} value={profile.lastName} onChange={(e) => set('lastName', e.target.value)} className={INPUT} /></Field>
          <Field label="Email address"><input disabled={!editing} type="email" value={profile.email} onChange={(e) => set('email', e.target.value)} className={INPUT} /></Field>
          <Field label="Phone number"><input disabled={!editing} type="tel" value={profile.phone} onChange={(e) => set('phone', e.target.value)} className={INPUT} /></Field>
        </div>
      </SettingsSection>

      <SettingsSection title="Work Information">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Outlet"><input disabled={!editing} value={profile.outlet} onChange={(e) => set('outlet', e.target.value)} className={INPUT} /></Field>
          <Field label="Role"><input disabled value="Store Manager" className={INPUT} /></Field>
          <Field label="Outlet address" className="sm:col-span-2"><input disabled={!editing} value={profile.address} onChange={(e) => set('address', e.target.value)} className={INPUT} /></Field>
        </div>
      </SettingsSection>

      {editing &&
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" size="lg" onClick={() => setEditing(false)}>Cancel</Button>
          <Button type="submit" size="lg"><CheckIcon aria-hidden="true" className="h-4 w-4" />Save changes</Button>
        </div>
      }
    </form>);

}

function SecurityPanel() {
  return (
    <>
      <PanelHeading title="Security" subtitle="Keep your Waypoint account and outlet data secure." />
      <SettingsSection title="Password">
        <p className="text-sm text-subtle">Last changed 17 days ago. Use a strong, unique password for your manager account.</p>
        <Button variant="outline" size="md" className="mt-4" onClick={() => toast('Password reset link sent', { description: `A secure reset link was sent to ${MANAGER.email}.` })}>
          <KeyRoundIcon aria-hidden="true" className="h-4 w-4" />Change password
        </Button>
      </SettingsSection>
      <SettingsSection title="Active sessions">
        <div className="flex items-center justify-between gap-4 rounded-xl bg-canvas px-4 py-3">
          <div>
            <p className="font-medium text-ink">This device</p>
            <p className="text-sm text-subtle">{OUTLET_NAME} · Active now</p>
          </div>
          <span className="rounded-full bg-brand-pale px-3 py-1 text-xs font-semibold text-forest">Current</span>
        </div>
      </SettingsSection>
    </>);

}

function NotificationsPanel({ prefs, onToggle }: {prefs: Record<string, boolean>;onToggle: (id: string) => void;}) {
  return (
    <>
      <PanelHeading title="Notifications" subtitle="Choose what needs your attention at the outlet." />
      <SettingsSection title="Order updates">
        <ul className="divide-y divide-line">
          {PREFERENCES.map((item) => <NotificationRow key={item.id} {...item} on={prefs[item.id]} onToggle={() => onToggle(item.id)} />)}
        </ul>
      </SettingsSection>
      <SettingsSection title="Delivery channel">
        <div className="grid gap-3 sm:grid-cols-2">
          <ChannelOption title="In-app notifications" detail="Delivery updates in Waypoint" selected />
          <ChannelOption title="Email summaries" detail={`Daily summary to ${MANAGER.email}`} selected />
        </div>
      </SettingsSection>
    </>);

}

function PanelHeading({ title, subtitle, action }: {title: string;subtitle?: string;action?: React.ReactNode;}) {
  return <div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold text-ink md:text-2xl">{title}</h2>{subtitle && <p className="mt-1 text-sm text-subtle">{subtitle}</p>}</div>{action}</div>;
}

function SettingsSection({ title, children, action }: {title: string;children: React.ReactNode;action?: React.ReactNode;}) {
  return <section className="mt-6 rounded-card border border-line bg-canvas/35 p-4 md:p-5"><div className="flex items-center justify-between gap-3"><h3 className="font-semibold text-ink">{title}</h3>{action}</div><div className="mt-4">{children}</div></section>;
}

function Field({ label, children, className = '' }: {label: string;children: React.ReactNode;className?: string;}) {
  return <label className={`block ${className}`}><span className="text-sm text-subtle">{label}</span>{children}</label>;
}

function EditButton({ onClick }: {onClick: () => void;}) {
  return <Button variant="secondary" size="sm" onClick={onClick}><PencilIcon aria-hidden="true" className="h-3.5 w-3.5" />Edit</Button>;
}

function NotificationRow({ id, label, description, on, onToggle }: {id: string;label: string;description: string;on: boolean;onToggle: () => void;}) {
  return <li className="flex items-center justify-between gap-4 py-4"><div><p id={`pref-${id}`} className="font-medium text-ink">{label}</p><p className="text-sm text-subtle">{description}</p></div><button type="button" role="switch" aria-checked={on} aria-labelledby={`pref-${id}`} onClick={onToggle} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${on ? 'bg-forest' : 'bg-hatch'}`}><span aria-hidden="true" className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-surface shadow-card transition-transform duration-150 ${on ? 'translate-x-5' : 'translate-x-0'}`} /></button></li>;
}

function ChannelOption({ title, detail, selected }: {title: string;detail: string;selected: boolean;}) {
  return <div className="flex items-start gap-3 rounded-xl border border-line bg-surface p-4"><span className={`mt-0.5 grid h-5 w-5 place-items-center rounded-full ${selected ? 'bg-forest text-white' : 'border border-line'}`}>{selected && <CheckIcon className="h-3 w-3" strokeWidth={3} />}</span><span><span className="block font-medium text-ink">{title}</span><span className="mt-1 block text-sm text-subtle">{detail}</span></span></div>;
}