import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CircleAlertIcon, ClipboardCheckIcon, PackageCheckIcon, SendIcon } from 'lucide-react';
import { LOAD_ORDERS, VEHICLE_LOAD } from '../data/loader';
import { useLoader } from '../contexts/LoaderContext';
import { computeLoadTotals } from '../utils/loader';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button, buttonStyles } from '../components/ui/Button';
import { TripContextBar } from '../components/loader/TripContextBar';
import { LoadCompletionHero } from '../components/loader/LoadCompletionHero';

interface ShortItem {
  itemId: string;
  orderId: string;
  name: string;
  expected: number;
  loaded: number;
}

export function CompletedLoad() {
  const { issues, quantities, handedOffVehicleIds, confirmHandoff } = useLoader();
  const handedOver = handedOffVehicleIds.includes(VEHICLE_LOAD.vehicleId);
  const ordersWithActuals = useMemo(() => LOAD_ORDERS.map((order) => ({
    ...order,
    items: order.items.map((item) => ({ ...item, loaded: quantities[item.id] ?? item.loaded }))
  })), [quantities]);
  const totals = useMemo(() => computeLoadTotals(ordersWithActuals), [ordersWithActuals]);
  const shortItems = useMemo<ShortItem[]>(() => ordersWithActuals.flatMap((order) => order.items.
  filter((item) => item.loaded < item.expected).
  map((item) => ({ itemId: item.id, orderId: order.id, name: item.name, expected: item.expected, loaded: item.loaded }))), [ordersWithActuals]);
  const reportedIssues = Object.values(issues);
  const unresolved = shortItems.filter((item) => !issues[item.itemId]?.decisionReceived);
  const canDepart = unresolved.length === 0;

  return <PageContainer className="max-w-[1120px]">
    <PageHeader backTo={{ to: '/loader/veh014', label: 'Vehicle Load' }} title="Load Completion" subtitle="Review every shortfall before handing off to Driver." />
    <div className="mt-6"><TripContextBar /></div>
    <Card className="mt-5 overflow-hidden">
      <LoadCompletionHero vehicleId={VEHICLE_LOAD.vehicleId} title={handedOver ? 'Trip handed over for departure' : canDepart ? 'Ready to Depart' : 'Shortfall action required'} subtitle={`${VEHICLE_LOAD.trip} · ${VEHICLE_LOAD.brand} · ${VEHICLE_LOAD.departure} departure · ${VEHICLE_LOAD.stops} stops`} />
      <div className="p-5 md:p-7">
        <section aria-label="Load completion summary" className="grid gap-3 sm:grid-cols-3">
          <CompletionMetric label="Orders" value={`${totals.orderCount} / ${totals.orderCount}`} detail="accounted for" tone="neutral" />
          <CompletionMetric label="Items" value={`${totals.loaded} / ${totals.expected}`} detail="loaded" tone="neutral" />
          <CompletionMetric label="Exceptions" value={String(reportedIssues.length)} detail={reportedIssues.length === 1 ? 'recorded' : 'recorded separately'} tone={reportedIssues.length > 0 ? 'warning' : 'neutral'} />
        </section>

        {shortItems.length > 0 && <section aria-labelledby="exceptions-heading" className="mt-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><h2 id="exceptions-heading" className="text-xl font-semibold tracking-tight text-ink">Loading exceptions</h2><p className="mt-1 text-sm text-subtle">Each short item requires its own report and Dispatcher decision.</p></div><span className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${canDepart ? 'bg-brand-pale text-forest' : 'bg-amber-pale text-amber-ink'}`}>{canDepart ? 'All cleared' : `${unresolved.length} action ${unresolved.length === 1 ? 'remaining' : 'remaining'}`}</span></div>
          <div className="mt-4 space-y-3">{shortItems.map((item) => {
              const issue = issues[item.itemId];
              const status = issue?.decisionReceived ? 'approved' : issue ? 'waiting' : 'unreported';
              return <div key={item.itemId} className="flex flex-col gap-4 rounded-card border border-line/80 bg-surface p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${status === 'approved' ? 'bg-brand-pale text-forest' : 'bg-amber-pale text-amber-ink'}`}>{status === 'approved' ? <PackageCheckIcon aria-hidden="true" className="h-5 w-5" /> : <CircleAlertIcon aria-hidden="true" className="h-5 w-5" />}</span><div><p className="font-semibold text-ink">{item.orderId} · {item.name}</p><p className="mt-1 text-sm text-subtle">Expected {item.expected} · Loaded {item.loaded} · <span className="font-semibold text-danger-ink">Short {item.expected - item.loaded}</span></p><p className={`mt-2 text-xs font-semibold ${status === 'approved' ? 'text-forest' : 'text-amber-ink'}`}>{status === 'approved' ? 'Approved to proceed' : status === 'waiting' ? 'Reported · Waiting for Dispatcher decision' : 'Not reported'}</p></div></div>{status === 'unreported' ? <Link to={`/loader/veh014/issue/${item.itemId}`} className={buttonStyles('outline', 'md')}>Report issue</Link> : <Link to={`/loader/veh014/issue/${item.itemId}`} className={buttonStyles('secondary', 'md')}>{status === 'waiting' ? 'View issue' : 'View decision'}</Link>}</div>;
            })}</div>
        </section>}

        <section aria-labelledby="audit-heading" className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div><div><h2 id="audit-heading" className="text-xl font-semibold tracking-tight text-ink">Loading audit</h2><p className="mt-1 text-sm text-subtle">A timestamped record of this handoff.</p></div><ol className="mt-5"><AuditEvent title="Loading started" time="4:08 AM" />{reportedIssues.map((issue, index) => <React.Fragment key={issue.itemId}><AuditEvent title={`${issue.expected - issue.loaded} ${issue.itemName.toLowerCase()} reported ${issue.type}`} time={index === 0 ? '4:19 AM' : '4:21 AM'} detail={issue.orderId} warning />{issue.decisionReceived && <AuditEvent title={`${issue.itemName} shortfall acknowledged`} time={index === 0 ? '4:23 AM' : '4:25 AM'} detail="Decision received — proceed with recorded shortfall" />}</React.Fragment>)}{canDepart && <AuditEvent title="Loading completed" time="4:31 AM" />}{handedOver && <AuditEvent title="Ready to depart" time="4:32 AM" last />}</ol></div>
          <aside className="rounded-card border border-brand/15 bg-brand-pale p-5"><span className="grid h-10 w-10 place-items-center rounded-full bg-surface text-forest shadow-card"><PackageCheckIcon aria-hidden="true" className="h-5 w-5" /></span><h2 className="mt-4 text-lg font-semibold text-forest">Driver handoff</h2><p className="mt-2 text-sm leading-6 text-forest/75">The completed loading record and every approved shortfall remain attached to this vehicle before departure.</p></aside>
        </section>

        {!canDepart && <div role="status" className="mt-7 rounded-card border border-amber/40 bg-amber-pale p-5"><div className="flex gap-3"><CircleAlertIcon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-amber-ink" /><div><p className="font-semibold text-amber-ink">Confirm Ready to Depart is unavailable</p><p className="mt-1 text-sm leading-6 text-amber-ink">Resolve {unresolved.length} remaining {unresolved.length === 1 ? 'shortage' : 'shortages'} first: {unresolved.map((item) => `${item.name} (${issues[item.itemId] ? 'waiting for decision' : 'not reported'})`).join(', ')}.</p></div></div></div>}
        <div className="mt-5 flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-end"><Link to="/loader" className={buttonStyles('secondary', 'lg')}>Back to Loading Queue</Link><Button size="lg" onClick={() => confirmHandoff(VEHICLE_LOAD.vehicleId)} disabled={handedOver || !canDepart}><SendIcon aria-hidden="true" className="h-4 w-4" />{handedOver ? 'Handoff confirmed' : 'Confirm Ready to Depart'}</Button></div>
      </div>
    </Card>
  </PageContainer>;
}

function CompletionMetric({ label, value, detail, tone }: {label: string;value: string;detail: string;tone: 'neutral' | 'warning';}) {
  return <div className={`rounded-card border p-5 ${tone === 'warning' ? 'border-amber/30 bg-amber-pale' : 'border-line/70 bg-canvas/65'}`}><p className={`text-sm font-medium ${tone === 'warning' ? 'text-amber-ink' : 'text-subtle'}`}>{label}</p><p className={`mt-3 text-[30px] font-semibold leading-none tabular-nums ${tone === 'warning' ? 'text-amber-ink' : 'text-ink'}`}>{value}</p><p className={`mt-2 text-xs font-medium ${tone === 'warning' ? 'text-amber-ink' : 'text-subtle'}`}>{detail}</p></div>;
}

function AuditEvent({ title, time, detail, warning = false, last = false }: {title: string;time: string;detail?: string;warning?: boolean;last?: boolean;}) {
  return <li className="relative flex gap-4 pb-5 last:pb-0"><span aria-hidden="true" className={`relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full ${warning ? 'bg-amber-pale text-amber-ink ring-1 ring-inset ring-amber/35' : 'bg-brand-pale text-forest ring-1 ring-inset ring-brand/20'}`}>{warning ? <ClipboardCheckIcon className="h-4 w-4" /> : <PackageCheckIcon className="h-4 w-4" />}</span>{!last && <span aria-hidden="true" className="absolute left-[15px] top-8 h-[calc(100%-12px)] w-0.5 bg-line" />}<div className="min-w-0 flex-1"><div className="flex flex-wrap items-baseline justify-between gap-2"><p className="text-sm font-semibold text-ink">{title}</p><time className="text-xs font-medium tabular-nums text-subtle">{time}</time></div>{detail && <p className="mt-1 text-sm leading-6 text-subtle">{detail}</p>}</div></li>;
}