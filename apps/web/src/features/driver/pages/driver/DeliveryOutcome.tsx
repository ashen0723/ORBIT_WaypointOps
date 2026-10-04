import { useRef, useState } from 'react';
import { CheckIcon, MinusIcon, PlusIcon } from 'lucide-react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { DriverPhoto, DriverPhotoCapture } from '../../components/driver/DriverPhotoCapture';
import { PageIntro } from '../../components/driver/PageIntro';
import { SignaturePad } from '../../components/driver/SignaturePad';
import { StateBanner } from '../../components/driver/StateBanner';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useDriver } from '../../contexts/DriverContext';
import type { DeliveryOutcome as Outcome } from '../../types/driver';
import { validateDelivery, type DeliveryDraft } from '../../integration/driver';

const PARTIAL_REASONS = ['Missing from load', 'Damaged', 'Refused by store', 'Short-dated'];
const FAILED_REASONS = ['Outlet closed', 'Receiver unavailable', 'Cannot access outlet', 'Outside window', 'Refused', 'Vehicle issue'];

export function DeliveryOutcome() {
  const { tripId, sequence } = useParams();
  const navigate = useNavigate();
  const { trips: TRIPS, completeDelivery, getStopRecord } = useDriver();
  const trip = TRIPS.find((candidate) => candidate.id === tripId);
  const stop = trip?.stops.find((candidate) => candidate.sequence === Number(sequence));
  const [outcome, setOutcome] = useState<Outcome>('full');
  const [reason, setReason] = useState('');
  const [recipient, setRecipient] = useState('');
  const [signature, setSignature] = useState<string>();
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [error, setError] = useState<string>();
  const [savedState, setSavedState] = useState('');
  const [photos, setPhotos] = useState<DriverPhoto[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [complete, setComplete] = useState(false);
  if (!trip || !stop) return <Navigate to="/" replace />;
  const existingRecord = getStopRecord(trip.id, stop.sequence);
  const resolved = ['Delivered', 'Partially delivered', 'Failed', 'Changed by dispatcher'].includes(existingRecord.status);
  if (resolved && !complete && !busy) return <Navigate to={`/trips/${trip.id}/stops/${stop.sequence}`} replace />;

  const deliveredQuantities = Object.fromEntries(stop.items.map((item) => [item.id, outcome === 'failed' ? 0 : outcome === 'full' ? item.planned : quantities[item.id] ?? item.loaded ?? item.planned]));
  const photoRequired = outcome === 'failed' || (outcome === 'partial' && /damage/i.test(reason));
  const draft: DeliveryDraft = { outcome, quantities: deliveredQuantities, reason: outcome === 'full' ? undefined : reason, recipient: outcome === 'failed' ? undefined : recipient, signature: outcome === 'failed' ? undefined : signature, photos };
  const invalid = validateDelivery(stop.items, draft);
  const canComplete = !invalid && existingRecord.status === 'Arrived';
  const submit = async () => {
    if (!canComplete || submitting.current) return;
    submitting.current = true; setBusy(true); setError(undefined);
    try {
      const state = await completeDelivery(trip.id, stop.sequence, draft, new Date().toISOString());
      setSavedState(state); setComplete(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save delivery.'); }
    finally { submitting.current = false; setBusy(false); }
  };
  if (complete) return <div className="space-y-4"><StateBanner tone="success" title="Delivery recorded" detail={savedState === 'Demo only' ? 'Demo only — held in memory. No server submission or durable save.' : savedState} /><Button fullWidth onClick={() => navigate(`/trips/${trip.id}/stops`)}>Continue route</Button></div>;

  return (
    <div className="space-y-5">
      <PageIntro meta={`${stop.outletId} · ${stop.name}`} title="Record delivery" description="Choose the outcome, then capture proof of delivery." />
      <div className="grid gap-2" role="radiogroup" aria-label="Delivery outcome">
        {([['full', 'Delivered in full'], ['partial', 'Partially delivered'], ['failed', 'Failed']] as const).map(([value, label]) =>
        <button key={value} type="button" role="radio" aria-checked={outcome === value} onClick={() => {setOutcome(value);setReason('');}} className={`min-h-14 rounded-full px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${outcome === value ? value === 'failed' ? 'bg-danger text-white' : value === 'partial' ? 'bg-amber text-ink' : 'bg-forest text-white' : 'border border-line bg-surface text-ink'}`}>{label}</button>
        )}
      </div>
      {outcome === 'partial' &&
      <Card className="p-4"><h2 className="font-bold text-ink">Delivered quantities</h2><div className="mt-3 space-y-3">{stop.items.map((item) => <div key={item.id} className="flex items-center gap-3 border-b border-line pb-3 last:border-0 last:pb-0"><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-ink">{item.name}</p><p className="mt-1 text-xs text-subtle">Planned {item.planned} · Loaded {item.loaded ?? item.planned}</p></div><button type="button" aria-label={`Reduce ${item.name}`} onClick={() => setQuantities((current) => ({ ...current, [item.id]: Math.max(0, deliveredQuantities[item.id] - 1) }))} className="grid h-12 w-12 place-items-center rounded-full border border-line"><MinusIcon aria-hidden className="h-4 w-4" /></button><span className="w-6 text-center font-bold">{deliveredQuantities[item.id]}</span><button type="button" aria-label={`Increase ${item.name}`} onClick={() => setQuantities((current) => ({ ...current, [item.id]: Math.min(item.loaded ?? item.planned, deliveredQuantities[item.id] + 1) }))} className="grid h-12 w-12 place-items-center rounded-full border border-line"><PlusIcon aria-hidden className="h-4 w-4" /></button></div>)}</div></Card>
      }
      {outcome !== 'full' && <section><h2 className="font-bold text-ink">Reason</h2><div className="mt-3 flex flex-wrap gap-2">{(outcome === 'partial' ? PARTIAL_REASONS : FAILED_REASONS).map((item) => <button key={item} type="button" onClick={() => setReason(item)} className={`min-h-12 rounded-full px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${reason === item ? 'bg-ink text-white' : 'border border-line bg-surface text-ink'}`}>{item}</button>)}</div></section>}
      <section className="space-y-5 rounded-panel bg-brand-pale p-4 text-forest shadow-card">{outcome !== 'failed' && <><div><label htmlFor="recipient" className="text-sm font-semibold">Recipient name</label><input id="recipient" value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder="Name of receiver" className="mt-2 h-12 w-full rounded-xl border border-brand/25 bg-surface px-3 text-base text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" /></div><SignaturePad onSignedChange={() => undefined} onSignatureChange={setSignature} /></>}<DriverPhotoCapture photos={photos} onChange={setPhotos} required={photoRequired} label="Proof photo" /></section>
      <p role="status" className="text-sm text-subtle">{invalid}</p>{error && <p role="alert" className="text-danger-ink">{error}</p>}
      <Button size="lg" fullWidth disabled={!canComplete || busy} onClick={submit}><CheckIcon aria-hidden className="h-5 w-5" />{busy ? 'Saving…' : 'Complete delivery'}</Button>
    </div>);

}