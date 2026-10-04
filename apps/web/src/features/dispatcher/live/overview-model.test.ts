import { describe, it, expect } from 'vitest';
import type { DispatcherOrderView, TripView, VehicleView, LoadingIssueView } from '@waypoint/contracts';
import { overviewModel } from './overview-model';
describe('Dispatcher overview priorities',()=>{
  const order=(x:Partial<DispatcherOrderView>)=>({id:'O',status:'CONFIRMED',activeTripId:null,deferralCount:0,...x}) as DispatcherOrderView;
  const trip=(x:Partial<TripView>)=>({id:'T',publishedAt:'2026-10-05T00:00:00Z',status:'LOADING',stops:[],...x}) as TripView;
  const vehicle=(x:Partial<VehicleView>)=>({id:'V',availableOnDate:true,allocatedTripCountOnDate:0,remainingFuelL:20,driverId:'driver',...x}) as VehicleView;
  it('counts only unallocated repeat deferrals and completely free vehicles',()=>{
    const result=overviewModel([order({deferralCount:2}),order({status:'RECEIVED',deferralCount:3}),order({activeTripId:'T',deferralCount:2})],[],[vehicle({}),vehicle({allocatedTripCountOnDate:1}),vehicle({driverId:null})],[]);
    expect(result.waiting).toHaveLength(1);expect(result.repeat).toHaveLength(1);expect(result.free).toHaveLength(1);
  });
  it('puts overdue arrivals before loading decisions, recovery and new planning',()=>{
    const result=overviewModel([order({recoveryPending:true,deferralCount:2})],[trip({status:'IN_TRANSIT',stops:[{status:'PLANNED',plannedArrivalAt:'2026-10-05T02:00:00Z'} as TripView['stops'][number]]})],[],[{id:'L',tripId:'T',status:'OPEN'} as LoadingIssueView],Date.parse('2026-10-05T03:00:00Z'));
    expect(result.actions.map(a=>a.id)).toEqual(['late','loading','recovery','repeat','waiting']);
    expect(result.exceptions).toBe(1);
  });
  it('does not label terminal/arrived stops late or resolved loading issues as open',()=>{
    const result=overviewModel([],[trip({status:'IN_TRANSIT',stops:[{status:'DELIVERED',plannedArrivalAt:'2026-10-05T02:00:00Z'} as TripView['stops'][number]]})],[],[{status:'RESOLVED'} as LoadingIssueView],Date.parse('2026-10-05T03:00:00Z'));
    expect(result.late).toHaveLength(0);expect(result.exceptions).toBe(0);expect(result.actions).toHaveLength(0);
  });
});
