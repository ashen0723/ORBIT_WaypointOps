import type React from 'react';
import { type FormEvent, useRef, useState } from 'react';
import { CheckIcon, PencilIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { MANAGER } from '../../data/schedule';
import { PanelHeading, SettingsSection } from './SettingsSection';

const INPUT = 'mt-1.5 h-11 w-full rounded-xl border border-line bg-surface px-3 text-base text-ink placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:bg-canvas disabled:text-subtle lg:text-sm';

export function LiveProfilePanel({ name, email, outlet }: { name: string; email: string; outlet: string }) {
  const parts = name.trim().split(/\s+/);
  const storageKey = `waypoint-profile:${email}`;
  const [saved, setSaved] = useState(() => {
    try {
      const value = window.localStorage.getItem(storageKey);
      return value ? JSON.parse(value) as { firstName: string; lastName: string; phone: string; photo?: string } : null;
    } catch { return null; }
  });
  const [draft, setDraft] = useState({
    firstName: saved?.firstName ?? parts[0] ?? '',
    lastName: saved?.lastName ?? parts.slice(1).join(' '),
    phone: saved?.phone ?? ''
  });
  const [photo, setPhoto] = useState(saved?.photo ?? '');
  const [editingPersonal, setEditingPersonal] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const displayName = `${saved?.firstName ?? draft.firstName} ${saved?.lastName ?? draft.lastName}`.trim() || name;
  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.firstName.trim()) return;
    const next = { firstName: draft.firstName.trim(), lastName: draft.lastName.trim(), phone: draft.phone.trim(), photo };
    try { window.localStorage.setItem(storageKey, JSON.stringify(next)); } catch { toast.error('Could not save changes on this device.'); return; }
    setSaved(next);
    setEditingPersonal(false);
    toast.success('Personal information saved on this device.');
  };
  const changePhoto = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) {
      toast.error('Choose an image smaller than 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      const nextPhoto = reader.result;
      const next = { firstName: saved?.firstName ?? draft.firstName, lastName: saved?.lastName ?? draft.lastName, phone: saved?.phone ?? draft.phone, photo: nextPhoto };
      try { window.localStorage.setItem(storageKey, JSON.stringify(next)); } catch { toast.error('Could not save the photo on this device.'); return; }
      setSaved(next);
      setPhoto(nextPhoto);
      toast.success('Photo changed on this device.');
    };
    reader.readAsDataURL(file);
  };
  return <div>
    <PanelHeading title="My Profile" />
    <div className="mt-6 flex flex-col gap-4 rounded-card border border-line bg-canvas/40 p-4 sm:flex-row sm:items-center md:p-5">
      <Avatar name={displayName} src={photo || undefined} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">{displayName}</p>
        <p className="text-sm text-subtle">{email}</p>
        <p className="text-sm text-subtle">Store Manager · {outlet}</p>
      </div>
      <input ref={photoInput} type="file" accept="image/*" className="sr-only" aria-label="Choose profile photo" onChange={event => { changePhoto(event.target.files?.[0]); event.target.value = ''; }} />
      <Button variant="secondary" size="sm" onClick={() => photoInput.current?.click()}>
        <PencilIcon aria-hidden="true" className="h-3.5 w-3.5" />Change photo
      </Button>
    </div>
    <SettingsSection title="Personal Information" action={editingPersonal ? undefined : <EditButton onClick={() => setEditingPersonal(true)} />}>
      <form onSubmit={save}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name"><input required disabled={!editingPersonal} value={draft.firstName} onChange={event => setDraft({ ...draft, firstName: event.target.value })} className={INPUT} /></Field>
        <Field label="Last name"><input disabled={!editingPersonal} value={draft.lastName} onChange={event => setDraft({ ...draft, lastName: event.target.value })} className={INPUT} /></Field>
        <Field label="Email address"><input readOnly value={email} className={`${INPUT} bg-canvas`} /></Field>
        <Field label="Phone number"><input type="tel" disabled={!editingPersonal} value={draft.phone} onChange={event => setDraft({ ...draft, phone: event.target.value })} className={INPUT} /></Field>
      </div>
      {editingPersonal && <div className="mt-4 flex justify-end gap-3">
        <Button variant="secondary" onClick={() => { setDraft({ firstName: saved?.firstName ?? parts[0] ?? '', lastName: saved?.lastName ?? parts.slice(1).join(' '), phone: saved?.phone ?? '' }); setEditingPersonal(false); }}>Cancel</Button>
        <Button type="submit">Save changes</Button>
      </div>}
      </form>
    </SettingsSection>
    <SettingsSection title="Work Information">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Outlet"><input readOnly value={outlet} className={`${INPUT} bg-canvas`} /></Field>
        <Field label="Role"><input readOnly value="Store Manager" className={`${INPUT} bg-canvas`} /></Field>
      </div>
    </SettingsSection>
    <p className="mt-5 text-sm text-subtle">Photo and personal information changes are saved on this device. Contact your administrator to update your account details.</p>
  </div>;
}

export function ProfilePanel({
  profile,
  setProfile,
  editing,
  setEditing,
  onSave

}: {profile: {firstName: string;lastName: string;email: string;phone: string;outlet: string;address: string;};setProfile: React.Dispatch<React.SetStateAction<{firstName: string;lastName: string;email: string;phone: string;outlet: string;address: string;}>>;editing: boolean;setEditing: (editing: boolean) => void;onSave: (e: FormEvent) => void;}) {
  const set = (key: keyof typeof profile, value: string) => setProfile((prev) => ({ ...prev, [key]: value }));

  return (
    <form onSubmit={onSave}>
      <PanelHeading title="My Profile" />
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

function Field({ label, children, className = '' }: {label: string;children: React.ReactNode;className?: string;}) {
  return <label className={`block ${className}`}><span className="text-sm text-subtle">{label}</span>{children}</label>;
}

function EditButton({ onClick }: {onClick: () => void;}) {
  return <Button variant="secondary" size="sm" onClick={onClick}><PencilIcon aria-hidden="true" className="h-3.5 w-3.5" />Edit</Button>;
}
