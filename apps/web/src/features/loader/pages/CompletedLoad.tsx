import React, {
  useMemo,
} from 'react';

import {
  Link,
  useParams,
} from 'react-router-dom';

import {
  CheckCircle2Icon,
  CircleAlertIcon,
  PackageCheckIcon,
  SendIcon,
} from 'lucide-react';

import { useLoader } from '../contexts/LoaderContext';

import {
  computeLoadTotals,
} from '../utils/loader';

import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';

import {
  Button,
  buttonStyles,
} from '../components/ui/Button';

import { TripContextBar } from '../components/loader/TripContextBar';
import { LoadCompletionHero } from '../components/loader/LoadCompletionHero';

interface ShortItem {
  itemId: string;
  orderId: string;
  name: string;
  expected: number;
  loaded: number;
  unit: string;
}

export function CompletedLoad() {
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
    handedOffVehicleIds,
    confirmHandoff,
  } = useLoader();

  const tripId =
    routeTripId
      ? decodeURIComponent(
        routeTripId,
      )
      : undefined;

  const trip =
    tripId
      ? tripDataById[
      tripId
      ]
      : undefined;

  if (
    !tripId ||
    !trip
  ) {
    return (
      <CompletionUnavailable />
    );
  }

  const {
    queueItem,
    orders,
  } = trip;

  const ordersWithActuals =
    useMemo(
      () =>
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
        ),
      [
        orders,
        quantities,
      ],
    );

  const totals =
    useMemo(
      () =>
        computeLoadTotals(
          ordersWithActuals,
        ),
      [
        ordersWithActuals,
      ],
    );

  const shortItems =
    useMemo<
      ShortItem[]
    >(
      () =>
        ordersWithActuals.flatMap(
          (order) =>
            order.items
              .filter(
                (item) =>
                  item.loaded <
                  item.expected,
              )
              .map(
                (item) => ({
                  itemId:
                    item.id,

                  orderId:
                    order.id,

                  name:
                    item.name,

                  expected:
                    item.expected,

                  loaded:
                    item.loaded,

                  unit:
                    item.unit,
                }),
              ),
        ),
      [
        ordersWithActuals,
      ],
    );

  const tripIssues =
    Object.values(
      issues,
    ).filter(
      (issue) =>
        issue.tripId ===
        tripId,
    );

  const openIssues =
    tripIssues.filter(
      (issue) =>
        !issue.resolution ||
        issue.resolution ===
        'open',
    );

  const unresolvedShortItems =
    shortItems.filter(
      (item) => {
        const issue =
          issues[
          item.itemId
          ];

        return (
          !issue ||
          issue.resolution !==
          'ship_short'
        );
      },
    );

  const canBecomeReady =
    openIssues.length ===
    0 &&
    unresolvedShortItems.length ===
    0;

  const readyRecorded =
    handedOffVehicleIds.includes(
      tripId,
    );

  const loadPath =
    `/trips/${encodeURIComponent(
      tripId,
    )}`;

  return (
    <PageContainer className="max-w-[1120px]">
      <PageHeader
        backTo={{
          to: loadPath,
          label:
            'Trip Loading',
        }}
        title="Load Completion"
        subtitle="Review actual loaded quantities and resolve every blocking exception before marking the trip ready to depart."
      />

      <div className="mt-6">
        <TripContextBar
          vehicleId={
            queueItem.vehicleId
          }
          trip={
            queueItem.trip
          }
          brand={
            queueItem.brand
          }
          district={
            queueItem.district
          }
          temperature={
            queueItem.temperature
          }
          planVersion={
            queueItem.planVersion
          }
        />
      </div>

      <Card className="mt-5 overflow-hidden">
        <LoadCompletionHero
          vehicleId={
            queueItem.vehicleId
          }
          title={
            readyRecorded
              ? 'Ready to Depart'
              : canBecomeReady
                ? 'Final Check Complete'
                : 'Action Required'
          }
          subtitle={`${queueItem.trip} · ${queueItem.brand} · planned departure ${queueItem.departure} · ${queueItem.stops} ${queueItem.stops === 1 ? 'stop' : 'stops'}`}
        />

        <div className="p-5 md:p-7">
          <section
            aria-label="Load completion summary"
            className="grid gap-3 sm:grid-cols-3"
          >
            <CompletionMetric
              label="Orders"
              value={String(
                totals.orderCount,
              )}
              detail="assigned"
              tone="neutral"
            />

            <CompletionMetric
              label="Units"
              value={`${totals.loaded} / ${totals.expected}`}
              detail="good quantity loaded"
              tone="neutral"
            />

            <CompletionMetric
              label="Exceptions"
              value={String(
                tripIssues.length,
              )}
              detail={
                openIssues.length >
                  0
                  ? `${openIssues.length} unresolved`
                  : 'no open issues'
              }
              tone={
                openIssues.length >
                  0
                  ? 'warning'
                  : 'neutral'
              }
            />
          </section>

          {shortItems.length >
            0 && (
              <section
                aria-labelledby="exceptions-heading"
                className="mt-7"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2
                      id="exceptions-heading"
                      className="text-xl font-semibold tracking-tight text-ink"
                    >
                      Quantity
                      exceptions
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-subtle">
                      A quantity
                      below the
                      ordered amount
                      must have a
                      recorded
                      Dispatcher
                      ship-short
                      decision before
                      departure.
                    </p>
                  </div>

                  <span
                    className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${unresolvedShortItems.length ===
                        0
                        ? 'bg-brand-pale text-forest'
                        : 'bg-amber-pale text-amber-ink'
                      }`}
                  >
                    {unresolvedShortItems.length ===
                      0
                      ? 'All cleared'
                      : `${unresolvedShortItems.length} blocking`}
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {shortItems.map(
                    (item) => {
                      const issue =
                        issues[
                        item.itemId
                        ];

                      const shipShort =
                        issue?.resolution ===
                        'ship_short';

                      const waiting =
                        issue?.resolution ===
                        'open' ||
                        (!issue
                          ?.resolution &&
                          Boolean(
                            issue,
                          ));

                      const cancelled =
                        shipShort
                          ? issue
                            ?.cancelledQuantity ??
                          Math.max(
                            0,
                            item.expected -
                            (issue
                              ?.approvedShipQuantity ??
                              item.loaded),
                          )
                          : 0;

                      return (
                        <div
                          key={
                            item.itemId
                          }
                          className="flex flex-col gap-4 rounded-card border border-line/80 bg-surface p-5 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex gap-3">
                            <span
                              className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${shipShort
                                  ? 'bg-brand-pale text-forest'
                                  : 'bg-amber-pale text-amber-ink'
                                }`}
                            >
                              {shipShort ? (
                                <PackageCheckIcon
                                  aria-hidden="true"
                                  className="h-5 w-5"
                                />
                              ) : (
                                <CircleAlertIcon
                                  aria-hidden="true"
                                  className="h-5 w-5"
                                />
                              )}
                            </span>

                            <div>
                              <p className="font-semibold text-ink">
                                {
                                  item.orderId
                                }
                                {' · '}
                                {
                                  item.name
                                }
                              </p>

                              <p className="mt-1 text-sm text-subtle">
                                Expected{' '}
                                {
                                  item.expected
                                }{' '}
                                {
                                  item.unit
                                }
                                {' · '}
                                Loaded{' '}
                                {
                                  item.loaded
                                }{' '}
                                {
                                  item.unit
                                }
                              </p>

                              {shipShort ? (
                                <p className="mt-2 text-sm font-semibold text-forest">
                                  Ship{' '}
                                  {
                                    issue
                                      ?.approvedShipQuantity ??
                                    item.loaded
                                  }{' '}
                                  {
                                    item.unit
                                  }
                                  {' · '}
                                  Cancel{' '}
                                  {
                                    cancelled
                                  }{' '}
                                  {
                                    item.unit
                                  }
                                </p>
                              ) : (
                                <p className="mt-2 text-sm font-semibold text-amber-ink">
                                  {!issue
                                    ? 'Issue not reported'
                                    : waiting
                                      ? 'Awaiting Dispatcher decision'
                                      : 'Valid ship-short decision required'}
                                </p>
                              )}
                            </div>
                          </div>

                          <Link
                            to={buildIssueLink(
                              tripId,
                              item.orderId,
                              item.itemId,
                            )}
                            className={buttonStyles(
                              shipShort
                                ? 'secondary'
                                : 'outline',
                              'md',
                            )}
                          >
                            {!issue
                              ? 'Report Issue'
                              : 'View Issue'}
                          </Link>
                        </div>
                      );
                    },
                  )}
                </div>
              </section>
            )}

          {tripIssues.some(
            (issue) =>
              issue.resolution ===
              'replacement_loaded',
          ) && (
              <section className="mt-7">
                <h2 className="text-xl font-semibold tracking-tight text-ink">
                  Local
                  replacements
                </h2>

                <p className="mt-1 text-sm text-subtle">
                  Damaged goods
                  that were
                  replaced with
                  identical units
                  are retained in
                  the loading
                  record.
                </p>

                <div className="mt-4 space-y-3">
                  {tripIssues
                    .filter(
                      (issue) =>
                        issue.resolution ===
                        'replacement_loaded',
                    )
                    .map(
                      (issue) => (
                        <div
                          key={
                            issue.itemId
                          }
                          className="flex gap-3 rounded-card border border-brand/20 bg-brand-pale p-4"
                        >
                          <CheckCircle2Icon
                            aria-hidden="true"
                            className="mt-0.5 h-5 w-5 shrink-0 text-forest"
                          />

                          <div>
                            <p className="font-semibold text-forest">
                              {
                                issue.orderId
                              }
                              {' · '}
                              {
                                issue.itemName
                              }
                            </p>

                            <p className="mt-1 text-sm text-forest/75">
                              {
                                issue.replacementQuantity ??
                                issue.damagedQuantity ??
                                0
                              }{' '}
                              {
                                issue.unit
                              }{' '}
                              replaced
                              locally.
                            </p>
                          </div>
                        </div>
                      ),
                    )}
                </div>
              </section>
            )}

          {!canBecomeReady && (
            <div
              role="status"
              className="mt-7 rounded-card border border-amber/40 bg-amber-pale p-5"
            >
              <div className="flex gap-3">
                <CircleAlertIcon
                  aria-hidden="true"
                  className="mt-0.5 h-5 w-5 shrink-0 text-amber-ink"
                />

                <div>
                  <p className="font-semibold text-amber-ink">
                    Ready to
                    Depart is
                    blocked
                  </p>

                  <p className="mt-1 text-sm leading-6 text-amber-ink">
                    Resolve all
                    open loading
                    issues and
                    obtain a
                    ship-short
                    decision for
                    every quantity
                    shortage.
                  </p>
                </div>
              </div>
            </div>
          )}

          {readyRecorded && (
            <div
              role="status"
              className="mt-7 rounded-card border border-brand/25 bg-brand-pale p-5"
            >
              <div className="flex gap-3">
                <CheckCircle2Icon
                  aria-hidden="true"
                  className="mt-0.5 h-5 w-5 shrink-0 text-forest"
                />

                <div>
                  <p className="font-semibold text-forest">
                    Trip marked
                    Ready to
                    Depart
                  </p>

                  <p className="mt-1 text-sm leading-6 text-forest/75">
                    The final
                    loaded
                    quantities and
                    loading
                    exceptions are
                    ready for the
                    Driver
                    handoff.
                  </p>
                </div>
              </div>
            </div>
          )}

          <aside className="mt-7 rounded-card border border-brand/15 bg-canvas/60 p-5">
            <div className="flex gap-3">
              <PackageCheckIcon
                aria-hidden="true"
                className="mt-0.5 h-5 w-5 shrink-0 text-forest"
              />

              <div>
                <p className="font-semibold text-ink">
                  Driver handoff
                </p>

                <p className="mt-1 text-sm leading-6 text-subtle">
                  The Driver
                  should receive
                  the final actual
                  quantities,
                  cancelled
                  quantities, and
                  any loading
                  exception flags
                  with this trip.
                </p>
              </div>
            </div>
          </aside>

          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-end">
            <Link
              to="/"
              className={buttonStyles(
                'secondary',
                'lg',
              )}
            >
              Back to Loading
              Queue
            </Link>

            <Button
              size="lg"
              onClick={() =>
                confirmHandoff(
                  tripId,
                )
              }
              disabled={
                readyRecorded ||
                !canBecomeReady
              }
            >
              <SendIcon
                aria-hidden="true"
                className="h-4 w-4"
              />

              {readyRecorded
                ? 'Ready Status Recorded'
                : 'Confirm Ready to Depart'}
            </Button>
          </div>
        </div>
      </Card>
    </PageContainer>
  );
}

