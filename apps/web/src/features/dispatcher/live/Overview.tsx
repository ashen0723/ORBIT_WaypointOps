import { CircleCheck, RefreshCw } from 'lucide-react';
import { ErrorPanel } from '../../../components/shared/ui';
import { useDispatcher } from './context';
import { useOverview } from './overview-context';
import { StatCard } from './reference/StatCard';
import { FeaturedAction } from './reference/FeaturedAction';
import { ActionRow } from './reference/ActionRow';
import { WorkflowBar } from './reference/WorkflowBar';
export function scopeName(depots: {id:string;name:string}[], depotId: string) { return depotId ? depots.find(d=>d.id===depotId)?.name ?? 'Selected depot' : depots.map(d=>d.name).join(' & ') || 'All depots'; }
export function Dashboard() {
  const data=useOverview(), {date,depots,depotId}=useDispatcher();
  const [first,...rest]=data.actions;
  const stats=[
    {label:'Orders Waiting',value:data.ordersReady?data.waiting.length:'—',hint:'Need a trip · all dates',to:'/orders?allDates=1'},
    {label:'Trips Loading',value:data.tripsReady?data.loading.length:'—',hint:`${data.loading.filter(t=>t.status==='READY').length} ready to depart`,to:'/loading'},
    {label:'Vehicles Free Today',value:data.fleetReady?data.free.length:'—',hint:`of ${data.fleet.length} vehicles`,to:'/vehicles'},
    {label:'Loading Exceptions',value:data.tripsReady&&data.issuesReady?data.exceptions:'—',hint:data.exceptions?'Need a decision':'None',to:'/loading',alert:data.exceptions>0},
    {label:'On the Road',value:data.tripsReady?data.road.length:'—',hint:data.late.length?`${data.late.length} delayed`:'No overdue stops',to:'/monitoring',alert:data.late.length>0},
    {label:'Deferred 2+ times',value:data.ordersReady?data.repeat.length:'—',hint:'Planned first',to:'/deferrals',alert:data.repeat.length>0},
  ];
  return <div className="dispatch-overview">
    <div className="dispatch-page-title"><div><h1>Dispatcher Overview</h1><p>{new Date(`${date}T12:00:00+05:30`).toLocaleDateString('en-GB',{timeZone:'Asia/Colombo',weekday:'long',day:'numeric',month:'long',year:'numeric'})} · {scopeName(depots,depotId)}</p></div><button className="dispatch-refresh" aria-label="Refresh dashboard" onClick={data.refresh}><RefreshCw size={18}/></button></div>
    <ErrorPanel error={data.error} retry={data.refresh}/>
    <section aria-label="At a glance" className="dispatch-overview-stats">{stats.map(s=><StatCard key={s.label} {...s}/>)}</section>
    <section className="dispatch-overview-actions" aria-labelledby="actions-title"><div className="dispatch-action-heading"><h2 id="actions-title">Action Required</h2>{data.actions.length>0&&<p>{data.actions.length} tasks · most urgent first</p>}</div>
    {!first ? <div className="dispatch-panel dispatch-clear"><CircleCheck size={25}/><p>{data.busy?'Checking live operations…':data.error?'Some operations could not be checked. Retry to see all actions.':'All caught up. Nothing needs you right now.'}</p></div> : <div className="dispatch-feature-grid"><FeaturedAction item={first}/>{rest.length>0&&<div className="dispatch-next-actions"><h3>Then</h3><ul>{rest.map(item=><ActionRow key={item.id} item={item}/>)}</ul></div>}</div>}
    </section>
    <section className="dispatch-workflow"><h2>How a delivery moves</h2><WorkflowBar className="mt-3"/><p>If an order can’t be delivered:</p><WorkflowBar variant="defer" className="mt-2"/></section>
  </div>;
}
