import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';

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
  fetchLoaderTrip,
  fetchLoaderTrips,
  startLoadingTrip as startLoadingTripRequest,
  updateLoadedQuantity,
} from '../api/loaderApi';

export interface LoaderTripView {
  tripId: string;
  queueItem: LoadQueueItem;
  orders: LoadOrder[];
  stops: LoadStop[];
}

interface LoaderContextValue {
  /**
   * Runtime Loader data.
   *
   * This intentionally starts empty. The Loader backend/API will
   * populate it later through hydrateLoaderData().
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

  tripDataById: Record<string, LoaderTripView>;

  quantities: Record<string, number>;
  confirmedItemIds: string[];
  issues: Record<string, LoaderIssue>;
  savingLineIds: string[];
  lineErrors: Record<string, string>;

  /**
   * Temporary compatibility state for pages that have not yet been
   * migrated. These IDs should eventually be persisted by the backend.
   */
  reviewedPlanVehicleIds: string[];
  handedOffVehicleIds: string[];

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
  ) => void;

  recordReplacement: (
    target: LoaderIssueTarget,
    damagedQuantity: number,
    note: string,
    photoAttached: boolean,
  ) => void;

  reportDamagedIssue: (
    target: LoaderIssueTarget,
    damagedQuantity: number,
    note: string,
    photoAttached: boolean,
  ) => void;

  acknowledgeDecision: (
    itemId: string,
  ) => void;

  acknowledgePlanUpdate: (
    id: string,
  ) => void;

  confirmHandoff: (
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

  const [
    handedOffVehicleIds,
    setHandedOffVehicleIds,
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
        tripDataById,
        quantities,
        confirmedItemIds,
        issues,
        savingLineIds,
        lineErrors,
        reviewedPlanVehicleIds,
        handedOffVehicleIds,

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
          setQuantities({});
          setConfirmedItemIds([]);
          setSavingLineIds([]);
          setLineErrors({});
          setIssues({});
          setReviewedPlanVehicleIds(
            [],
          );
          setHandedOffVehicleIds([]);
        },

        setLoadedQuantity: persistLoadedQuantity,

        markItemLoaded: persistLoadedQuantity,

        reportIssue: (
          target,
          type,
          note,
          photoAttached,
        ) => {
          setIssues(
            (current) => ({
              ...current,

              [target.itemId]: {
                ...target,

                reported: true,

                type,

                loaded:
                  quantities[
                  target.itemId
                  ] ?? 0,

                note:
                  note.trim(),

                photoAttached,

                /**
                 * Dispatcher decisions must later
                 * come from the backend.
                 */
                decisionReceived:
                  false,

                resolution:
                  'open',
              },
            }),
          );
        },

        recordReplacement: (
          target,
          damagedQuantity,
          note,
          photoAttached,
        ) => {
          const safeDamagedQuantity =
            Math.max(
              1,
              Math.min(
                target.expected,
                Math.trunc(
                  damagedQuantity,
                ),
              ),
            );

          const currentLoaded =
            quantities[
            target.itemId
            ] ??
            target.expected;

          /**
           * An identical replacement restores the damaged
           * quantity, so the good quantity remains the same
           * as the quantity that had already been picked.
           */
          const finalGoodQuantity =
            Math.min(
              target.expected,
              currentLoaded,
            );

          setQuantities(
            (current) => ({
              ...current,

              [target.itemId]:
                finalGoodQuantity,
            }),
          );

          setConfirmedItemIds(
            (current) => {
              if (
                finalGoodQuantity <
                target.expected
              ) {
                return current.filter(
                  (id) =>
                    id !==
                    target.itemId,
                );
              }

              return current.includes(
                target.itemId,
              )
                ? current
                : [
                  ...current,
                  target.itemId,
                ];
            },
          );

          setIssues(
            (current) => ({
              ...current,

              [target.itemId]: {
                ...target,

                reported: true,

                type: 'damaged',

                loaded:
                  finalGoodQuantity,

                note:
                  note.trim(),

                photoAttached,

                decisionReceived:
                  false,

                resolution:
                  'replacement_loaded',

                damagedQuantity:
                  safeDamagedQuantity,

                replacementAvailable:
                  true,

                replacementQuantity:
                  safeDamagedQuantity,
              },
            }),
          );
        },

        reportDamagedIssue: (
          target,
          damagedQuantity,
          note,
          photoAttached,
        ) => {
          const safeDamagedQuantity =
            Math.max(
              1,
              Math.min(
                target.expected,
                Math.trunc(
                  damagedQuantity,
                ),
              ),
            );

          const currentLoaded =
            quantities[
            target.itemId
            ] ??
            target.expected;

          const goodQuantity =
            Math.max(
              0,
              currentLoaded -
              safeDamagedQuantity,
            );

          setQuantities(
            (current) => ({
              ...current,

              [target.itemId]:
                goodQuantity,
            }),
          );

          setConfirmedItemIds(
            (current) =>
              current.filter(
                (id) =>
                  id !==
                  target.itemId,
              ),
          );

          setIssues(
            (current) => ({
              ...current,

              [target.itemId]: {
                ...target,

                reported: true,

                type: 'damaged',

                loaded:
                  goodQuantity,

                note:
                  note.trim(),

                photoAttached,

                decisionReceived:
                  false,

                resolution: 'open',

                damagedQuantity:
                  safeDamagedQuantity,

                replacementAvailable:
                  false,

                replacementQuantity:
                  0,
              },
            }),
          );
        },

        acknowledgeDecision: (
          itemId,
        ) => {
          setIssues(
            (current) => {
              const issue =
                current[itemId];

              if (!issue) {
                return current;
              }

              return {
                ...current,

                [itemId]: {
                  ...issue,

                  decisionReceived:
                    true,
                },
              };
            },
          );
        },

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

        confirmHandoff: (
          id,
        ) => {
          setHandedOffVehicleIds(
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
        handedOffVehicleIds,
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
        reviewedPlanVehicleIds,
        savingLineIds,
        lineErrors,
        persistLoadedQuantity,
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
