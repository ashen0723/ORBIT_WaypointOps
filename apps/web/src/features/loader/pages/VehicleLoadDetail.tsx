import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CheckIcon, CircleAlertIcon, ListOrderedIcon } from 'lucide-react';
import { LOAD_ORDERS, VEHICLE_LOAD } from '../data/loader';
import { useLoader } from '../contexts/LoaderContext';
import { computeLoadTotals, loadCheckPercent } from '../utils/loader';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { buttonStyles } from '../components/ui/Button';
import { QuantityStepper } from '../components/loader/QuantityStepper';
import { TripContextBar } from '../components/loader/TripContextBar';
import { ChilledTag } from '../components/orders/ChilledTag';
export function VehicleLoadDetail() {
  const {
    issues,
    quantities,
    confirmedItemIds,
    setLoadedQuantity,
    markItemLoaded
  } = useLoader();
  const totals = useMemo(() => computeLoadTotals(LOAD_ORDERS.map((order) => ({
    ...order,
    items: order.items.map((item) => ({
      ...item,
      loaded: quantities[item.id] ?? item.loaded
    }))
  }))), [quantities]);
  const percent = loadCheckPercent(totals);
  const reportedIssues = Object.values(issues);
  const waitingCount = reportedIssues.filter((issue) => !issue.decisionReceived).length;
  return <PageContainer>
      <PageHeader backTo={{
      to: '/loader',
      label: 'Loading Queue'
    }} title="Vehicle Load" subtitle="Confirm every assigned item before departure." />
      <div className="mt-6"><TripContextBar /></div>

      <section className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Card className="p-5 md:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="text-sm font-semibold text-forest">Active vehicle</p><h2 className="mt-2 text-[40px] font-semibold leading-none tabular-nums tracking-tight text-ink">{VEHICLE_LOAD.vehicleId}</h2><p className="mt-3 text-sm leading-6 text-subtle">{VEHICLE_LOAD.type} · {VEHICLE_LOAD.departure} departure · {VEHICLE_LOAD.stops} stops</p></div>
            <div className="min-w-[220px] rounded-2xl border border-brand/15 bg-brand-pale/55 p-4"><div className="flex items-baseline justify-between gap-3"><p className="text-sm font-semibold text-forest">Load check</p><p className="text-lg font-semibold tabular-nums text-forest">{percent}%</p></div><div className="mt-3 h-3 overflow-hidden rounded-full bg-surface ring-1 ring-inset ring-brand/10"><div className="h-full rounded-full bg-brand transition-[width] duration-200" style={{ width: `${percent}%` }} /></div><p className="mt-3 text-xs font-medium text-subtle">{totals.loaded} / {totals.expected} units accounted for</p></div>
          </div>
        </Card>
        <Link to="/loader/veh014/stops" className="group flex min-h-[116px] h-full items-center gap-4 rounded-card border border-forest bg-forest p-5 text-left text-white shadow-card transition-[background-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">
          <span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15 ring-1 ring-inset ring-white/25">
            <ListOrderedIcon className="h-6 w-6" strokeWidth={2.25} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-base font-semibold">Stop sequence</span>
            <span className="mt-1 block text-sm leading-5 text-white/75">Arrange goods for each planned unloading stop.</span>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-white">Open loading plan <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1">→</span></span>
          </span>
        </Link>
      </section>

      {reportedIssues.length > 0 && <div className="mt-5 rounded-card border border-amber/40 bg-amber-pale px-5 py-4 shadow-card"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber text-amber-ink"><CircleAlertIcon aria-hidden="true" className="h-5 w-5" /></span><div><p className="font-semibold text-amber-ink">{reportedIssues.length} loading {reportedIssues.length === 1 ? 'issue' : 'issues'} reported</p><p className="mt-1 text-sm text-amber-ink">{waitingCount > 0 ? `${waitingCount} waiting for Dispatcher decision` : 'All reported issues approved to proceed'}</p></div></div><Link to="/loader/issues" className={buttonStyles('secondary', 'sm')}>View reported issues</Link></div></div>}

      <section aria-labelledby="assigned-items-heading" className="mt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 id="assigned-items-heading" className="text-2xl font-semibold tracking-tight text-ink">Assigned orders & items</h2><p className="mt-1 text-sm leading-6 text-subtle">Start with Stop 1 items. Record the actual quantity as goods enter the vehicle.</p></div><span className="inline-flex w-fit items-center rounded-full bg-brand-pale px-3 py-1.5 text-sm font-semibold text-forest ring-1 ring-inset ring-brand/20">Stop 1 loading now</span></div>
        <div className="mt-4 space-y-4">
          {LOAD_ORDERS.map((order) => {
          const activeStop = order.stop === 1;
          return <Card key={order.id} className="overflow-hidden">
                <div className="flex flex-col gap-3 border-b border-line bg-canvas/55 px-5 py-5 sm:flex-row sm:items-center sm:justify-between md:px-6"><div><p className="text-sm font-semibold text-ink">{order.outletId} <span className="font-normal text-subtle">· Stop {order.stop}</span></p><p className="mt-1 text-sm text-subtle">{order.outletName} · {order.location}{order.weightKg ? ` · ${order.weightKg} kg · ${order.volumeM3} m³` : ''}</p></div><span className="self-start rounded-full bg-surface px-3 py-1.5 text-xs font-semibold text-ink shadow-card ring-1 ring-inset ring-line">{order.id}</span></div>
                <ul className="divide-y divide-line">
                  {order.items.map((item) => {
                const loaded = quantities[item.id] ?? item.loaded;
                const short = loaded < item.expected;
                const confirmed = confirmedItemIds.includes(item.id);
                const itemIssue = issues[item.id];
                return <li key={item.id} className="flex flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:px-6"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-base font-semibold text-ink">{item.name}</p>{item.condition === 'chilled' && <ChilledTag />}</div><p className="mt-1.5 text-sm text-subtle">Expected <span className="font-semibold text-ink">{item.expected}</span> {item.unit}</p></div><div className="flex flex-wrap items-center gap-3"><QuantityStepper label={`${item.name} loaded quantity`} value={loaded} maximum={item.maxAvailable ?? item.expected} onChange={(value) => setLoadedQuantity(item.id, value)} />{short ? itemIssue ? <Link to={`/loader/veh014/issue/${item.id}`} className={`${buttonStyles('secondary', 'md')} !bg-brand-pale !text-forest`}><CheckIcon aria-hidden="true" className="h-4 w-4" />Reported</Link> : <Link to={`/loader/veh014/issue/${item.id}`} className={buttonStyles('outline', 'md')}>Report issue</Link> : confirmed ? <span className="inline-flex h-10 items-center gap-1.5 rounded-full bg-brand-pale px-3.5 text-sm font-semibold text-forest ring-1 ring-inset ring-brand/20"><CheckIcon aria-hidden="true" className="h-4 w-4" /> Loaded</span> : <button type="button" onClick={() => markItemLoaded(item.id, item.expected)} className={buttonStyles('secondary', 'md')}><CheckIcon aria-hidden="true" className="h-4 w-4" />Mark loaded</button>}</div></li>;
              })}
                </ul>
                {!activeStop && <div className="border-t border-line px-5 py-3 text-sm text-subtle md:px-6">Keep these items accessible for Stop {order.stop}.</div>}
              </Card>;
        })}
        </div>
      </section>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Link to="/loader/veh014/complete" className={buttonStyles('primary', 'lg')}>Complete load check</Link></div>
    </PageContainer>;
}