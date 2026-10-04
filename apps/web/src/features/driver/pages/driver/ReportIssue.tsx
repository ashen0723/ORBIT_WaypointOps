import React, { useState } from 'react';
import { CarFrontIcon, CircleAlertIcon, ConstructionIcon, MicIcon, OctagonAlertIcon, SnowflakeIcon, StoreIcon, TimerIcon, TriangleAlertIcon } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { DriverPhoto, DriverPhotoCapture } from '../../components/driver/DriverPhotoCapture';
import { PageIntro } from '../../components/driver/PageIntro';
import { StateBanner } from '../../components/driver/StateBanner';
import { Button } from '../../components/ui/Button';
import { useDriver } from '../../contexts/DriverContext';
import { TRIP_ONE } from '../../data/driver';

const ISSUES = [
{ label: 'Vehicle breakdown', icon: CarFrontIcon }, { label: 'Road blocked', icon: ConstructionIcon },
{ label: 'Refrigeration fault', icon: SnowflakeIcon }, { label: 'Running late', icon: TimerIcon },
{ label: 'Outlet closed', icon: StoreIcon }, { label: 'Accident', icon: OctagonAlertIcon },
{ label: 'Other', icon: CircleAlertIcon }];


export function ReportIssue() {
  const location = useLocation();
  const { connection, fileIssueReport } = useDriver();
  const offline = connection === 'offline' || new URLSearchParams(location.search).get('offline') === '1';
  const [issue, setIssue] = useState('');
  const [stop, setStop] = useState('OUT070');
  const [photos, setPhotos] = useState<DriverPhoto[]>([]);
  const [recording, setRecording] = useState(false);
  const [voiceAdded, setVoiceAdded] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = () => {fileIssueReport();setSent(true);};
  if (sent) return <div className="max-w-2xl"><StateBanner tone="success" title={offline ? 'Saved — will send when online' : 'Sent to Dispatcher'} detail={`${issue} · ${stop}`} /></div>;

  return (
    <div className="space-y-5 md:space-y-6">
      <PageIntro title="Report an issue" description="No typing needed. Choose what happened and which stop is affected." titleInDesktopHeader />
      {offline && <StateBanner tone="warning" title="You're offline" detail="The report will be saved on this phone and sent automatically." />}
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
            <div><label htmlFor="affected-stop" className="text-sm font-semibold">Which stop does this affect?</label><select id="affected-stop" value={stop} onChange={(event) => setStop(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-amber/35 bg-surface px-3 text-base text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20">{TRIP_ONE.stops.map((item) => <option key={item.outletId} value={item.outletId}>{item.sequence}. {item.outletId} · {item.name}</option>)}</select></div>
            <DriverPhotoCapture photos={photos} onChange={setPhotos} label="Issue photo" />
            <div><p className="text-sm font-semibold">Voice note <span className="font-normal opacity-70">(optional)</span></p><button type="button" onPointerDown={() => setRecording(true)} onPointerUp={() => {setRecording(false);setVoiceAdded(true);}} onPointerCancel={() => setRecording(false)} className={`mt-2 flex min-h-14 w-full items-center justify-center gap-2 rounded-full font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${recording ? 'bg-danger text-white' : voiceAdded ? 'bg-brand-pale text-forest' : 'border border-amber/35 bg-surface text-ink'}`}><MicIcon aria-hidden className="h-5 w-5" />{recording ? 'Recording… release to save' : voiceAdded ? 'Voice note added ✓' : 'Hold to record'}</button></div>
          </section>
          <Button size="lg" fullWidth disabled={!issue} onClick={submit}><TriangleAlertIcon aria-hidden className="h-5 w-5" />Send to Dispatcher</Button>
          {offline && <a href="sms:+94770000000?body=URGENT%20Waypoint%20Driver%20issue" className="inline-flex min-h-12 w-full items-center justify-center rounded-full text-sm font-semibold text-danger-ink underline underline-offset-4">Urgent? Send by SMS</a>}
        </div>
      </div>
    </div>);

}