function CompletionMetric({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone:
  | 'neutral'
  | 'warning';
}) {
  return (
    <div
      className={`rounded-card border p-5 ${tone ===
          'warning'
          ? 'border-amber/30 bg-amber-pale'
          : 'border-line/70 bg-canvas/65'
        }`}
    >
      <p
        className={`text-sm font-medium ${tone ===
            'warning'
            ? 'text-amber-ink'
            : 'text-subtle'
          }`}
      >
        {label}
      </p>

      <p
        className={`mt-3 text-[30px] font-semibold leading-none tabular-nums ${tone ===
            'warning'
            ? 'text-amber-ink'
            : 'text-ink'
          }`}
      >
        {value}
      </p>

      <p
        className={`mt-2 text-xs font-medium ${tone ===
            'warning'
            ? 'text-amber-ink'
            : 'text-subtle'
          }`}
      >
        {detail}
      </p>
    </div>
  );
}

function buildIssueLink(
  tripId: string,
  orderId: string,
  itemId: string,
) {
  const params =
    new URLSearchParams({
      tripId,
      orderId,
      itemId,
    });

  return `/issues?${params.toString()}`;
}

function CompletionUnavailable() {
  return (
    <PageContainer>
      <Card className="mx-auto max-w-lg p-8 text-center">
        <CircleAlertIcon
          aria-hidden="true"
          className="mx-auto h-7 w-7 text-amber-ink"
        />

        <h1 className="mt-4 text-xl font-semibold text-ink">
          Loading record
          unavailable
        </h1>

        <p className="mt-2 text-sm leading-6 text-subtle">
          Return to the
          Loading Queue and
          select a published
          trip.
        </p>

        <Link
          to="/"
          className={`${buttonStyles(
            'primary',
            'md',
          )} mt-6`}
        >
          Back to Loading
          Queue
        </Link>
      </Card>
    </PageContainer>
  );
}