import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2Icon, CircleAlertIcon } from 'lucide-react';
import { useLoader } from '../contexts/LoaderContext';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { buttonStyles } from '../components/ui/Button';

export function LoaderIssues() {
  const { issues } = useLoader();
  const reportedIssues = Object.values(issues);
  return <PageContainer><PageHeader title="Issues" subtitle="Loading exceptions recorded before departure." />{reportedIssues.length > 0 ? <div className="mt-6 space-y-4">{reportedIssues.map((issue) => <Card key={issue.itemId} className="overflow-hidden"><div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between md:p-6"><div className="flex gap-3"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${issue.decisionReceived ? 'bg-brand-pale text-forest' : 'bg-amber-pale text-amber-ink'}`}>{issue.decisionReceived ? <CheckCircle2Icon aria-hidden="true" className="h-5 w-5" /> : <CircleAlertIcon aria-hidden="true" className="h-5 w-5" />}</span><div><p className="font-semibold text-ink">{issue.orderId} · VEH014</p><p className="mt-1 text-sm text-subtle">{Math.max(0, issue.expected - issue.loaded)} {issue.itemName.toLowerCase()} {issue.type} · {issue.decisionReceived ? 'Approved to proceed' : 'Waiting for Dispatcher decision'}</p></div></div><Link to={`/loader/veh014/issue/${issue.itemId}`} className={buttonStyles('secondary', 'md')}>View issue</Link></div></Card>)}</div> : <Card className="mt-6 p-8 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-pale text-forest"><CheckCircle2Icon aria-hidden="true" className="h-6 w-6" /></span><h2 className="mt-4 text-lg font-semibold text-ink">No loading issues reported</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-subtle">Each missing or damaged item reported from a vehicle load will appear here separately.</p><Link to="/loader" className={`${buttonStyles('secondary', 'md')} mt-5`}>Back to Loading Queue</Link></Card>}</PageContainer>;
}