import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { ApiError } from '../../../api/client';

import type {
  LoadOrder,
  LoadQueueItem,
  LoadStop,
  LoaderIssue,
  LoaderIssueTarget,
  LoaderIssueType,
} from '../types/loader';
import { useAuth } from '../../../app/providers/AuthProvider';
import {
  acknowledgeLoadingIssue,
  createLoadingIssue,
  fetchLoaderTrip,
  fetchLoaderTrips,
  markTripReady as markTripReadyRequest,
  startLoadingTrip as startLoadingTripRequest,
  updateLoadedQuantity,
} from '../api/loaderApi';
import type { ReadyTripBlocker } from '../api/loaderApi';

export interface LoaderTripView {
  tripId: string;
  queueItem: LoadQueueItem;
  orders: LoadOrder[];
  stops: LoadStop[];
}

interface LoaderContextValue {
  /**
   * Runtime Loader data populated from the authenticated backend API.
   */
  queueLoads: LoadQueueItem[];
  queueLoading: boolean;
  queueError: string | null;
  refreshQueue: () => Promise<void>;
  tripLoadingId: string | null;
  tripErrors: Record<string, string>;
  loadTrip: (tripId: string) => Promise<void>;
  startLoadingTrip: (tripId: string) => Promise<void>;
  startingTripId: string | null;
  operationErrors: Record<string, string>;
  readyingTripId: string | null;
  readyErrors: Record<string, string>;
  readyBlockers: Record<string, ReadyTripBlocker[]>;
  markTripReady: (tripId: string) => Promise<void>;

  tripDataById: Record<string, LoaderTripView>;

  quantities: Record<string, number>;
  confirmedItemIds: string[];
  issues: Record<string, LoaderIssue>;
  savingLineIds: string[];
  lineErrors: Record<string, string>;
  issueSavingItemId: string | null;
  issueErrors: Record<string, string>;

  /**
   * Temporary compatibility state for stop-plan acknowledgement.
   */
  reviewedPlanVehicleIds: string[];

  hydrateLoaderData: (
    queueLoads: LoadQueueItem[],
    trips: LoaderTripView[],
  ) => void;

  clearLoaderData: () => void;

  setLoadedQuantity: (
    itemId: string,
    value: number,
  ) => Promise<void>;

  markItemLoaded: (
    itemId: string,
    expected: number,
  ) => Promise<void>;

  reportIssue: (
    target: LoaderIssueTarget,
    type: LoaderIssueType,
    note: string,
    photoAttached: boolean,
  ) => Promise<void>;

  recordReplacement: (
    target: LoaderIssueTarget,
    damagedQuantity: number,
    note: string,
    photoAttached: boolean,
  ) => Promise<void>;

  reportDamagedIssue: (
    target: LoaderIssueTarget,
    damagedQuantity: number,
    note: string,
    photoAttached: boolean,
  ) => Promise<void>;

  acknowledgeDecision: (
    itemId: string,
  ) => Promise<void>;

  acknowledgePlanUpdate: (
    id: string,
  ) => void;

  resetIssue: (
    itemId: string,
  ) => void;
}

const LoaderContext =
  createContext<LoaderContextValue | null>(
    null,
  );

