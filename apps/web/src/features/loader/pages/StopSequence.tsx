import React from 'react';
import { Link } from 'react-router-dom';
import { CheckIcon, PackageOpenIcon } from 'lucide-react';
import { LOAD_STOPS_ORIGINAL } from '../data/loader';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { buttonStyles } from '../components/ui/Button';
import { TripContextBar } from '../components/loader/TripContextBar';

export function StopSequence() {
  return (
    <PageContainer>
      <PageHeader backTo={{ to: '/loader/veh014', label: 'Vehicle Load' }} title="Stop Sequence" subtitle="Arrange goods for the planned unloading order." />
      <div className="mt-6"><TripContextBar /></div>

      <section className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_310px] lg:items-start">
        <Card className="overflow-hidden p-5 md:p-7">
          <div className="flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div><h2 className="text-xl font-semibold tracking-tight text-ink">Load in unloading order</h2><p className="mt-1 max-w-xl text-sm leading-6 text-subtle">Keep later-stop goods accessible according to this active loading plan.</p></div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-brand-pale px-3 py-1.5 text-xs font-semibold text-forest"><PackageOpenIcon aria-hidden="true" className="h-3.5 w-3.5" />4 stops</span>
          </div>
          <ol className="mt-6">
            {LOAD_STOPS_ORIGINAL.map((stop, index) =>
            <li key={stop.number} className="relative flex gap-4 pb-6 last:pb-0">
                <span aria-hidden="true" className="relative z-10 grid h-11 w-11 shrink-0 place-items-center rounded-full bg-forest text-base font-semibold text-white shadow-card">{stop.number}</span>
                {index < LOAD_STOPS_ORIGINAL.length - 1 && <span aria-hidden="true" className="absolute left-[21px] top-11 h-[calc(100%-20px)] w-0.5 bg-brand-mint/75" />}
                <div className="min-w-0 flex-1 rounded-2xl border border-transparent px-1 pb-6 last:pb-0">
                  <div className="flex flex-wrap items-center gap-2"><p className="text-xs font-semibold tracking-wide text-subtle">STOP {stop.number}</p>{stop.number === 1 && <span className="rounded-full bg-brand-pale px-2.5 py-1 text-xs font-semibold text-forest">Load first</span>}</div>
                  <h3 className="mt-1 text-xl font-semibold tracking-tight text-ink">{stop.outletId}</h3>
                  <p className="mt-1 text-sm text-subtle">{stop.outletName} · {stop.location}</p>
                  <div className="mt-4 flex flex-wrap gap-2"><span className="rounded-full bg-canvas px-3 py-1.5 text-xs font-semibold text-ink">{stop.orderIds.join(' · ')}</span><span className="rounded-full bg-canvas px-3 py-1.5 text-xs font-semibold text-subtle">{stop.conditions}</span></div>
                </div>
              </li>
            )}
          </ol>
        </Card>
        <aside className="rounded-card bg-forest p-6 text-white shadow-pop"><span className="grid h-10 w-10 place-items-center rounded-full bg-white/15 ring-1 ring-white/20"><CheckIcon aria-hidden="true" className="h-5 w-5" strokeWidth={3} /></span><h2 className="mt-5 text-xl font-semibold tracking-tight">Current loading plan</h2><p className="mt-2 text-sm leading-6 text-white/75">This digital sequence is the source of truth for staging and unloading access.</p><Link to="/loader/veh014" className={`${buttonStyles('secondary', 'md', true)} mt-6 !border-white/25 !bg-white/10 !text-white hover:!bg-white/20`}>Back to loading</Link></aside>
      </section>
    </PageContainer>);

}