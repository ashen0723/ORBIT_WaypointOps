import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ConnectionState, DeliveryOutcome, DeliveryStatus, SyncState } from '../types/driver';
import { TRIPS } from '../data/driver';
import { addMinutes } from '../utils/driverTime';
import { useScreenInit } from '../useScreenInit.js';

interface StopRecord {
  status: DeliveryStatus;
  arrivedAt?: string;
  completedAt?: string;
  outcome?: DeliveryOutcome;
  syncState?: SyncState;
  photoCount: number;
}

type StopKey = string;

const stopKey = (tripId: string, sequence: number): StopKey => `${tripId}-${sequence}`;

interface DriverContextValue {
  connection: ConnectionState;
  offlineSince: string | null;
  lastSyncedAt: string;
  loaderFlagsAcknowledged: Record<string, boolean>;
  departedTrips: Record<string, boolean>;
  stopRecords: Record<StopKey, StopRecord>;
  conflictPending: boolean;
  offlineIssueReports: number;
  getStopRecord: (tripId: string, sequence: number) => StopRecord;
  getTripStatus: (tripId: string) => DeliveryStatus;
  getNextStopSequence: (tripId: string) => number | null;
  isTripResolved: (tripId: string) => boolean;
  acknowledgeLoaderFlags: (tripId: string, value: boolean) => void;
  departTrip: (tripId: string) => void;
  recordArrival: (tripId: string, sequence: number, baseTime: string) => void;
  completeDelivery: (tripId: string, sequence: number, outcome: DeliveryOutcome, photoCount: number, baseTime: string) => void;
  fileIssueReport: () => void;
  enterOfflineDemo: () => void;
  beginReconnect: () => void;
  acknowledgeConflict: () => void;
}

const DriverContext = createContext<DriverContextValue | null>(null);

const CONFLICT_TRIP_ID = 'trip-1';
const CONFLICT_SEQUENCE = 5;

interface InitialDriverState {
  connection: ConnectionState;
  offlineSince: string | null;
  lastSyncedAt: string;
  loaderFlagsAcknowledged: Record<string, boolean>;
  departedTrips: Record<string, boolean>;
  stopRecords: Record<StopKey, StopRecord>;
  conflictPending: boolean;
  conflictResolved: boolean;
  offlineIssueReports: number;
}

function buildInitialState(scenario?: string): InitialDriverState {
  const base: InitialDriverState = {
    connection: 'online',
    offlineSince: null,
    lastSyncedAt: '03:58',
    loaderFlagsAcknowledged: {},
    departedTrips: {},
    stopRecords: {},
    conflictPending: false,
    conflictResolved: false,
    offlineIssueReports: 0
  };
  if (!scenario) return base;

  const t = 'trip-1';
  const firstTwo: Record<StopKey, StopRecord> = {
    [stopKey(t, 1)]: { status: 'Delivered', completedAt: '04:52', syncState: 'Synced', photoCount: 1 },
    [stopKey(t, 2)]: { status: 'Delivered', completedAt: '05:21', syncState: 'Synced', photoCount: 1 }
  };
  const departed = { ...base, departedTrips: { [t]: true }, loaderFlagsAcknowledged: { [t]: true }, stopRecords: firstTwo };

  switch (scenario) {
    case 'departed':
      return departed;
    case 'arrived':
      return { ...departed, stopRecords: { ...firstTwo, [stopKey(t, 3)]: { status: 'Arrived', arrivedAt: '05:58', syncState: 'Synced', photoCount: 0 } } };
    case 'offline':
      return {
        ...departed,
        connection: 'offline',
        offlineSince: '06:42',
        offlineIssueReports: 1,
        stopRecords: {
          ...firstTwo,
          [stopKey(t, 3)]: { status: 'Partially delivered', outcome: 'partial', completedAt: '06:14', syncState: 'Saved on phone', photoCount: 1 },
          [stopKey(t, 4)]: { status: 'Delivered', completedAt: '06:48', syncState: 'Saved on phone', photoCount: 2 }
        }
      };
    case 'conflict':
    case 'tripComplete':
      return {
        ...departed,
        lastSyncedAt: '07:29',
        conflictPending: scenario === 'conflict',
        conflictResolved: scenario === 'tripComplete',
        stopRecords: {
          ...firstTwo,
          [stopKey(t, 3)]: { status: 'Partially delivered', outcome: 'partial', completedAt: '06:14', syncState: 'Synced', photoCount: 1 },
          [stopKey(t, 4)]: { status: 'Delivered', completedAt: '06:48', syncState: 'Synced', photoCount: 2 }
        }
      };
    default:
      return base;
  }
}

