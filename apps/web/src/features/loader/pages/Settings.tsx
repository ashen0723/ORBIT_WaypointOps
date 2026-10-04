import React, { FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { BellRingIcon, CheckIcon, ChevronRightIcon, ClipboardCheckIcon, FileTextIcon, KeyRoundIcon, PencilIcon, ShieldCheckIcon, UserRoundIcon } from 'lucide-react';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { LOADER_DEPOT, LOADER_OPERATOR } from '../data/loader';
import { useScreenInit } from '../useScreenInit.js';
type SettingsTab = 'profile' | 'security' | 'terms' | 'notifications';
const TABS: {
  id: SettingsTab;
  label: string;
  Icon: typeof UserRoundIcon;
}[] = [{
  id: 'profile',
  label: 'Profile',
  Icon: UserRoundIcon
}, {
  id: 'security',
  label: 'Security',
  Icon: ShieldCheckIcon
}, {
  id: 'terms',
  label: 'Terms',
  Icon: FileTextIcon
}, {
  id: 'notifications',
  label: 'Notifications',
  Icon: BellRingIcon
}];
const INPUT = 'mt-1.5 h-11 w-full rounded-xl border border-line bg-surface px-3 text-base text-ink placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:bg-canvas disabled:text-subtle lg:text-sm';
const PREFERENCES = [{
  id: 'deferral',
  label: 'Deferral alerts',
  description: 'When an order is moved to a later run'
}, {
  id: 'eta',
  label: 'ETA updates',
  description: 'When a vehicle is loading or its arrival time changes'
}, {
  id: 'delivered',
  label: 'Delivery arrived',
  description: 'When the driver marks an order delivered'
}, {
  id: 'cutoff',
  label: 'Cutoff reminder',
  description: 'At 3:00 PM if you haven’t placed a Fresh order'
}];
export function Settings() {
  const screenInit = useScreenInit();
  const [active, setActive] = useState<SettingsTab>(() => screenInit.active ?? 'profile');
  const [editing, setEditing] = useState(() => screenInit.editing ?? false);
  const [profile, setProfile] = useState({
    firstName: 'Kasun',
    lastName: 'Fernando',
    email: LOADER_OPERATOR.email,
    phone: LOADER_OPERATOR.phone,
    outlet: `${LOADER_DEPOT} Depot`,
    address: 'Peliyagoda, Colombo District'
  });
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    deferral: true,
    eta: true,
    delivered: true,
    cutoff: false
  });
  const [termsAccepted, setTermsAccepted] = useState(true);
  const saveProfile = (e: FormEvent) => {
    e.preventDefault();
    setEditing(false);
    toast.success('Profile updated', {
      description: 'Your contact details have been saved.'
    });
  };
  return <PageContainer>
      <PageHeader title="Settings" subtitle="Manage your Loader profile, security, terms, and notifications." />

      <div className="mt-6 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <SettingsNavigation active={active} onChange={setActive} />
        <Card className="min-w-0 p-4 md:p-6 lg:p-8">
          {active === 'profile' && <ProfilePanel profile={profile} setProfile={setProfile} editing={editing} setEditing={setEditing} onSave={saveProfile} />}
          {active === 'security' && <SecurityPanel />}
          {active === 'terms' && <TermsPanel accepted={termsAccepted} onToggle={() => setTermsAccepted((value) => !value)} />}
          {active === 'notifications' && <NotificationsPanel prefs={prefs} onToggle={(id) => setPrefs((prev) => ({
          ...prev,
          [id]: !prev[id]
        }))} />}
        </Card>
      </div>
    </PageContainer>;
}
function SettingsNavigation({
  active,
  onChange



}: {active: SettingsTab;onChange: (tab: SettingsTab) => void;}) {
  return <>
      <Card className="hidden h-fit p-3 lg:block">
        <nav aria-label="Profile settings">
          <ul className="space-y-1">
            {TABS.map(({
            id,
            label,
            Icon
          }) => <li key={id}>
                <button type="button" onClick={() => onChange(id)} aria-current={active === id ? 'page' : undefined} className={`flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${active === id ? 'bg-brand-pale font-semibold text-forest' : 'text-subtle hover:bg-canvas hover:text-ink'}`}>
                  <Icon aria-hidden="true" className="h-4 w-4" />
                  {label}
                </button>
              </li>)}

          </ul>
        </nav>
      </Card>

      <nav aria-label="Profile settings" className="-mx-4 overflow-x-auto px-4 lg:hidden">
        <div className="inline-flex min-w-max gap-2 rounded-full bg-surface p-1 shadow-card">
          {TABS.map(({
          id,
          label,
          Icon
        }) => <button key={id} type="button" onClick={() => onChange(id)} aria-current={active === id ? 'page' : undefined} className={`flex h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${active === id ? 'bg-forest text-white' : 'text-subtle hover:text-ink'}`}>
              <Icon aria-hidden="true" className="h-4 w-4" />
              {label}
            </button>)}
        </div>
      </nav>
    </>;
}
function ProfilePanel({
  profile,
  setProfile,
  editing,
  setEditing,
  onSave




















}: {profile: {firstName: string;lastName: string;email: string;phone: string;outlet: string;address: string;};setProfile: React.Dispatch<React.SetStateAction<{firstName: string;lastName: string;email: string;phone: string;outlet: string;address: string;}>>;editing: boolean;setEditing: (editing: boolean) => void;onSave: (e: FormEvent) => void;}) {
  const set = (key: keyof typeof profile, value: string) => setProfile((prev) => ({
    ...prev,
    [key]: value
  }));
  return <form onSubmit={onSave}>
      <PanelHeading title="My Profile" action={editing ? undefined : <EditButton onClick={() => setEditing(true)} />} />
      <div className="mt-6 flex flex-col gap-4 rounded-card border border-line bg-canvas/40 p-4 sm:flex-row sm:items-center md:p-5">
        <Avatar name={`${profile.firstName} ${profile.lastName}`} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">{profile.firstName} {profile.lastName}</p>
          <p className="text-sm text-subtle">{profile.email}</p>
          <p className="text-sm text-subtle">Loader · {profile.outlet}</p>
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
          <Field label="Depot"><input disabled={!editing} value={profile.outlet} onChange={(e) => set('outlet', e.target.value)} className={INPUT} /></Field>
          <Field label="Role"><input disabled value="Loader" className={INPUT} /></Field>
          <Field label="Depot address" className="sm:col-span-2"><input disabled={!editing} value={profile.address} onChange={(e) => set('address', e.target.value)} className={INPUT} /></Field>
        </div>
      </SettingsSection>

      {editing && <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" size="lg" onClick={() => setEditing(false)}>Cancel</Button>
          <Button type="submit" size="lg"><CheckIcon aria-hidden="true" className="h-4 w-4" />Save changes</Button>
        </div>}
    </form>;
}
function SecurityPanel() {
  return <>
      <PanelHeading title="Security" subtitle="Keep your Waypoint account and outlet data secure." />
      <SettingsSection title="Password">
        <p className="text-sm text-subtle">Last changed 17 days ago. Use a strong, unique password for your Loader account.</p>
        <Button variant="outline" size="md" className="mt-4" onClick={() => toast('Password reset link sent', {
        description: `A secure reset link was sent to ${LOADER_OPERATOR.email}.`
      })}>
          <KeyRoundIcon aria-hidden="true" className="h-4 w-4" />Change password
        </Button>
      </SettingsSection>
      <SettingsSection title="Two-step verification">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium text-ink">Authenticator app</p>
            <p className="mt-1 text-sm text-subtle">Not enabled. Add a second layer of protection at sign-in.</p>
          </div>
          <Button size="md" onClick={() => toast.success('Two-step verification setup started')}>Enable</Button>
        </div>
      </SettingsSection>
      <SettingsSection title="Active sessions">
        <div className="flex items-center justify-between gap-4 rounded-xl bg-canvas px-4 py-3">
          <div>
            <p className="font-medium text-ink">This device</p>
            <p className="text-sm text-subtle">{LOADER_DEPOT} Depot · Active now</p>
          </div>
          <span className="rounded-full bg-brand-pale px-3 py-1 text-xs font-semibold text-forest">Current</span>
        </div>
      </SettingsSection>
    </>;
}
function TermsPanel({
  accepted,
  onToggle



}: {accepted: boolean;onToggle: () => void;}) {
  return <>
      <PanelHeading title="Terms & Data" subtitle="Review the agreements governing your Waypoint account." />
      <SettingsSection title="Loader Terms">
        <p className="text-sm leading-relaxed text-subtle">These terms cover loading, exception reporting, and loading-audit data at {LOADER_DEPOT} Depot. The current version took effect on 1 September 2026.</p>
        <button type="button" onClick={() => toast('Opening the Loader Terms is not available in this prototype.')} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-forest hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
          Read Loader Terms<ChevronRightIcon aria-hidden="true" className="h-4 w-4" />
        </button>
      </SettingsSection>
      <SettingsSection title="Data processing">
        <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-canvas p-4">
          <input type="checkbox" checked={accepted} onChange={onToggle} className="mt-0.5 h-4 w-4 rounded accent-brand" />
          <span><span className="font-medium text-ink">Acknowledge delivery data policy</span><span className="mt-1 block text-sm text-subtle">Proof-of-delivery photos and issue reports are retained for 180 days for reconciliation.</span></span>
        </label>
      </SettingsSection>
      <SettingsSection title="Export account data">
        <p className="text-sm text-subtle">Request a copy of your profile, order and receiving history.</p>
        <Button variant="outline" size="md" className="mt-4" onClick={() => toast.success('Data export requested', {
        description: 'A secure download link will be sent to your email.'
      })}><ClipboardCheckIcon aria-hidden="true" className="h-4 w-4" />Request export</Button>
      </SettingsSection>
    </>;
}
function NotificationsPanel({
  prefs,
  onToggle



}: {prefs: Record<string, boolean>;onToggle: (id: string) => void;}) {
  return <>
      <PanelHeading title="Notifications" subtitle="Choose what needs your attention at the outlet." />
      <SettingsSection title="Loading updates">
        <ul className="divide-y divide-line">
          {PREFERENCES.map((item) => <NotificationRow key={item.id} {...item} on={prefs[item.id]} onToggle={() => onToggle(item.id)} />)}
        </ul>
      </SettingsSection>
      <SettingsSection title="Delivery channel">
        <div className="grid gap-3 sm:grid-cols-2">
          <ChannelOption title="In-app notifications" detail="Delivery updates in Waypoint" selected />
          <ChannelOption title="Email summaries" detail={`Daily summary to ${LOADER_OPERATOR.email}`} selected />
        </div>
      </SettingsSection>
    </>;
}
function PanelHeading({
  title,
  subtitle,
  action




}: {title: string;subtitle?: string;action?: React.ReactNode;}) {
  return <div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold text-ink md:text-2xl">{title}</h2>{subtitle && <p className="mt-1 text-sm text-subtle">{subtitle}</p>}</div>{action}</div>;
}
function SettingsSection({
  title,
  children,
  action




}: {title: string;children: React.ReactNode;action?: React.ReactNode;}) {
  return <section className="mt-6 rounded-card border border-line bg-canvas/35 p-4 md:p-5"><div className="flex items-center justify-between gap-3"><h3 className="font-semibold text-ink">{title}</h3>{action}</div><div className="mt-4">{children}</div></section>;
}
function Field({
  label,
  children,
  className = ''




}: {label: string;children: React.ReactNode;className?: string;}) {
  return <label className={`block ${className}`}><span className="text-sm text-subtle">{label}</span>{children}</label>;
}
function EditButton({
  onClick


}: {onClick: () => void;}) {
  return <Button variant="secondary" size="sm" onClick={onClick}><PencilIcon aria-hidden="true" className="h-3.5 w-3.5" />Edit</Button>;
}
function NotificationRow({
  id,
  label,
  description,
  on,
  onToggle






}: {id: string;label: string;description: string;on: boolean;onToggle: () => void;}) {
  return <li className="flex items-center justify-between gap-4 py-4"><div><p id={`pref-${id}`} className="font-medium text-ink">{label}</p><p className="text-sm text-subtle">{description}</p></div><button type="button" role="switch" aria-checked={on} aria-labelledby={`pref-${id}`} onClick={onToggle} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${on ? 'bg-forest' : 'bg-hatch'}`}><span aria-hidden="true" className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-surface shadow-card transition-transform duration-150 ${on ? 'translate-x-5' : 'translate-x-0'}`} /></button></li>;
}
function ChannelOption({
  title,
  detail,
  selected




}: {title: string;detail: string;selected: boolean;}) {
  return <div className="flex items-start gap-3 rounded-xl border border-line bg-surface p-4"><span className={`mt-0.5 grid h-5 w-5 place-items-center rounded-full ${selected ? 'bg-forest text-white' : 'border border-line'}`}>{selected && <CheckIcon className="h-3 w-3" strokeWidth={3} />}</span><span><span className="block font-medium text-ink">{title}</span><span className="mt-1 block text-sm text-subtle">{detail}</span></span></div>;
}