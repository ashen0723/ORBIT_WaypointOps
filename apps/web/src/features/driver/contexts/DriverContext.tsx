import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { DRIVER, TRIPS } from '../data/driver';
import type { ConnectionState, DeliveryStatus, SyncState } from '../types/driver';
import { resolvedStatuses, validateDelivery, type DeliveryDraft, type DriverAction, type DriverIntegration, type StopRecord } from '../integration/driver';

function useDriverState(integration?: DriverIntegration, user?: {name: string; email: string} | null) {
  const [snapshot, setSnapshot] = useState(() => integration?.getSnapshot());
  const [connection, setConnection] = useState<ConnectionState>(navigator.onLine ? 'online' : 'offline');
  const [loaderFlagsAcknowledged, setAcknowledged] = useState<Record<string, boolean>>({});
  const [demoDeparted, setDemoDeparted] = useState<Record<string, boolean>>({});
  const [demoRecords, setDemoRecords] = useState<Record<string, StopRecord>>({});
  const [issueReports, setIssueReports] = useState<Extract<DriverAction, {kind: 'issue'}>[]>([]);
  const busy = useRef(new Set<string>());
  const accepted = useRef(new Set<string>());
  const trips = snapshot?.trips ?? TRIPS;
  const stopRecords = snapshot?.stopRecords ?? demoRecords;
  const departedTrips = snapshot?.departedTrips ?? demoDeparted;
  const actions = snapshot?.actions ?? [];
  const [error, setError] = useState<string | null>(null);
  useEffect(() => integration?.subscribe(() => setSnapshot(integration.getSnapshot())), [integration]);
  useEffect(() => {
    const update = () => setConnection(navigator.onLine ? 'online' : 'offline');
    window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  const getStopRecord = (tripId: string, sequence: number): StopRecord => stopRecords[`${tripId}-${sequence}`] ?? { status: departedTrips[tripId] ? 'Out for delivery' : trips.find(t => t.id === tripId)?.status ?? 'Planned', photoCount: 0 };
  const getNextStopSequence = (tripId: string) => trips.find(t => t.id === tripId)?.stops.find(s => !resolvedStatuses.includes(getStopRecord(tripId, s.sequence).status))?.sequence ?? null;
  const isTripResolved = (tripId: string) => Boolean(trips.find(t => t.id === tripId)?.stops.length) && getNextStopSequence(tripId) === null;
  const submit = async (action: DriverAction, apply: (state: SyncState) => void) => {
    const key = `${action.tripId}-${'sequence' in action ? action.sequence : action.kind}`;
    const actionKey = `${key}-${action.kind}`;
    if (action.kind !== 'issue' && accepted.current.has(actionKey)) throw new Error('This action has already been accepted.');
    if (busy.current.has(key)) throw new Error('This action is already being processed.');
    busy.current.add(key); setError(null);
    try {
      const state = integration ? await integration.submit(action) : 'Demo only';
      if (state === 'Failed' || state === 'Conflict' || state === 'Needs attention') throw new Error('Action was not accepted. Review the sync panel.');
      if (action.kind !== 'issue') accepted.current.add(actionKey);
      if (!integration) apply(state);
      else setSnapshot(integration.getSnapshot());
      return state;
    } catch (cause) { const message = cause instanceof Error ? cause.message : 'Could not save action.'; setError(message); throw new Error(message); }
    finally { busy.current.delete(key); }
  };
  return {
    identity: { ...(snapshot?.assignment ?? (integration ? { ...DRIVER, vehicle: 'Assignment unavailable', vehicleType: '', depot: '' } : DRIVER)), name: user?.name ?? snapshot?.assignment?.name ?? 'Demo driver', email: user?.email ?? snapshot?.assignment?.email ?? 'Demo account', date: new Date().toLocaleDateString('en-GB', { timeZone: 'Asia/Colombo' }) },
    trips, connection: connection === 'online' && actions.some(a => a.state === 'Syncing') ? 'syncing' as const : connection, loaderFlagsAcknowledged, departedTrips, stopRecords, actions, error, issueReports,
    demoMode: !integration, offlineSince: connection === 'offline' ? 'network unavailable' : null,
    lastSyncedAt: snapshot?.lastSyncedAt ?? 'Never — demo data',
    conflictPending: actions.some(a => a.state === 'Conflict'), offlineIssueReports: actions.filter(a => a.kind === 'issue' && a.state !== 'Synced').length,
    getStopRecord, getNextStopSequence, isTripResolved,
    getTripStatus: (tripId: string): DeliveryStatus => isTripResolved(tripId) && departedTrips[tripId] ? 'Delivered' : departedTrips[tripId] ? 'Out for delivery' : trips.find(t => t.id === tripId)?.status ?? 'Planned',
    acknowledgeLoaderFlags: (tripId: string, value: boolean) => setAcknowledged(c => ({ ...c, [tripId]: value })),
    departTrip: async (tripId: string) => {
      const trip = trips.find(t => t.id === tripId);
      if (!trip || (trip.loaderFlag && !loaderFlagsAcknowledged[tripId])) throw new Error('Acknowledge loader flags before departure.');
      if (trip.status !== 'Loaded') throw new Error('This trip has not been released ready for departure.');
      if (departedTrips[tripId]) throw new Error('Trip has already departed.');
      return submit({ kind: 'departure', tripId }, () => setDemoDeparted(c => ({ ...c, [tripId]: true })));
    },
    recordArrival: async (tripId: string, sequence: number, at: string) => {
      if (!departedTrips[tripId] || getNextStopSequence(tripId) !== sequence || getStopRecord(tripId, sequence).status === 'Arrived') throw new Error('Depart first and follow the unresolved stop sequence.');
      const stop = trips.find(t => t.id === tripId)?.stops.find(s => s.sequence === sequence);
      return submit({ kind: 'arrival', tripId, sequence, stopId: stop?.id, orderId: stop?.orderId, at }, syncState => setDemoRecords(c => ({ ...c, [`${tripId}-${sequence}`]: { status: 'Arrived', arrivedAt: at, syncState, photoCount: 0 } })));
    },
    completeDelivery: async (tripId: string, sequence: number, delivery: DeliveryDraft, at: string) => {
      const stop = trips.find(t => t.id === tripId)?.stops.find(s => s.sequence === sequence);
      if (!stop || getStopRecord(tripId, sequence).status !== 'Arrived') throw new Error('Record arrival before completing an unresolved stop.');
      const invalid = validateDelivery(stop.items, delivery); if (invalid) throw new Error(invalid);
      const status: DeliveryStatus = delivery.outcome === 'full' ? 'Delivered' : delivery.outcome === 'partial' ? 'Partially delivered' : 'Failed';
      return submit({ kind: 'outcome', tripId, sequence, stopId: stop.id, orderId: stop.orderId, delivery, at }, syncState => setDemoRecords(c => ({ ...c, [`${tripId}-${sequence}`]: { ...c[`${tripId}-${sequence}`], status, outcome: delivery.outcome, completedAt: at, syncState, photoCount: delivery.photos.length, delivery } })));
    },
    fileIssueReport: async (action: Extract<DriverAction, { kind: 'issue' }>) => submit(action, () => setIssueReports(current => [...current, action])),
    retryAction: async (id: string) => { try { await integration?.retryAction(id); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Retry failed.'); } },
    acknowledgeConflict: async (id: string) => { try { await integration?.acknowledgeConflict(id); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Review failed.'); } }
  };
}
const DriverContext = createContext<ReturnType<typeof useDriverState> | null>(null);
export function DriverProvider({ children, integration, user }: { children: React.ReactNode; integration?: DriverIntegration; user?: {name: string; email: string} | null }) {
  return <DriverContext.Provider value={useDriverState(integration, user)}>{children}</DriverContext.Provider>;
}
export function useDriver() { const value = useContext(DriverContext); if (!value) throw new Error('useDriver must be used within DriverProvider'); return value; }