export function LoaderProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { token, user } = useAuth();

  const [
    queueLoads,
    setQueueLoads,
  ] = useState<LoadQueueItem[]>([]);

  const [queueLoading, setQueueLoading] = useState(false);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [tripLoadingId, setTripLoadingId] = useState<string | null>(null);
  const [tripErrors, setTripErrors] = useState<Record<string, string>>({});
  const [startingTripId, setStartingTripId] = useState<string | null>(null);
  const [operationErrors, setOperationErrors] = useState<Record<string, string>>({});
  const [readyingTripId, setReadyingTripId] = useState<string | null>(null);
  const [readyErrors, setReadyErrors] = useState<Record<string, string>>({});
  const [readyBlockers, setReadyBlockers] = useState<Record<string, ReadyTripBlocker[]>>({});

  const [
    tripDataById,
    setTripDataById,
  ] = useState<
    Record<string, LoaderTripView>
  >({});

  const [
    quantities,
    setQuantities,
  ] = useState<
    Record<string, number>
  >({});

  const [
    confirmedItemIds,
    setConfirmedItemIds,
  ] = useState<string[]>([]);

  const [savingLineIds, setSavingLineIds] = useState<string[]>([]);
  const [lineErrors, setLineErrors] = useState<Record<string, string>>({});
  const [issueSavingItemId, setIssueSavingItemId] = useState<string | null>(null);
  const [issueErrors, setIssueErrors] = useState<Record<string, string>>({});

  const [
    issues,
    setIssues,
  ] = useState<
    Record<string, LoaderIssue>
  >({});

  const [
    reviewedPlanVehicleIds,
    setReviewedPlanVehicleIds,
  ] = useState<string[]>([]);

  const refreshQueue = useCallback(async () => {
    if (!token || user?.role !== 'loader') {
      setQueueLoads([]);
      setQueueError(null);
      setQueueLoading(false);
      return;
    }

    setQueueLoading(true);
    setQueueError(null);

    try {
      setQueueLoads(await fetchLoaderTrips(token));
    } catch (error) {
      setQueueError(error instanceof Error ? error.message : 'Could not load the loading queue.');
    } finally {
      setQueueLoading(false);
    }
  }, [token, user?.role]);

  useEffect(() => {
    void refreshQueue();
  }, [refreshQueue]);

  const loadTrip = useCallback(async (tripId: string) => {
    if (!token) {
      setTripErrors((current) => ({ ...current, [tripId]: 'Sign in to view this loading trip.' }));
      return;
    }

    setTripLoadingId(tripId);
    setTripErrors((current) => {
      const next = { ...current };
      delete next[tripId];
      return next;
    });

    try {
      const mapped = await fetchLoaderTrip(
        token,
        tripId,
        queueLoads.find((load) => load.tripId === tripId),
      );
      setTripDataById((current) => ({ ...current, [tripId]: mapped.trip }));
      setQuantities((current) => ({ ...current, ...mapped.quantities }));
      setConfirmedItemIds((current) => [...new Set([...current, ...mapped.confirmedItemIds])]);
      setIssues((current) => ({ ...current, ...mapped.issues }));
    } catch (error) {
      setTripErrors((current) => ({
        ...current,
        [tripId]: error instanceof Error ? error.message : 'Could not load this trip.',
      }));
    } finally {
      setTripLoadingId((current) => current === tripId ? null : current);
    }
  }, [queueLoads, token]);

  const startLoadingTrip = useCallback(async (tripId: string) => {
    if (!token) {
      setOperationErrors((current) => ({ ...current, [tripId]: 'Sign in to start loading.' }));
      return;
    }

    setStartingTripId(tripId);
    setOperationErrors((current) => {
      const next = { ...current };
      delete next[tripId];
      return next;
    });

    try {
      await startLoadingTripRequest(token, tripId);
      setQueueLoads((current) => current.map((load) =>
        load.tripId === tripId ? { ...load, status: 'loading' } : load,
      ));
      setTripDataById((current) => {
        const trip = current[tripId];
        return trip
          ? { ...current, [tripId]: { ...trip, queueItem: { ...trip.queueItem, status: 'loading' } } }
          : current;
      });
    } catch (error) {
      setOperationErrors((current) => ({
        ...current,
        [tripId]: error instanceof Error ? error.message : 'Could not start loading.',
      }));
    } finally {
      setStartingTripId((current) => current === tripId ? null : current);
    }
  }, [token]);

  const persistLoadedQuantity = useCallback(async (itemId: string, nextValue: number) => {
    if (!token) {
      setLineErrors((current) => ({ ...current, [itemId]: 'Sign in to save this quantity.' }));
      return;
    }

    const safeValue = Math.max(0, Math.trunc(nextValue));
    const previousValue = quantities[itemId] ?? 0;
    setQuantities((current) => ({ ...current, [itemId]: safeValue }));
    setConfirmedItemIds((current) => current.filter((id) => id !== itemId));
    setSavingLineIds((current) => current.includes(itemId) ? current : [...current, itemId]);
    setLineErrors((current) => {
      const next = { ...current };
      delete next[itemId];
      return next;
    });

    try {
      const result = await updateLoadedQuantity(token, itemId, safeValue);
      setQuantities((current) => ({ ...current, [itemId]: result.loadedQty }));
      setConfirmedItemIds((current) => result.complete
        ? current.includes(itemId) ? current : [...current, itemId]
        : current.filter((id) => id !== itemId));
    } catch (error) {
      setQuantities((current) => ({ ...current, [itemId]: previousValue }));
      setLineErrors((current) => ({
        ...current,
        [itemId]: error instanceof Error ? error.message : 'Could not save this quantity.',
      }));
    } finally {
      setSavingLineIds((current) => current.filter((id) => id !== itemId));
    }
  }, [quantities, token]);

  const persistIssue = useCallback(async (
    target: LoaderIssueTarget,
    type: LoaderIssueType,
    availableQty: number,
    note: string,
    replacementLoaded = false,
  ) => {
    if (!token) {
      setIssueErrors((current) => ({
        ...current,
        [target.itemId]: 'Sign in to report this issue.',
      }));
      return;
    }

    if (!target.tripId || !target.orderLineId) {
      setIssueErrors((current) => ({
        ...current,
        [target.itemId]: 'This item is missing its trip or order-line reference.',
      }));
      return;
    }

    setIssueSavingItemId(target.itemId);
    setIssueErrors((current) => {
      const next = { ...current };
      delete next[target.itemId];
      return next;
    });

    try {
      await createLoadingIssue(token, target.tripId, {
        orderLineId: target.orderLineId,
        type: type.toUpperCase() as 'MISSING' | 'DAMAGED',
        availableQty: Math.max(0, Math.trunc(availableQty)),
        replacementLoaded,
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      await loadTrip(target.tripId);
    } catch (error) {
      setIssueErrors((current) => ({
        ...current,
        [target.itemId]: error instanceof Error ? error.message : 'Could not report this issue.',
      }));
    } finally {
      setIssueSavingItemId((current) => current === target.itemId ? null : current);
    }
  }, [loadTrip, token]);

  const reportIssue = useCallback(async (
    target: LoaderIssueTarget,
    type: LoaderIssueType,
    note: string,
    photoAttached: boolean,
  ) => {
    void photoAttached;
    await persistIssue(target, type, quantities[target.itemId] ?? 0, note);
  }, [persistIssue, quantities]);

  const recordReplacement = useCallback(async (
    target: LoaderIssueTarget,
    damagedQuantity: number,
    note: string,
    photoAttached: boolean,
  ) => {
    void damagedQuantity;
    void photoAttached;
    await persistIssue(target, 'damaged', target.expected, note, true);
  }, [persistIssue]);

  const reportDamagedIssue = useCallback(async (
    target: LoaderIssueTarget,
    damagedQuantity: number,
    note: string,
    photoAttached: boolean,
  ) => {
    void photoAttached;
    const safeDamagedQuantity = Math.max(
      1,
      Math.min(target.expected, Math.trunc(damagedQuantity)),
    );
    const currentLoaded = quantities[target.itemId] ?? target.expected;
    await persistIssue(
      target,
      'damaged',
      Math.max(0, currentLoaded - safeDamagedQuantity),
      note,
    );
  }, [persistIssue, quantities]);

  const acknowledgeDecision = useCallback(async (itemId: string) => {
    const issue = issues[itemId];

    if (!token) {
      setIssueErrors((current) => ({
        ...current,
        [itemId]: 'Sign in to acknowledge this decision.',
      }));
      return;
    }

    if (!issue?.issueId || !issue.tripId) {
      setIssueErrors((current) => ({
        ...current,
        [itemId]: 'This issue is missing its backend reference.',
      }));
      return;
    }

    setIssueSavingItemId(itemId);
    setIssueErrors((current) => {
      const next = { ...current };
      delete next[itemId];
      return next;
    });

    try {
      await acknowledgeLoadingIssue(token, issue.issueId);
      await loadTrip(issue.tripId);
    } catch (error) {
      setIssueErrors((current) => ({
        ...current,
        [itemId]: error instanceof Error
          ? error.message
          : 'Could not acknowledge this decision.',
      }));
    } finally {
      setIssueSavingItemId((current) => current === itemId ? null : current);
    }
  }, [issues, loadTrip, token]);

  const markTripReady = useCallback(async (tripId: string) => {
    if (!token) {
      setReadyErrors((current) => ({
        ...current,
        [tripId]: 'Sign in to mark this trip ready.',
      }));
      return;
    }

    setReadyingTripId(tripId);
    setReadyErrors((current) => {
      const next = { ...current };
      delete next[tripId];
      return next;
    });
    setReadyBlockers((current) => {
      const next = { ...current };
      delete next[tripId];
      return next;
    });

    try {
      await markTripReadyRequest(token, tripId);
      setQueueLoads((current) => current.map((load) =>
        load.tripId === tripId ? { ...load, status: 'ready_to_depart' } : load,
      ));
      setTripDataById((current) => {
        const trip = current[tripId];
        return trip
          ? {
            ...current,
            [tripId]: {
              ...trip,
              queueItem: { ...trip.queueItem, status: 'ready_to_depart' },
            },
          }
          : current;
      });
      await refreshQueue();
    } catch (error) {
      setReadyErrors((current) => ({
        ...current,
        [tripId]: error instanceof Error
          ? error.message
          : 'Could not mark this trip ready.',
      }));
      setReadyBlockers((current) => ({
        ...current,
        [tripId]: readyBlockersFrom(error),
      }));
    } finally {
      setReadyingTripId((current) => current === tripId ? null : current);
    }
  }, [refreshQueue, token]);

  const value =
    useMemo<LoaderContextValue>(
      () => ({
        queueLoads,
        queueLoading,
        queueError,
        refreshQueue,
        tripLoadingId,
        tripErrors,
        loadTrip,
        startLoadingTrip,
        startingTripId,
        operationErrors,
        readyingTripId,
        readyErrors,
        readyBlockers,
        markTripReady,
        tripDataById,
        quantities,
        confirmedItemIds,
        issues,
        savingLineIds,
        lineErrors,
        issueSavingItemId,
        issueErrors,
        reviewedPlanVehicleIds,

        hydrateLoaderData: (
          nextQueueLoads,
          trips,
        ) => {
          setQueueLoads(nextQueueLoads);

          setTripDataById(
            Object.fromEntries(
              trips.map((trip) => [
                trip.tripId,
                trip,
              ]),
            ),
          );

          const nextQuantities:
            Record<string, number> = {};

          const nextConfirmedIds:
            string[] = [];

          for (const trip of trips) {
            for (const order of trip.orders) {
              for (const item of order.items) {
                nextQuantities[item.id] =
                  item.loaded;

                if (
                  item.loaded >=
                  item.expected
                ) {
                  nextConfirmedIds.push(
                    item.id,
                  );
                }
              }
            }
          }

          setQuantities(
            nextQuantities,
          );

          setConfirmedItemIds(
            nextConfirmedIds,
          );
        },

        clearLoaderData: () => {
          setQueueLoads([]);
          setQueueError(null);
          setTripDataById({});
          setTripErrors({});
          setOperationErrors({});
          setReadyingTripId(null);
          setReadyErrors({});
          setReadyBlockers({});
          setQuantities({});
          setConfirmedItemIds([]);
          setSavingLineIds([]);
          setLineErrors({});
          setIssueSavingItemId(null);
          setIssueErrors({});
          setIssues({});
          setReviewedPlanVehicleIds(
            [],
          );
        },

        setLoadedQuantity: persistLoadedQuantity,

        markItemLoaded: persistLoadedQuantity,

        reportIssue,

        recordReplacement,

        reportDamagedIssue,

        acknowledgeDecision,

        acknowledgePlanUpdate: (
          id,
        ) => {
          setReviewedPlanVehicleIds(
            (current) =>
              current.includes(id)
                ? current
                : [
                  ...current,
                  id,
                ],
          );
        },

        resetIssue: (
          itemId,
        ) => {
          setIssues(
            (current) =>
              Object.fromEntries(
                Object.entries(
                  current,
                ).filter(
                  ([id]) =>
                    id !== itemId,
                ),
              ),
          );
        },
      }),

      [
        confirmedItemIds,
        issues,
        quantities,
        queueLoads,
        queueLoading,
        queueError,
        refreshQueue,
        tripLoadingId,
        tripErrors,
        loadTrip,
        startLoadingTrip,
        startingTripId,
        operationErrors,
        readyingTripId,
        readyErrors,
        readyBlockers,
        markTripReady,
        reviewedPlanVehicleIds,
        savingLineIds,
        lineErrors,
        issueSavingItemId,
        issueErrors,
        persistLoadedQuantity,
        reportIssue,
        recordReplacement,
        reportDamagedIssue,
        acknowledgeDecision,
        tripDataById,
      ],
    );

  return (
    <LoaderContext.Provider
      value={value}
    >
      {children}
    </LoaderContext.Provider>
  );
}

function readyBlockersFrom(error: unknown): ReadyTripBlocker[] {
  if (!(error instanceof ApiError) || !Array.isArray(error.details)) {
    return [];
  }

  return error.details.filter((blocker): blocker is ReadyTripBlocker =>
    typeof blocker === 'object' &&
    blocker !== null &&
    'type' in blocker &&
    typeof blocker.type === 'string');
}

export function useLoader() {
  const context =
    useContext(LoaderContext);

  if (!context) {
    throw new Error(
      'useLoader must be used within a LoaderProvider',
    );
  }

  return context;
}