export function DriverProvider({ children }: {children: React.ReactNode;}) {
  const screenInit = useScreenInit() as {scenario?: string;};
  const [initial] = useState(() => buildInitialState(screenInit.scenario));
  const [connection, setConnection] = useState<ConnectionState>(initial.connection);
  const [offlineSince, setOfflineSince] = useState<string | null>(initial.offlineSince);
  const [lastSyncedAt, setLastSyncedAt] = useState(initial.lastSyncedAt);
  const [loaderFlagsAcknowledged, setLoaderFlagsAcknowledged] = useState<Record<string, boolean>>(initial.loaderFlagsAcknowledged);
  const [departedTrips, setDepartedTrips] = useState<Record<string, boolean>>(initial.departedTrips);
  const [stopRecords, setStopRecords] = useState<Record<StopKey, StopRecord>>(initial.stopRecords);
  const [conflictPending, setConflictPending] = useState(initial.conflictPending);
  const [conflictResolved, setConflictResolved] = useState(initial.conflictResolved);
  const [offlineIssueReports, setOfflineIssueReports] = useState(initial.offlineIssueReports);

  useEffect(() => {
    if (connection !== 'syncing') return undefined;
    const timer = window.setTimeout(() => {
      setConnection('online');
      setLastSyncedAt(addMinutes(offlineSince ?? '06:42', 47));
      setOfflineSince(null);
      setOfflineIssueReports(0);
      setStopRecords((current) => Object.fromEntries(
        Object.entries(current).map(([key, record]) => [
        key,
        record.syncState === 'Saved on phone' ? { ...record, syncState: 'Synced' as const } : record]
        )
      ));
      setConflictPending(true);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [connection, offlineSince]);

  const getStopRecord = (tripId: string, sequence: number): StopRecord => {
    const record = stopRecords[stopKey(tripId, sequence)];
    if (record) return record;
    if (tripId === CONFLICT_TRIP_ID && sequence === CONFLICT_SEQUENCE && conflictResolved) {
      return { status: 'Changed by dispatcher', photoCount: 0 };
    }
    return { status: departedTrips[tripId] ? 'Out for delivery' : 'Loaded', photoCount: 0 };
  };

  const getNextStopSequence = (tripId: string): number | null => {
    const trip = TRIPS.find((candidate) => candidate.id === tripId);
    if (!trip) return null;
    const resolved: DeliveryStatus[] = ['Delivered', 'Partially delivered', 'Failed', 'Changed by dispatcher'];
    const next = trip.stops.find((stop) => !resolved.includes(getStopRecord(tripId, stop.sequence).status));
    return next ? next.sequence : null;
  };

  const isTripResolved = (tripId: string): boolean => getNextStopSequence(tripId) === null;

  const getTripStatus = (tripId: string): DeliveryStatus => {
    if (isTripResolved(tripId) && departedTrips[tripId]) return 'Delivered';
    if (departedTrips[tripId]) return 'Out for delivery';
    return 'Loaded';
  };

  const value = useMemo<DriverContextValue>(() => ({
    connection,
    offlineSince,
    lastSyncedAt,
    loaderFlagsAcknowledged,
    departedTrips,
    stopRecords,
    conflictPending,
    offlineIssueReports,
    getStopRecord,
    getTripStatus,
    getNextStopSequence,
    isTripResolved,
    acknowledgeLoaderFlags: (tripId, val) => setLoaderFlagsAcknowledged((current) => ({ ...current, [tripId]: val })),
    departTrip: (tripId) => {
      setDepartedTrips((current) => ({ ...current, [tripId]: true }));
      if (tripId === 'trip-1') {
        setStopRecords((current) => ({
          ...current,
          [stopKey(tripId, 1)]: { status: 'Delivered', completedAt: '04:52', syncState: 'Synced', photoCount: 1 },
          [stopKey(tripId, 2)]: { status: 'Delivered', completedAt: '05:21', syncState: 'Synced', photoCount: 1 }
        }));
      }
    },
    recordArrival: (tripId, sequence, baseTime) => {
      setStopRecords((current) => ({
        ...current,
        [stopKey(tripId, sequence)]: {
          ...(current[stopKey(tripId, sequence)] ?? { photoCount: 0 }),
          status: 'Arrived',
          arrivedAt: baseTime,
          syncState: connection === 'offline' ? 'Saved on phone' : 'Synced'
        }
      }));
    },
    completeDelivery: (tripId, sequence, outcome, photoCount, baseTime) => {
      const statusMap: Record<DeliveryOutcome, DeliveryStatus> = {
        full: 'Delivered',
        partial: 'Partially delivered',
        failed: 'Failed'
      };
      setStopRecords((current) => ({
        ...current,
        [stopKey(tripId, sequence)]: {
          ...(current[stopKey(tripId, sequence)] ?? { photoCount: 0 }),
          status: statusMap[outcome],
          outcome,
          completedAt: baseTime,
          syncState: connection === 'offline' ? 'Saved on phone' : 'Synced',
          photoCount
        }
      }));
    },
    fileIssueReport: () => {
      if (connection === 'offline') setOfflineIssueReports((count) => count + 1);
    },
    enterOfflineDemo: () => {
      setConnection('offline');
      setOfflineSince('06:42');
      setStopRecords((current) => ({
        ...current,
        [stopKey('trip-1', 3)]: {
          ...(current[stopKey('trip-1', 3)] ?? { status: 'Delivered', photoCount: 1 }),
          syncState: 'Saved on phone',
          photoCount: Math.max(current[stopKey('trip-1', 3)]?.photoCount ?? 0, 1)
        },
        [stopKey('trip-1', 4)]: { status: 'Delivered', completedAt: '06:48', syncState: 'Saved on phone', photoCount: 2 }
      }));
      setOfflineIssueReports(1);
    },
    beginReconnect: () => setConnection('syncing'),
    acknowledgeConflict: () => {
      setConflictPending(false);
      setConflictResolved(true);
    }
  }), [connection, offlineSince, lastSyncedAt, loaderFlagsAcknowledged, departedTrips, stopRecords, conflictPending, conflictResolved, offlineIssueReports]);

  return <DriverContext.Provider value={value}>{children}</DriverContext.Provider>;
}

export function useDriver() {
  const context = useContext(DriverContext);
  if (!context) throw new Error('useDriver must be used within DriverProvider');
  return context;
}