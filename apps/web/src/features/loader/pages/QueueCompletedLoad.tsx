import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ClipboardCheckIcon } from 'lucide-react';
import { LOAD_QUEUE } from '../data/loader';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { buttonStyles } from '../components/ui/Button';
import { LoadCompletionHero } from '../components/loader/LoadCompletionHero';

export function QueueCompletedLoad() {
  const { vehicleId } = useParams();
  const load = LOAD_QUEUE.find((item) => item.vehicleId.toLowerCase() === vehicleId?.toLowerCase());
  if (!load) return <PageContainer><Card className="mx-auto max-w-lg p-8 text-center"><h1 className="text-xl font-semibold text-ink">Load not found</h1><Link to="/loader" className={`${buttonStyles('primary', 'md')} mt-6`}>Back to Loading Queue</Link></Card></PageContainer>;

  return <PageContainer className="max-w-[900px]"><PageHeader backTo={{ to: '/loader', label: 'Loading Queue' }} title="Completed Load" subtitle={`${load.vehicleId} · ${load.trip} · ${load.brand}`} /><Card className="mt-6 overflow-hidden"><LoadCompletionHero vehicleId={load.vehicleId} title="Load completed" subtitle={`${load.trip} · ${load.brand} · departed ${load.departure}`} /><div className="p-6 md:p-8"><div className="flex gap-3 rounded-card border border-brand/15 bg-brand-pale/70 p-5"><ClipboardCheckIcon aria-hidden="true" className="mt-0.5 h-5 w-5 text-forest" /><div><p className="font-semibold text-forest">Loading record complete</p><p className="mt-1 text-sm leading-6 text-forest/75">This completed vehicle is retained for quick handoff and audit review.</p></div></div><div className="mt-7 flex justify-end"><Link to="/loader" className={buttonStyles('primary', 'lg')}>Back to Loading Queue</Link></div></div></Card></PageContainer>;
}