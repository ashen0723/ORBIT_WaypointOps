import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CameraIcon, CheckCircle2Icon, CircleAlertIcon, MessageSquareTextIcon, SendIcon } from 'lucide-react';
import { LOAD_ORDERS } from '../data/loader';
import { useLoader } from '../contexts/LoaderContext';
import type { LoaderIssueTarget, LoaderIssueType } from '../types/loader';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button, buttonStyles } from '../components/ui/Button';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { TripContextBar } from '../components/loader/TripContextBar';

const ISSUE_OPTIONS = [{ value: 'missing', label: 'Missing' }, { value: 'damaged', label: 'Damaged' }] as const;

export function LoadingIssue() {
  const { itemId = 'milk' } = useParams();
  const { issues, quantities, reportIssue, acknowledgeDecision } = useLoader();
  const target = findIssueTarget(itemId) ?? findIssueTarget('milk');
  const existingIssue = target ? issues[target.itemId] : undefined;
  const [type, setType] = useState<LoaderIssueType>(existingIssue?.type ?? 'missing');
  const [note, setNote] = useState(existingIssue?.note ?? '');
  const [photoAttached, setPhotoAttached] = useState(existingIssue?.photoAttached ?? false);

  if (!target) return null;
  const loaded = existingIssue?.loaded ?? quantities[target.itemId] ?? 0;
  const difference = Math.max(0, target.expected - loaded);

  if (existingIssue) {
    const decision = existingIssue.decisionReceived;
    return <PageContainer className="max-w-[960px]"><PageHeader backTo={{ to: '/loader/veh014', label: 'Vehicle Load' }} title={decision ? 'Decision Received' : 'Shortfall Reported'} subtitle={`VEH014 · Trip 1 · ${existingIssue.orderId}`} /><div className="mt-6"><TripContextBar /></div><Card className="mt-5 overflow-hidden"><div className={`p-6 md:p-8 ${decision ? 'bg-brand-pale/65' : 'bg-amber-pale'}`}><span className={`grid h-12 w-12 place-items-center rounded-2xl ${decision ? 'bg-forest text-white shadow-card' : 'bg-amber text-amber-ink'}`}>{decision ? <CheckCircle2Icon aria-hidden="true" className="h-6 w-6" /> : <SendIcon aria-hidden="true" className="h-6 w-6" />}</span><h2 className="mt-5 text-[28px] font-semibold tracking-tight text-ink">{decision ? 'Proceed with recorded shortfall' : 'Shortfall reported'}</h2><p className="mt-2 max-w-xl text-base leading-7 text-subtle">{decision ? 'Dispatcher approved this recorded shortfall. Continue loading and resolve any other item shortages separately.' : 'Dispatcher has been notified before departure. Other shortages can still be reported one by one.'}</p></div><div className="p-5 md:p-6"><div className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-base font-semibold text-ink">{existingIssue.orderId} · {existingIssue.itemName}</p><p className="mt-1 text-sm text-subtle">Expected {existingIssue.expected} · Loaded {existingIssue.loaded} · <span className="font-semibold text-danger-ink">{Math.max(0, existingIssue.expected - existingIssue.loaded)} {existingIssue.type}</span></p></div><span className={`self-start rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${decision ? 'bg-brand-pale text-forest ring-brand/20' : 'bg-amber-pale text-amber-ink ring-amber/30'}`}>{decision ? 'Approved to proceed' : 'Waiting for Dispatcher decision'}</span></div>{!decision && <div className="mt-5 rounded-card border border-line/80 bg-canvas/65 p-5"><div className="flex gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-pale text-forest"><MessageSquareTextIcon aria-hidden="true" className="h-4 w-4" /></span><div><p className="font-semibold text-ink">Dispatcher review in progress</p><p className="mt-1 text-sm leading-6 text-subtle">View the decision to continue this issue’s recovery flow.</p></div></div><Button onClick={() => acknowledgeDecision(existingIssue.itemId)} variant="secondary" size="md" className="mt-5">View decision received</Button></div>}<div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Link to="/loader/veh014" className={buttonStyles('secondary', 'lg')}>Return to load</Link>{decision && <Link to="/loader/veh014" className={buttonStyles('primary', 'lg')}>Continue loading</Link>}</div></div></Card></PageContainer>;
  }

  const details = [
  { label: 'Vehicle', value: 'VEH014' },
  { label: 'Trip', value: 'Trip 1' },
  { label: 'Order', value: target.orderId },
  { label: 'Outlet', value: target.outletId },
  { label: 'Item', value: target.itemName }];


  return <PageContainer className="max-w-[1100px]"><PageHeader backTo={{ to: '/loader/veh014', label: 'Vehicle Load' }} title="Loading Shortfall" subtitle="Report this missing or damaged item before departure." /><div className="mt-6"><TripContextBar /></div><div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px] lg:items-start"><Card className="overflow-hidden"><div className="border-b border-amber/30 bg-amber-pale px-5 py-6 md:px-6"><div className="flex gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-amber text-amber-ink"><CircleAlertIcon aria-hidden="true" className="h-5 w-5" /></span><div><h2 className="text-lg font-semibold text-amber-ink">Missing or damaged items before departure</h2><p className="mt-1 max-w-xl text-sm leading-6 text-amber-ink">This report applies only to {target.itemName}. Other shortages must be reported separately.</p></div></div></div><div className="p-5 md:p-6"><div className="grid gap-3 sm:grid-cols-2">{details.map((detail) => <div key={detail.label} className="rounded-2xl bg-canvas/65 px-4 py-3"><p className="text-xs font-semibold text-subtle">{detail.label}</p><p className="mt-1 text-base font-semibold text-ink">{detail.value}</p></div>)}</div><dl className="mt-6 grid grid-cols-3 gap-3"><IssueMetric label="Expected" value={target.expected} /><IssueMetric label="Loaded" value={loaded} /><IssueMetric label="Difference" value={difference} danger detail={type} /></dl><div className="mt-6"><p className="text-sm font-semibold text-ink">Issue type</p><div className="mt-2 max-w-sm"><SegmentedControl label="Issue type" options={[...ISSUE_OPTIONS]} value={type} onChange={setType} selectedClassName="bg-amber text-amber-ink shadow-card" /></div></div><div className="mt-6"><label htmlFor="issue-note" className="text-sm font-semibold text-ink">Short note <span className="font-normal text-subtle">(optional)</span></label><textarea id="issue-note" value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="Add a quick note for Dispatcher" className="mt-2 w-full resize-none rounded-card border border-line bg-surface px-4 py-3 text-sm text-ink outline-none transition-colors duration-150 placeholder:text-muted focus:border-brand focus:ring-2 focus:ring-brand/20" /></div><button type="button" onClick={() => setPhotoAttached((attached) => !attached)} className={`mt-4 inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${photoAttached ? 'border-brand bg-brand-pale text-forest' : 'border-line bg-surface text-ink hover:bg-canvas'}`}><CameraIcon aria-hidden="true" className="h-4 w-4" />{photoAttached ? 'Photo attached' : 'Add photo (optional)'}</button></div><div className="flex flex-col-reverse gap-3 border-t border-line p-5 sm:flex-row sm:justify-end md:p-6"><Link to="/loader/veh014" className={buttonStyles('ghost', 'lg')}>Cancel</Link><Button size="lg" onClick={() => reportIssue(target, type, note, photoAttached)}><SendIcon aria-hidden="true" className="h-4 w-4" />Report Shortfall</Button></div></Card><aside className="rounded-card bg-forest p-6 text-white shadow-pop"><p className="text-sm font-semibold text-white/70">What happens next</p><ol className="mt-5 space-y-4 text-sm"><li className="flex gap-3"><StepNumber>1</StepNumber><span className="leading-6">Dispatcher receives this item-specific exception.</span></li><li className="flex gap-3"><StepNumber>2</StepNumber><span className="leading-6">They decide whether the trip proceeds or the plan changes.</span></li><li className="flex gap-3"><StepNumber>3</StepNumber><span className="leading-6">You receive the latest status and continue loading.</span></li></ol></aside></div></PageContainer>;
}

function findIssueTarget(itemId: string): LoaderIssueTarget | undefined {
  for (const order of LOAD_ORDERS) {
    const item = order.items.find((candidate) => candidate.id === itemId);
    if (item) return { orderId: order.id, outletId: order.outletId, itemId: item.id, itemName: item.name, expected: item.expected, unit: item.unit };
  }
  return undefined;
}

function IssueMetric({ label, value, danger = false, detail }: {label: string;value: number;danger?: boolean;detail?: string;}) {return <div className={`rounded-2xl border p-4 ${danger ? 'border-danger/20 bg-danger-pale' : 'border-line/80 bg-surface'}`}><dt className={`text-xs font-semibold ${danger ? 'text-danger-ink' : 'text-subtle'}`}>{label}</dt><dd className={`mt-2 text-2xl font-semibold tabular-nums ${danger ? 'text-danger-ink' : 'text-ink'}`}>{value}</dd>{detail && <p className="mt-1 text-xs font-medium text-danger-ink">{detail}</p>}</div>;}
function StepNumber({ children }: {children: React.ReactNode;}) {return <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/15 font-semibold ring-1 ring-inset ring-white/15">{children}</span>;}