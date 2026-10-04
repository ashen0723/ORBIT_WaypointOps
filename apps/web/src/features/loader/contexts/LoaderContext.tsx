import {
  createContext,
  useContext,
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

  tripDataById: Record<string, LoaderTripView>;

  quantities: Record<string, number>;
  confirmedItemIds: string[];
  issues: Record<string, LoaderIssue>;

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
  ) => void;

  markItemLoaded: (
    itemId: string,
    expected: number,
  ) => void;

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
  const [
    queueLoads,
    setQueueLoads,
  ] = useState<LoadQueueItem[]>([]);

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

  const value =
    useMemo<LoaderContextValue>(
      () => ({
        queueLoads,
        tripDataById,
        quantities,
        confirmedItemIds,
        issues,
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
          setTripDataById({});
          setQuantities({});
          setConfirmedItemIds([]);
          setIssues({});
          setReviewedPlanVehicleIds(
            [],
          );
          setHandedOffVehicleIds([]);
        },

        setLoadedQuantity: (
          itemId,
          nextValue,
        ) => {
          const safeValue =
            Math.max(
              0,
              Math.trunc(nextValue),
            );

          setQuantities(
            (current) => ({
              ...current,
              [itemId]: safeValue,
            }),
          );

          setConfirmedItemIds(
            (current) =>
              current.filter(
                (id) =>
                  id !== itemId,
              ),
          );
        },

        markItemLoaded: (
          itemId,
          expected,
        ) => {
          setQuantities(
            (current) => ({
              ...current,
              [itemId]:
                expected,
            }),
          );

          setConfirmedItemIds(
            (current) =>
              current.includes(
                itemId,
              )
                ? current
                : [
                  ...current,
                  itemId,
                ],
          );
        },

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
        reviewedPlanVehicleIds,
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