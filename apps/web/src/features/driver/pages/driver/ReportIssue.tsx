import { useState } from 'react';
import { CarFrontIcon, CircleAlertIcon, ConstructionIcon, OctagonAlertIcon, SnowflakeIcon, StoreIcon, TimerIcon, TriangleAlertIcon } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { DriverPhoto, DriverPhotoCapture } from '../../components/driver/DriverPhotoCapture';
import { PageIntro } from '../../components/driver/PageIntro';
import { StateBanner } from '../../components/driver/StateBanner';
import { Button } from '../../components/ui/Button';
import { useDriver } from '../../contexts/DriverContext';


const ISSUES = [
{ label: 'Vehicle breakdown', icon: CarFrontIcon }, { label: 'Road blocked', icon: ConstructionIcon },
{ label: 'Refrigeration fault', icon: SnowflakeIcon }, { label: 'Running late', icon: TimerIcon },
{ label: 'Outlet closed', icon: StoreIcon }, { label: 'Accident', icon: OctagonAlertIcon },
{ label: 'Other', icon: CircleAlertIcon }];


export function ReportIssue() {
  const location = useLocation();
  const { trips, connection, fileIssueReport } = useDriver();
  const offline = connection === 'offline' || new URLSearchParams(location.search).get('offline') === '1';
  const [issue, setIssue] = useState('');
  const [stop, setStop] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [savedState, setSavedState] = useState('');
  const [photos, setPhotos] = useState<DriverPhoto[]>([]);
  const [sent, setSent] = useState(false);
  const available = trips.flatMap(trip => trip.stops.map(item => ({ trip, item })));
  const selected = available.find(({trip, item}) => `${trip.id}:${item.sequence}` === stop);
  const submit = async () => {
    if (!selected || busy) return;
    setBusy(true); setError(undefined);
    try { const state = await fileIssueReport({ kind: 'issue', tripId: selected.trip.id, sequence: selected.item.sequence, reason: issue, notes, photos }); setSavedState(state); setSent(true); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Report failed.'); }
    finally { setBusy(false); }
  };
  if (sent) return <StateBanner tone="success" title="Report accepted" detail={`${savedState} · ${issue} · ${selected?.item.name}`} />;

  return (
    <div className="space-y-5 md:space-y-6">
      <PageIntro title="Report an issue" description="No typing needed. Choose what happened and which stop is affected." titleInDesktopHeader />
      {offline && <StateBanner tone="warning" title="You're offline" detail="Check the reported save status after submission." />}
      <div className="space-y-5 xl:grid xl:grid-cols-[minmax(0,1.6fr)_minmax(340px,1fr)] xl:items-start xl:gap-6 xl:space-y-0">
        <section aria-labelledby="issue-heading">
          <h2 id="issue-heading" className="text-lg font-bold text-ink">What happened?</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {ISSUES.map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.label} type="button" onClick={() => setIssue(item.label)} aria-pressed={issue === item.label} className={`flex min-h-24 flex-col items-center justify-center gap-2 rounded-card border p-3 text-center text-sm font-semibold leading-tight transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand xl:min-h-28 ${issue === item.label ? 'border-brand bg-brand-pale text-forest' : 'border-line bg-surface text-ink hover:border-brand/50'}`}>
                  <Icon aria-hidden className="h-6 w-6" />{item.label}
                </button>);

            })}
          </div>
        </section>
        <div className="space-y-5 xl:sticky xl:top-8">
          <section className="space-y-5 rounded-panel bg-amber-pale p-4 text-amber-ink shadow-card xl:p-5">
            <div><label htmlFor="affected-stop" className="text-sm font-semibold">Which stop does this affect?</label><select id="affected-stop" value={stop} onChange={(event) => setStop(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-amber/35 bg-surface px-3 text-base text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"><option value="">Choose a stop</option>{available.map(({trip, item}) => <option key={`${trip.id}:${item.sequence}`} value={`${trip.id}:${item.sequence}`}>{trip.number} · {item.sequence}. {item.outletId} · {item.name}</option>)}</select></div>
            <DriverPhotoCapture photos={photos} onChange={setPhotos} label="Issue photo" />
            <label className="block text-sm font-semibold">Issue details (optional)<textarea value={notes} onChange={event => setNotes(event.target.value)} className="mt-2 min-h-24 w-full rounded-xl border border-line p-3 text-ink" /></label>
          </section>
          {error && <p role="alert">{error}</p>}
          <Button size="lg" fullWidth disabled={!issue || !selected || busy} onClick={submit}><TriangleAlertIcon aria-hidden className="h-5 w-5" />Send to Dispatcher</Button>

        </div>
      </div>
    </div>);

}