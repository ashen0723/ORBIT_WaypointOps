import React, {
  useMemo,
  useState,
} from 'react';

import {
  Link,
  useParams,
  useSearchParams,
} from 'react-router-dom';

import {
  CameraIcon,
  CheckCircle2Icon,
  CircleAlertIcon,
  PackageCheckIcon,
  SendIcon,
  TriangleAlertIcon,
} from 'lucide-react';

import type {
  LoaderIssueTarget,
  LoaderIssueType,
} from '../types/loader';

import { useLoader } from '../contexts/LoaderContext';

import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';

import {
  Button,
  buttonStyles,
} from '../components/ui/Button';

import { SegmentedControl } from '../components/ui/SegmentedControl';
import { TripContextBar } from '../components/loader/TripContextBar';

const ISSUE_OPTIONS = [
  {
    value: 'missing',
    label: 'Missing',
  },
  {
    value: 'damaged',
    label: 'Damaged',
  },
] as const;

export function LoadingIssue() {
  const {
    itemId: routeItemId,
  } = useParams<{
    itemId?: string;
  }>();

  const [
    searchParams,
  ] = useSearchParams();

  const {
    tripDataById,
    issues,
    quantities,
    reportIssue,
    recordReplacement,
    reportDamagedIssue,
    issueSavingItemId,
    issueErrors,
  } = useLoader();

  const requestedTripId =
    searchParams.get(
      'tripId',
    );

  const requestedOrderId =
    searchParams.get(
      'orderId',
    );

  const requestedItemId =
    searchParams.get(
      'itemId',
    ) ??
    routeItemId;

  const requestedOrderLineId =
    searchParams.get(
      'orderLineId',
    );

  const targetResult =
    useMemo(
      () =>
        findIssueTarget({
          tripDataById,
          requestedTripId,
          requestedOrderId,
          requestedItemId,
          requestedOrderLineId,
        }),
      [
        requestedItemId,
        requestedOrderId,
        requestedOrderLineId,
        requestedTripId,
        tripDataById,
      ],
    );

  const target =
    targetResult?.target;

  const trip =
    targetResult?.trip;

  const existingIssue =
    target
      ? issues[
      target.itemId
      ]
      : undefined;

  const [
    type,
    setType,
  ] =
    useState<LoaderIssueType>(
      existingIssue?.type ??
      'missing',
    );

  const [
    note,
    setNote,
  ] = useState(
    existingIssue?.note ??
    '',
  );

  const [
    photoAttached,
    setPhotoAttached,
  ] = useState(
    existingIssue?.photoAttached ??
    false,
  );

  const [
    damagedQuantity,
    setDamagedQuantity,
  ] = useState(
    existingIssue
      ?.damagedQuantity ??
    1,
  );

  const [
    replacementAvailable,
    setReplacementAvailable,
  ] = useState<
    boolean | null
  >(
    existingIssue
      ?.replacementAvailable ??
    null,
  );

  if (
    !target ||
    !trip
  ) {
    return (
      <IssueUnavailable />
    );
  }

  const currentLoaded =
    quantities[
    target.itemId
    ] ??
    existingIssue?.loaded ??
    0;

  const missingQuantity =
    Math.max(
      0,
      target.expected -
      currentLoaded,
    );

  const returnPath =
    `/trips/${encodeURIComponent(
      trip.tripId,
    )}`;

  if (existingIssue) {
    return (
      <ExistingIssueView
        issue={existingIssue}
        returnPath={
          returnPath
        }
        trip={trip}
      />
    );
  }

  const safeDamagedQuantity =
    Math.max(
      1,
      Math.min(
        target.expected,
        damagedQuantity,
      ),
    );

  const goodAfterDamage =
    Math.max(
      0,
      currentLoaded -
      safeDamagedQuantity,
    );

  const issueSaving =
    issueSavingItemId ===
    target.itemId;

  const issueError =
    issueErrors[
    target.itemId
    ];

  const reportMissing =
    () => {
      void reportIssue(
        target,
        'missing',
        note,
        photoAttached,
      );
    };

  const saveReplacement =
    () => {
      void recordReplacement(
        target,
        safeDamagedQuantity,
        note,
        photoAttached,
      );
    };

  const reportDamage =
    () => {
      void reportDamagedIssue(
        target,
        safeDamagedQuantity,
        note,
        photoAttached,
      );
    };

  return (
    <PageContainer className="max-w-[1100px]">
      <PageHeader
        backTo={{
          to: returnPath,
          label:
            'Trip Loading',
        }}
        title="Report Loading Issue"
        subtitle="Record an item shortage or damage before the trip is marked ready to depart."
      />

      <div className="mt-6">
        <TripContextBar
          vehicleId={
            trip.queueItem
              .vehicleId
          }
          trip={
            trip.queueItem
              .trip
          }
          brand={
            trip.queueItem
              .brand
          }
          district={
            trip.queueItem
              .district
          }
          temperature={
            trip.queueItem
              .temperature
          }
          planVersion={
            trip.queueItem
              .planVersion
          }
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px] lg:items-start">
        <Card className="overflow-hidden">
          <div className="border-b border-amber/30 bg-amber-pale px-5 py-6 md:px-6">
            <div className="flex gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-amber text-amber-ink">
                <CircleAlertIcon
                  aria-hidden="true"
                  className="h-5 w-5"
                />
              </span>

              <div>
                <h2 className="text-lg font-semibold text-amber-ink">
                  Item exception
                </h2>

                <p className="mt-1 max-w-xl text-sm leading-6 text-amber-ink">
                  This report
                  applies only to{' '}
                  <strong>
                    {
                      target.itemName
                    }
                  </strong>
                  .
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 md:p-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailBox
                label="Vehicle"
                value={
                  trip.queueItem
                    .vehicleId
                }
              />

              <DetailBox
                label="Trip"
                value={
                  trip.queueItem
                    .trip
                }
              />

              <DetailBox
                label="Order"
                value={
                  target.orderId
                }
              />

              <DetailBox
                label="Outlet"
                value={
                  target.outletId
                }
              />

              <DetailBox
                label="Item"
                value={
                  target.itemName
                }
              />

              <DetailBox
                label="Expected"
                value={`${target.expected} ${target.unit}`}
              />
            </div>

            <div className="mt-6">
              <p className="text-sm font-semibold text-ink">
                Issue type
              </p>

              <div className="mt-2 max-w-sm">
                <SegmentedControl
                  label="Issue type"
                  options={[
                    ...ISSUE_OPTIONS,
                  ]}
                  value={type}
                  onChange={(
                    nextType,
                  ) => {
                    setType(
                      nextType,
                    );

                    setReplacementAvailable(
                      null,
                    );
                  }}
                  selectedClassName="bg-amber text-amber-ink shadow-card"
                />
              </div>
            </div>

            {type ===
              'missing' ? (
              <section className="mt-6">
                <h3 className="text-sm font-semibold text-ink">
                  Shortage
                </h3>

                <dl className="mt-3 grid grid-cols-3 gap-3">
                  <IssueMetric
                    label="Expected"
                    value={
                      target.expected
                    }
                  />

                  <IssueMetric
                    label="Loaded"
                    value={
                      currentLoaded
                    }
                  />

                  <IssueMetric
                    label="Short"
                    value={
                      missingQuantity
                    }
                    danger
                  />
                </dl>

                {missingQuantity ===
                  0 && (
                    <div className="mt-4 rounded-2xl border border-brand/20 bg-brand-pale p-4 text-sm text-forest">
                      The recorded
                      loaded quantity
                      already matches
                      the expected
                      quantity. Change
                      the loaded
                      quantity before
                      reporting a
                      shortage.
                    </div>
                  )}
              </section>
            ) : (
              <section className="mt-6">
                <h3 className="text-sm font-semibold text-ink">
                  Damaged
                  quantity
                </h3>

                <p className="mt-1 text-sm leading-6 text-subtle">
                  Enter the number
                  of units that
                  cannot be shipped
                  in their current
                  condition.
                </p>

                <div className="mt-3 max-w-[180px]">
                  <input
                    type="number"
                    min={1}
                    max={
                      target.expected
                    }
                    step={1}
                    value={
                      damagedQuantity
                    }
                    onChange={(
                      event,
                    ) => {
                      const value =
                        Number(
                          event
                            .target
                            .value,
                        );

                      if (
                        Number.isFinite(
                          value,
                        )
                      ) {
                        setDamagedQuantity(
                          Math.max(
                            1,
                            Math.min(
                              target.expected,
                              Math.trunc(
                                value,
                              ),
                            ),
                          ),
                        );
                      }
                    }}
                    className="h-12 w-full rounded-full border border-line bg-surface px-5 text-center text-base font-semibold tabular-nums text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  />
                </div>

                <div className="mt-6">
                  <p className="text-sm font-semibold text-ink">
                    Are enough
                    identical
                    replacements
                    available for
                    all damaged
                    units?
                  </p>

                  <div className="mt-3 grid max-w-sm grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setReplacementAvailable(
                          true,
                        )
                      }
                      className={`h-11 rounded-full border text-sm font-semibold transition-colors ${replacementAvailable ===
                          true
                          ? 'border-brand bg-brand-pale text-forest'
                          : 'border-line bg-surface text-ink hover:bg-canvas'
                        }`}
                    >
                      Yes
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setReplacementAvailable(
                          false,
                        )
                      }
                      className={`h-11 rounded-full border text-sm font-semibold transition-colors ${replacementAvailable ===
                          false
                          ? 'border-amber bg-amber-pale text-amber-ink'
                          : 'border-line bg-surface text-ink hover:bg-canvas'
                        }`}
                    >
                      No
                    </button>
                  </div>
                </div>

                {replacementAvailable ===
                  true && (
                    <div className="mt-5 rounded-card border border-brand/25 bg-brand-pale p-4">
                      <div className="flex gap-3">
                        <PackageCheckIcon
                          aria-hidden="true"
                          className="mt-0.5 h-5 w-5 shrink-0 text-forest"
                        />

                        <div>
                          <p className="font-semibold text-forest">
                            Replace
                            locally
                          </p>

                          <p className="mt-1 text-sm leading-6 text-forest/80">
                            Record the
                            identical
                            replacement
                            and continue.
                            Dispatcher
                            approval is
                            not required.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                {replacementAvailable ===
                  false && (
                    <div className="mt-5 rounded-card border border-amber/35 bg-amber-pale p-4">
                      <div className="flex gap-3">
                        <TriangleAlertIcon
                          aria-hidden="true"
                          className="mt-0.5 h-5 w-5 shrink-0 text-amber-ink"
                        />

                        <div>
                          <p className="font-semibold text-amber-ink">
                            Dispatcher
                            decision
                            required
                          </p>

                          <p className="mt-1 text-sm leading-6 text-amber-ink">
                            Good quantity
                            remaining
                            after the
                            damaged units
                            are removed:{' '}

                            <strong>
                              {
                                goodAfterDamage
                              }{' '}
                              {
                                target.unit
                              }
                            </strong>
                            .
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
              </section>
            )}

            <div className="mt-6">
              <label
                htmlFor="issue-note"
                className="text-sm font-semibold text-ink"
              >
                Note{' '}

                <span className="font-normal text-subtle">
                  (optional)
                </span>
              </label>

              <textarea
                id="issue-note"
                value={note}
                onChange={(
                  event,
                ) =>
                  setNote(
                    event.target
                      .value,
                  )
                }
                rows={3}
                placeholder="Add a short note"
                className="mt-2 w-full resize-none rounded-card border border-line bg-surface px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>

            <button
              type="button"
              onClick={() =>
                setPhotoAttached(
                  (current) =>
                    !current,
                )
              }
              className={`mt-4 inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${photoAttached
                  ? 'border-brand bg-brand-pale text-forest'
                  : 'border-line bg-surface text-ink hover:bg-canvas'
                }`}
            >
              <CameraIcon
                aria-hidden="true"
                className="h-4 w-4"
              />

              {photoAttached
                ? 'Photo attached'
                : type ===
                  'damaged'
                  ? 'Add damage photo (recommended)'
                  : 'Add photo (optional)'}
            </button>
          </div>

          {issueError && (
            <p className="border-t border-danger/20 bg-danger-pale px-5 py-3 text-sm font-medium text-danger-ink md:px-6">
              {issueError}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-line p-5 sm:flex-row sm:justify-end md:p-6">
            <Link
              to={
                returnPath
              }
              className={buttonStyles(
                'ghost',
                'lg',
              )}
            >
              Cancel
            </Link>

            {type ===
              'missing' && (
                <Button
                  size="lg"
                  disabled={
                    missingQuantity ===
                    0 ||
                    issueSaving
                  }
                  onClick={
                    reportMissing
                  }
                >
                  <SendIcon
                    aria-hidden="true"
                    className="h-4 w-4"
                  />

                  {issueSaving
                    ? 'Saving…'
                    : 'Report to Dispatcher'}
                </Button>
              )}

            {type ===
              'damaged' &&
              replacementAvailable ===
              true && (
                <Button
                  size="lg"
                  disabled={
                    issueSaving
                  }
                  onClick={
                    saveReplacement
                  }
                >
                  <PackageCheckIcon
                    aria-hidden="true"
                    className="h-4 w-4"
                  />

                  {issueSaving
                    ? 'Saving…'
                    : 'Record Replacement & Continue'}
                </Button>
              )}

            {type ===
              'damaged' &&
              replacementAvailable ===
              false && (
                <Button
                  size="lg"
                  disabled={
                    issueSaving
                  }
                  onClick={
                    reportDamage
                  }
                >
                  <SendIcon
                    aria-hidden="true"
                    className="h-4 w-4"
                  />

                  {issueSaving
                    ? 'Saving…'
                    : 'Report to Dispatcher'}
                </Button>
              )}
          </div>
        </Card>

        <aside className="rounded-card bg-forest p-6 text-white shadow-pop">
          <p className="text-sm font-semibold text-white/70">
            Issue flow
          </p>

          <ol className="mt-5 space-y-4 text-sm">
            <li className="flex gap-3">
              <StepNumber>
                1
              </StepNumber>

              <span className="leading-6">
                Record the
                actual shortage
                or damaged
                quantity.
              </span>
            </li>

            <li className="flex gap-3">
              <StepNumber>
                2
              </StepNumber>

              <span className="leading-6">
                Identical
                replacements are
                handled locally.
              </span>
            </li>

            <li className="flex gap-3">
              <StepNumber>
                3
              </StepNumber>

              <span className="leading-6">
                Only unresolved
                shortages are
                sent to the
                Dispatcher.
              </span>
            </li>

            <li className="flex gap-3">
              <StepNumber>
                4
              </StepNumber>

              <span className="leading-6">
                You may continue
                loading
                unaffected
                items while a
                decision is
                pending.
              </span>
            </li>
          </ol>
        </aside>
      </div>
    </PageContainer>
  );
}

function ExistingIssueView({
  issue,
  returnPath,
  trip,
}: {
  issue: ReturnType<
    typeof issueIdentity
  >;
  returnPath: string;
  trip: {
    tripId: string;
    queueItem: {
      vehicleId: string;
      trip: string;
      brand: string;
      district: string;
      temperature:
      | 'Reefer'
      | 'Ambient';
      planVersion?: number;
    };
  };
}) {
  const locallyReplaced =
    issue.resolution ===
    'replacement_loaded';

  const waiting =
    issue.resolution ===
    'open' ||
    !issue.resolution;

  const shipShort =
    issue.resolution ===
    'ship_short';

  const approvedQuantity =
    issue.approvedShipQuantity ??
    issue.loaded;

  const cancelledQuantity =
    issue.cancelledQuantity ??
    Math.max(
      0,
      issue.expected -
      approvedQuantity,
    );

  return (
    <PageContainer className="max-w-[960px]">
      <PageHeader
        backTo={{
          to: returnPath,
          label:
            'Trip Loading',
        }}
        title={
          locallyReplaced
            ? 'Replacement Recorded'
            : waiting
              ? 'Issue Reported'
              : 'Issue Resolution'
        }
        subtitle={`${trip.queueItem.vehicleId} · ${trip.queueItem.trip} · ${issue.orderId}`}
      />

      <div className="mt-6">
        <TripContextBar
          vehicleId={
            trip.queueItem
              .vehicleId
          }
          trip={
            trip.queueItem
              .trip
          }
          brand={
            trip.queueItem
              .brand
          }
          district={
            trip.queueItem
              .district
          }
          temperature={
            trip.queueItem
              .temperature
          }
          planVersion={
            trip.queueItem
              .planVersion
          }
        />
      </div>

      <Card className="mt-5 overflow-hidden">
        <div
          className={`p-6 md:p-8 ${locallyReplaced
              ? 'bg-brand-pale/70'
              : waiting
                ? 'bg-amber-pale'
                : 'bg-brand-pale/70'
            }`}
        >
          <span
            className={`grid h-12 w-12 place-items-center rounded-2xl ${waiting
                ? 'bg-amber text-amber-ink'
                : 'bg-forest text-white shadow-card'
              }`}
          >
            {waiting ? (
              <SendIcon
                aria-hidden="true"
                className="h-6 w-6"
              />
            ) : (
              <CheckCircle2Icon
                aria-hidden="true"
                className="h-6 w-6"
              />
            )}
          </span>

          <h2 className="mt-5 text-[28px] font-semibold tracking-tight text-ink">
            {locallyReplaced
              ? 'Identical replacement recorded'
              : waiting
                ? 'Awaiting Dispatcher decision'
                : shipShort
                  ? 'Ship-short decision received'
                  : 'Issue resolved'}
          </h2>

          <p className="mt-2 max-w-xl text-base leading-7 text-subtle">
            {locallyReplaced
              ? 'The damaged units were replaced locally. No Dispatcher approval was required.'
              : waiting
                ? 'You may continue loading other items. This trip cannot be marked ready to depart until the unresolved issue is handled.'
                : shipShort
                  ? 'Proceed with the quantity approved by the Dispatcher. The remaining quantity is cancelled for this order.'
                  : 'This loading issue has been resolved.'}
          </p>
        </div>

        <div className="p-5 md:p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailBox
              label="Order"
              value={
                issue.orderId
              }
            />

            <DetailBox
              label="Item"
              value={
                issue.itemName
              }
            />

            <DetailBox
              label="Expected"
              value={`${issue.expected} ${issue.unit}`}
            />

            <DetailBox
              label="Good loaded"
              value={`${issue.loaded} ${issue.unit}`}
            />

            {issue.damagedQuantity !==
              undefined && (
                <DetailBox
                  label="Damaged"
                  value={`${issue.damagedQuantity} ${issue.unit}`}
                />
              )}

            {issue.replacementQuantity !==
              undefined &&
              issue.replacementQuantity >
              0 && (
                <DetailBox
                  label="Replacement loaded"
                  value={`${issue.replacementQuantity} ${issue.unit}`}
                />
              )}

            {shipShort && (
              <>
                <DetailBox
                  label="Ship"
                  value={`${approvedQuantity} ${issue.unit}`}
                />

                <DetailBox
                  label="Cancelled"
                  value={`${cancelledQuantity} ${issue.unit}`}
                />
              </>
            )}
          </div>

          {shipShort && (
            <div className="mt-5 rounded-card border border-line bg-canvas p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-subtle">
                Cancellation
                reason
              </p>

              <p className="mt-2 text-sm font-medium leading-6 text-ink">
                {issue.cancellationReason ??
                  'Warehouse stock shortage'}
              </p>
            </div>
          )}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              to="/issues"
              className={buttonStyles(
                'secondary',
                'lg',
              )}
            >
              View all issues
            </Link>

            <Link
              to={
                returnPath
              }
              className={buttonStyles(
                waiting
                  ? 'secondary'
                  : 'primary',
                'lg',
              )}
            >
              {waiting
                ? 'Continue Other Loading'
                : 'Continue Loading'}
            </Link>
          </div>
        </div>
      </Card>
    </PageContainer>
  );
}

/**
 * Keeps the inferred LoaderIssue type local without importing
 * internal context implementation details.
 */
function issueIdentity(
  issue: {
    orderId: string;
    outletId: string;
    itemId: string;
    itemName: string;
    expected: number;
    unit: string;
    reported: boolean;
    type:
    | 'missing'
    | 'damaged';
    loaded: number;
    note: string;
    photoAttached: boolean;
    decisionReceived: boolean;
    resolution?:
    | 'open'
    | 'replacement_loaded'
    | 'ship_short'
    | 'resolved';
    damagedQuantity?: number;
    replacementQuantity?: number;
    approvedShipQuantity?: number;
    cancelledQuantity?: number;
    cancellationReason?: string;
  },
) {
  return issue;
}

function findIssueTarget({
  tripDataById,
  requestedTripId,
  requestedOrderId,
  requestedItemId,
  requestedOrderLineId,
}: {
  tripDataById: ReturnType<
    typeof useLoader
  >['tripDataById'];

  requestedTripId:
  | string
  | null;

  requestedOrderId:
  | string
  | null;

  requestedItemId?:
  | string;

  requestedOrderLineId:
  | string
  | null;
}) {
  const trips =
    requestedTripId &&
      tripDataById[
      requestedTripId
      ]
      ? [
        tripDataById[
        requestedTripId
        ],
      ]
      : Object.values(
        tripDataById,
      );

  for (const trip of trips) {
    for (const order of trip.orders) {
      if (
        requestedOrderId &&
        order.id !==
        requestedOrderId
      ) {
        continue;
      }

      const item =
        order.items.find(
          (candidate) =>
            candidate.id ===
            requestedItemId ||
            candidate.orderLineId ===
            requestedOrderLineId,
        );

      if (!item) {
        continue;
      }

      const target:
        LoaderIssueTarget = {
        tripId:
          trip.tripId,

        orderLineId:
          item.orderLineId ??
          item.id,

        orderId:
          order.id,

        outletId:
          order.outletId,

        itemId:
          item.id,

        itemName:
          item.name,

        expected:
          item.expected,

        unit:
          item.unit,
      };

      return {
        target,
        trip,
      };
    }
  }

  return undefined;
}

function IssueUnavailable() {
  return (
    <PageContainer>
      <Card className="mx-auto max-w-lg p-8 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-amber-pale text-amber-ink">
          <CircleAlertIcon
            aria-hidden="true"
            className="h-6 w-6"
          />
        </span>

        <h1 className="mt-4 text-xl font-semibold text-ink">
          Item unavailable
        </h1>

        <p className="mt-2 text-sm leading-6 text-subtle">
          Open a published
          trip and select an
          item before reporting
          a loading issue.
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

function DetailBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-canvas/65 px-4 py-3">
      <p className="text-xs font-semibold text-subtle">
        {label}
      </p>

      <p className="mt-1 text-base font-semibold text-ink">
        {value}
      </p>
    </div>
  );
}

function IssueMetric({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${danger
          ? 'border-danger/20 bg-danger-pale'
          : 'border-line/80 bg-surface'
        }`}
    >
      <dt
        className={`text-xs font-semibold ${danger
            ? 'text-danger-ink'
            : 'text-subtle'
          }`}
      >
        {label}
      </dt>

      <dd
        className={`mt-2 text-2xl font-semibold tabular-nums ${danger
            ? 'text-danger-ink'
            : 'text-ink'
          }`}
      >
        {value}
      </dd>
    </div>
  );
}

function StepNumber({
  children,
}: {
  children:
  React.ReactNode;
}) {
  return (
    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/15 font-semibold ring-1 ring-inset ring-white/15">
      {children}
    </span>
  );
}
