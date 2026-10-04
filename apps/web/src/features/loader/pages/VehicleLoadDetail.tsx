import { useEffect } from 'react';
import {
  Link,
  useParams,
} from 'react-router-dom';
import {
  CheckIcon,
  CircleAlertIcon,
  ListOrderedIcon,
  PackageIcon,
  RefreshCwIcon,
} from 'lucide-react';

import { useLoader } from '../contexts/LoaderContext';

import {
  computeLoadTotals,
  loadCheckPercent,
} from '../utils/loader';

import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';

import { buttonStyles } from '../components/ui/Button';

import { QuantityStepper } from '../components/loader/QuantityStepper';
import { TripContextBar } from '../components/loader/TripContextBar';

import { ChilledTag } from '../components/orders/ChilledTag';

export function VehicleLoadDetail() {
  const {
    tripId:
    routeTripId,
  } = useParams<{
    tripId: string;
  }>();

  const {
    tripDataById,
    issues,
    quantities,
    confirmedItemIds,
    setLoadedQuantity,
    markItemLoaded,
    tripLoadingId,
    tripErrors,
    loadTrip,
  } = useLoader();

  const tripId =
    routeTripId
      ? decodeURIComponent(
        routeTripId,
      )
      : undefined;

  const tripData =
    tripId
      ? tripDataById[
      tripId
      ]
      : undefined;

  useEffect(() => {
    if (
      tripId &&
      !tripData &&
      tripLoadingId !== tripId &&
      !tripErrors[tripId]
    ) {
      void loadTrip(tripId);
    }
  }, [loadTrip, tripData, tripErrors, tripId, tripLoadingId]);

  if (!tripId) {
    return (
      <LoadUnavailable />
    );
  }

  if (!tripData) {
    const loading = tripLoadingId === tripId;
    const error = tripErrors[tripId];

    return (
      <PageContainer>
        <Card className="mx-auto max-w-lg p-8 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-pale text-forest">
            <PackageIcon
              aria-hidden="true"
              className="h-6 w-6"
            />
          </span>

          <h1 className="mt-4 text-xl font-semibold text-ink">
            {loading ? 'Loading trip…' : error ? 'Could not load trip' : 'Loading trip unavailable'}
          </h1>

          <p className="mt-2 text-sm leading-6 text-subtle">
            {loading
              ? 'Retrieving the published stop sequence and loading list.'
              : error ?? 'This trip is not currently available in the Loader workspace.'}
          </p>

          {error && (
            <button
              type="button"
              onClick={() => void loadTrip(tripId)}
              className={`${buttonStyles('secondary', 'md')} mt-6`}
            >
              <RefreshCwIcon aria-hidden="true" className="h-4 w-4" />
              Try again
            </button>
          )}

          <Link
            to="/"
            className={`${buttonStyles(
              'primary',
              'md',
            )} mt-6 ${error ? 'ml-3' : ''}`}
          >
            Back to Loading Queue
          </Link>
        </Card>
      </PageContainer>
    );
  }

  const {
    queueItem: load,
    orders,
    stops,
  } = tripData;

  const ordersWithCurrentQuantities =
    orders.map(
          (order) => ({
            ...order,

            items:
              order.items.map(
                (item) => ({
                  ...item,

                  loaded:
                    quantities[
                    item.id
                    ] ??
                    item.loaded,
                }),
              ),
          }),
        );

  const totals =
        computeLoadTotals(
          ordersWithCurrentQuantities,
        );

  const percent =
    loadCheckPercent(
      totals,
    );

  const reportedIssues =
    Object.values(
      issues,
    ).filter(
      (issue) =>
        issue.tripId ===
        tripId,
    );

  const waitingCount =
    reportedIssues.filter(
      (issue) =>
        issue.resolution ===
        'open' ||
        (!issue.resolution &&
          !issue.decisionReceived),
    ).length;

  return (
    <PageContainer>
      <PageHeader
        backTo={{
          to: '/',
          label:
            'Loading Queue',
        }}
        title="Trip Loading"
        subtitle="Record the actual quantity loaded for every assigned item. Loading may continue on unaffected items while an issue is being reviewed."
      />

      <div className="mt-6">
        <TripContextBar
          vehicleId={
            load.vehicleId
          }
          trip={load.trip}
          brand={load.brand}
          district={
            load.district
          }
          temperature={
            load.temperature
          }
          planVersion={
            load.planVersion
          }
        />
      </div>

      <section className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="p-5 md:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-forest">
                Loading progress
              </p>

              <h2 className="mt-2 text-[36px] font-semibold leading-none tabular-nums tracking-tight text-ink">
                {totals.loaded}
                <span className="ml-2 text-xl font-medium text-subtle">
                  /{' '}
                  {
                    totals.expected
                  }{' '}
                  units
                </span>
              </h2>

              <p className="mt-3 text-sm leading-6 text-subtle">
                {
                  load.orderCount
                }{' '}
                assigned{' '}
                {load.orderCount ===
                  1
                  ? 'order'
                  : 'orders'}
                {' · '}
                {load.stops}{' '}
                planned{' '}
                {load.stops ===
                  1
                  ? 'stop'
                  : 'stops'}
                {' · '}
                planned departure{' '}
                {
                  load.departure
                }
              </p>
            </div>

            <div className="min-w-[220px] rounded-2xl border border-brand/15 bg-brand-pale/55 p-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-semibold text-forest">
                  Load check
                </p>

                <p className="text-lg font-semibold tabular-nums text-forest">
                  {percent}%
                </p>
              </div>

              <div className="mt-3 h-3 overflow-hidden rounded-full bg-surface ring-1 ring-inset ring-brand/10">
                <div
                  className="h-full rounded-full bg-brand transition-[width] duration-200"
                  style={{
                    width: `${Math.min(
                      100,
                      percent,
                    )}%`,
                  }}
                />
              </div>

              <p className="mt-3 text-xs font-medium text-subtle">
                Actual quantity
                currently recorded
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-forest text-white">
              <ListOrderedIcon
                aria-hidden="true"
                className="h-5 w-5"
              />
            </span>

            <div>
              <p className="font-semibold text-ink">
                Delivery sequence
              </p>

              <p className="mt-1 text-sm text-subtle">
                {
                  stops.length
                }{' '}
                planned{' '}
                {stops.length ===
                  1
                  ? 'stop'
                  : 'stops'}
              </p>
            </div>
          </div>

          {stops.length >
            0 ? (
            <ol className="mt-4 space-y-2">
              {[
                ...stops,
              ]
                .sort(
                  (
                    a,
                    b,
                  ) =>
                    a.number -
                    b.number,
                )
                .slice(0, 4)
                .map(
                  (stop) => (
                    <li
                      key={
                        stop.id ??
                        `${stop.number}-${stop.outletId}`
                      }
                      className="flex items-center gap-3 rounded-2xl bg-canvas px-3 py-2.5"
                    >
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface text-xs font-semibold text-forest ring-1 ring-inset ring-line">
                        {
                          stop.number
                        }
                      </span>

                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-ink">
                          {
                            stop.outletName
                          }
                        </span>

                        <span className="block truncate text-xs text-subtle">
                          {
                            stop.location
                          }
                        </span>
                      </span>
                    </li>
                  ),
                )}
            </ol>
          ) : (
            <p className="mt-4 text-sm leading-6 text-subtle">
              Stop sequence will
              appear when the
              published trip is
              loaded from the
              backend.
            </p>
          )}
        </Card>
      </section>

      {reportedIssues.length >
        0 && (
          <div className="mt-5 rounded-card border border-amber/40 bg-amber-pale px-5 py-4 shadow-card">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber text-amber-ink">
                  <CircleAlertIcon
                    aria-hidden="true"
                    className="h-5 w-5"
                  />
                </span>

                <div>
                  <p className="font-semibold text-amber-ink">
                    {
                      reportedIssues.length
                    }{' '}
                    loading{' '}
                    {reportedIssues.length ===
                      1
                      ? 'issue'
                      : 'issues'}
                  </p>

                  <p className="mt-1 text-sm text-amber-ink">
                    {waitingCount >
                      0
                      ? `${waitingCount} awaiting Dispatcher resolution. You may continue loading other items.`
                      : 'All reported issues have a recorded resolution.'}
                  </p>
                </div>
              </div>

              <Link
                to="/issues"
                className={buttonStyles(
                  'secondary',
                  'sm',
                )}
              >
                View issues
              </Link>
            </div>
          </div>
        )}

      <section
        aria-labelledby="assigned-items-heading"
        className="mt-6"
      >
        <div>
          <h2
            id="assigned-items-heading"
            className="text-2xl font-semibold tracking-tight text-ink"
          >
            Assigned orders
            &amp; items
          </h2>

          <p className="mt-1 text-sm leading-6 text-subtle">
            Record the actual
            good quantity loaded.
            The delivery sequence
            tells you where goods
            will be unloaded; it
            does not assume that
            Stop 1 must be
            physically loaded
            first.
          </p>
        </div>

        {orders.length >
          0 ? (
          <div className="mt-4 space-y-4">
            {orders.map(
              (order) => (
                <Card
                  key={
                    order.id
                  }
                  className="overflow-hidden"
                >
                  <div className="flex flex-col gap-3 border-b border-line bg-canvas/55 px-5 py-5 sm:flex-row sm:items-center sm:justify-between md:px-6">
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        {
                          order.outletId
                        }

                        <span className="font-normal text-subtle">
                          {' · Stop '}
                          {
                            order.stop
                          }
                        </span>
                      </p>

                      <p className="mt-1 text-sm text-subtle">
                        {
                          order.outletName
                        }
                        {' · '}
                        {
                          order.location
                        }

                        {order.weightKg !==
                          undefined && (
                            <>
                              {' · '}
                              {
                                order.weightKg
                              }{' '}
                              kg
                            </>
                          )}

                        {order.volumeM3 !==
                          undefined && (
                            <>
                              {' · '}
                              {
                                order.volumeM3
                              }{' '}
                              m³
                            </>
                          )}
                      </p>
                    </div>

                    <span className="self-start rounded-full bg-surface px-3 py-1.5 text-xs font-semibold text-ink shadow-card ring-1 ring-inset ring-line">
                      {order.id}
                    </span>
                  </div>

                  <ul className="divide-y divide-line">
                    {order.items.map(
                      (item) => {
                        const loaded =
                          quantities[
                          item.id
                          ] ??
                          item.loaded;

                        const short =
                          loaded <
                          item.expected;

                        const confirmed =
                          confirmedItemIds.includes(
                            item.id,
                          );

                        const itemIssue =
                          issues[
                          item.id
                          ];

                        const issueQuery =
                          new URLSearchParams({
                            tripId,
                            orderId:
                              order.id,
                            itemId:
                              item.id,
                            orderLineId:
                              item.orderLineId ??
                              item.id,
                          }).toString();

                        return (
                          <li
                            key={
                              item.id
                            }
                            className="flex flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:px-6"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-base font-semibold text-ink">
                                  {
                                    item.name
                                  }
                                </p>

                                {item.condition ===
                                  'chilled' && (
                                    <ChilledTag />
                                  )}
                              </div>

                              <p className="mt-1.5 text-sm text-subtle">
                                Expected{' '}

                                <span className="font-semibold text-ink">
                                  {
                                    item.expected
                                  }
                                </span>{' '}

                                {
                                  item.unit
                                }
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                              <QuantityStepper
                                label={`${item.name} loaded quantity`}
                                value={
                                  loaded
                                }
                                maximum={
                                  item.expected
                                }
                                onChange={(
                                  value,
                                ) =>
                                  setLoadedQuantity(
                                    item.id,
                                    value,
                                  )
                                }
                              />

                              {short ? (
                                itemIssue ? (
                                  <Link
                                    to="/issues"
                                    className={`${buttonStyles(
                                      'secondary',
                                      'md',
                                    )} !bg-brand-pale !text-forest`}
                                  >
                                    <CheckIcon
                                      aria-hidden="true"
                                      className="h-4 w-4"
                                    />

                                    Issue recorded
                                  </Link>
                                ) : (
                                  <Link
                                    to={`/issues?${issueQuery}`}
                                    className={buttonStyles(
                                      'outline',
                                      'md',
                                    )}
                                  >
                                    Report issue
                                  </Link>
                                )
                              ) : confirmed ? (
                                <span className="inline-flex h-10 items-center gap-1.5 rounded-full bg-brand-pale px-3.5 text-sm font-semibold text-forest ring-1 ring-inset ring-brand/20">
                                  <CheckIcon
                                    aria-hidden="true"
                                    className="h-4 w-4"
                                  />

                                  Loaded
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    markItemLoaded(
                                      item.id,
                                      item.expected,
                                    )
                                  }
                                  className={buttonStyles(
                                    'secondary',
                                    'md',
                                  )}
                                >
                                  <CheckIcon
                                    aria-hidden="true"
                                    className="h-4 w-4"
                                  />

                                  Mark loaded
                                </button>
                              )}
                            </div>
                          </li>
                        );
                      },
                    )}
                  </ul>
                </Card>
              ),
            )}
          </div>
        ) : (
          <Card className="mt-4 p-8 text-center">
            <p className="font-semibold text-ink">
              No loading items
              available
            </p>

            <p className="mt-2 text-sm leading-6 text-subtle">
              Assigned orders
              and item quantities
              will be populated
              from the Loader
              backend for this
              trip.
            </p>
          </Card>
        )}
      </section>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link
          to="/"
          className={buttonStyles(
            'secondary',
            'lg',
          )}
        >
          Back to queue
        </Link>

        <Link
          to={`/trips/${encodeURIComponent(
            tripId,
          )}/complete`}
          className={buttonStyles(
            'primary',
            'lg',
          )}
        >
          Complete load check
        </Link>
      </div>
    </PageContainer>
  );
}

function LoadUnavailable() {
  return (
    <PageContainer>
      <Card className="mx-auto max-w-lg p-8 text-center">
        <h1 className="text-xl font-semibold text-ink">
          Loading trip not
          selected
        </h1>

        <p className="mt-2 text-sm text-subtle">
          Choose a published
          trip from the Loading
          Queue.
        </p>

        <Link
          to="/"
          className={`${buttonStyles(
            'primary',
            'md',
          )} mt-6`}
        >
          Back to Loading Queue
        </Link>
      </Card>
    </PageContainer>
  );
}
