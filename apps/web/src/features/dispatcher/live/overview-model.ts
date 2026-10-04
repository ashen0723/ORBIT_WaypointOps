import { AlarmClock, CalendarClock, PackageCheck, Route, Send, TriangleAlert, type LucideIcon } from 'lucide-react';
import type { DispatcherOrderView, LoadingIssueView, TripView, VehicleView } from '@waypoint/contracts';
export interface ActionItem { id: string; title: string; next: string; cta: string; to: string; tone: 'danger' | 'amber' | 'brand'; icon: LucideIcon }
export function overviewModel(orders: DispatcherOrderView[], trips: TripView[], fleet: VehicleView[], issues: LoadingIssueView[], now = Date.now(), runDate?: string) {
  const waiting = orders.filter(o => !o.activeTripId && ['CONFIRMED', 'DEFERRED'].includes(o.status));
  const repeat = waiting.filter(o => o.deferralCount >= 2);
  const loading = trips.filter(t => t.publishedAt && ['CONFIRMED','LOADING','READY'].includes(t.status));
  const road = trips.filter(t => t.status === 'IN_TRANSIT');
  const late = road.filter(t => t.stops.some(s => s.status === 'PLANNED' && Date.parse(s.plannedArrivalAt) < now));
  const openIssues = issues.filter(i => i.status !== 'RESOLVED');
  const unavailable = loading.filter(t => fleet.some(v => v.id === t.vehicleId && !v.availableOnDate));
  const exceptions = new Set([...openIssues.map(i => i.tripId), ...unavailable.map(t => t.id)]).size;
  const free = fleet.filter(v => v.availableOnDate && v.allocatedTripCountOnDate === 0 && v.driverId && v.remainingFuelL > 0);
  const unpublished = trips.filter(t => !t.publishedAt);
  const recovery = orders.filter(o => o.recoveryPending && (!runDate || (o.plannedDate ?? o.requestedDate) === runDate));
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const actions: ActionItem[] = [];
  if(unavailable.length) actions.push({id:'vehicle',title:`${plural(unavailable.length,'trip')} blocked by an unavailable vehicle`,next:'Stop loading, reconcile any loaded goods, and assign a suitable replacement.',cta:'Replace Vehicle',to:`/trips/${unavailable[0].id}`,tone:'danger',icon:TriangleAlert});
  if(late.length) actions.push({id:'late',title:`${plural(late.length,'trip')} running late`,next:'A stop is past its planned arrival. Review progress and any Driver reports.',cta:'View Delivery',to:'/monitoring',tone:'danger',icon:AlarmClock});
  if(openIssues.length) actions.push({id:'loading',title:`${plural(openIssues.length,'loading exception')} to review`,next:'Review the shortage or damage and confirm a loading decision.',cta:'View Loading',to:'/loading',tone:'danger',icon:PackageCheck});
  if(recovery.length) actions.push({id:'recovery',title:`${plural(recovery.length,'order')} awaiting recovery`,next:'Review delivery evidence and decide how to resolve outstanding goods.',cta:'Review Delivery',to:'/monitoring',tone:'danger',icon:TriangleAlert});
  if(repeat.length) actions.push({id:'repeat',title:`${plural(repeat.length,'order')} deferred 2+ times`,next:'These are planned first. Allocate them before new orders.',cta:'View Deferrals',to:'/deferrals',tone:'amber',icon:CalendarClock});
  if(unpublished.length) actions.push({id:'publish',title:`${plural(unpublished.length,'trip')} waiting to publish`,next:'Review the allocated plan, then publish it to the Loader.',cta:'Review Trips',to:'/trips',tone:'amber',icon:Send});
  if(waiting.length) actions.push({id:'waiting',title:`${plural(waiting.length,'order')} waiting for a trip`,next:'Group orders into a trip and choose a vehicle.',cta:'Plan Trips',to:`/planning?orderId=${encodeURIComponent(waiting[0].id)}`,tone:'brand',icon:Route});
  return { waiting, repeat, loading, road, late, exceptions, free, actions };
}
