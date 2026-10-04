import React from 'react';

import {
  Link,
  useSearchParams,
} from 'react-router-dom';

import {
  CheckCircle2Icon,
  CircleAlertIcon,
  PackageCheckIcon,
  SendIcon,
} from 'lucide-react';

import { useLoader } from '../contexts/LoaderContext';

import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';

import { buttonStyles } from '../components/ui/Button';

import { LoadingIssue } from './LoadingIssue';

export function LoaderIssues() {
  const [
    searchParams,
  ] = useSearchParams();

  const { issues } =
    useLoader();

  /**
   * VehicleLoadDetail currently sends an item to:
   *
   * /issues?tripId=...&orderId=...&itemId=...
   *
   * In that case this page becomes the issue-report screen.
   */
  if (
    searchParams.get(
      'itemId',
    )
  ) {
    return (
      <LoadingIssue />
    );
  }

  const reportedIssues =
    Object.values(
      issues,
    );

  return (
    <PageContainer>
      <PageHeader
        title="Loading Issues"
        subtitle="Missing, damaged, locally replaced, and Dispatcher-resolved loading exceptions."
      />

      {reportedIssues.length >
        0 ? (
        <div className="mt-6 space-y-4">
          {reportedIssues.map(
            (issue) => {
              const waiting =
                issue.resolution ===
                'open' ||
                !issue.resolution;

              const replaced =
                issue.resolution ===
                'replacement_loaded';

              const shipShort =
                issue.resolution ===
                'ship_short';

              const resolved =
                replaced ||
                shipShort ||
                issue.resolution ===
                'resolved';

              const cancelled =
                issue.cancelledQuantity ??
                (shipShort
                  ? Math.max(
                    0,
                    issue.expected -
                    (issue.approvedShipQuantity ??
                      issue.loaded),
                  )
                  : 0);

              return (
                <Card
                  key={`${issue.tripId ?? 'trip'}-${issue.orderId}-${issue.itemId}`}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between md:p-6">
                    <div className="flex min-w-0 gap-3">
                      <IssueIcon
                        waiting={
                          waiting
                        }
                        replaced={
                          replaced
                        }
                        resolved={
                          resolved
                        }
                      />

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-ink">
                            {
                              issue.orderId
                            }

                            <span className="font-normal text-subtle">
                              {' · '}
                              {
                                issue.itemName
                              }
                            </span>
                          </p>

                          <StatusBadge
                            waiting={
                              waiting
                            }
                            replaced={
                              replaced
                            }
                            shipShort={
                              shipShort
                            }
                          />
                        </div>

                        <p className="mt-1 text-sm leading-6 text-subtle">
                          Expected{' '}
                          {
                            issue.expected
                          }{' '}
                          {
                            issue.unit
                          }

                          {' · '}

                          Good loaded{' '}
                          {
                            issue.loaded
                          }{' '}
                          {
                            issue.unit
                          }

                          {issue.damagedQuantity !==
                            undefined && (
                              <>
                                {' · '}
                                Damaged{' '}
                                {
                                  issue.damagedQuantity
                                }{' '}
                                {
                                  issue.unit
                                }
                              </>
                            )}
                        </p>

                        {replaced && (
                          <p className="mt-1 text-sm font-medium text-forest">
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
                        )}

                        {shipShort && (
                          <p className="mt-1 text-sm font-medium text-amber-ink">
                            Ship{' '}
                            {
                              issue.approvedShipQuantity ??
                              issue.loaded
                            }{' '}
                            {
                              issue.unit
                            }
                            {' · '}
                            Cancel{' '}
                            {
                              cancelled
                            }{' '}
                            {
                              issue.unit
                            }
                            .
                          </p>
                        )}

                        {waiting && (
                          <p className="mt-1 text-sm font-medium text-amber-ink">
                            Awaiting
                            Dispatcher
                            decision.
                            Loading of
                            unaffected
                            items may
                            continue.
                          </p>
                        )}
                      </div>
                    </div>

                    <Link
                      to={issueLink(
                        issue,
                      )}
                      className={buttonStyles(
                        'secondary',
                        'md',
                      )}
                    >
                      View issue
                    </Link>
                  </div>
                </Card>
              );
            },
          )}
        </div>
      ) : (
        <Card className="mt-6 p-8 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-pale text-forest">
            <CheckCircle2Icon
              aria-hidden="true"
              className="h-6 w-6"
            />
          </span>

          <h2 className="mt-4 text-lg font-semibold text-ink">
            No loading
            issues
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-subtle">
            Missing,
            damaged, and
            replacement
            records will appear
            here when they are
            recorded during
            loading.
          </p>

          <Link
            to="/"
            className={`${buttonStyles(
              'secondary',
              'md',
            )} mt-5`}
          >
            Back to Loading
            Queue
          </Link>
        </Card>
      )}
    </PageContainer>
  );
}

function IssueIcon({
  waiting,
  replaced,
  resolved,
}: {
  waiting: boolean;
  replaced: boolean;
  resolved: boolean;
}) {
  if (replaced) {
    return (
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-pale text-forest">
        <PackageCheckIcon
          aria-hidden="true"
          className="h-5 w-5"
        />
      </span>
    );
  }

  if (waiting) {
    return (
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-pale text-amber-ink">
        <SendIcon
          aria-hidden="true"
          className="h-5 w-5"
        />
      </span>
    );
  }

  return (
    <span
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${resolved
          ? 'bg-brand-pale text-forest'
          : 'bg-amber-pale text-amber-ink'
        }`}
    >
      {resolved ? (
        <CheckCircle2Icon
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
  );
}

function StatusBadge({
  waiting,
  replaced,
  shipShort,
}: {
  waiting: boolean;
  replaced: boolean;
  shipShort: boolean;
}) {
  if (replaced) {
    return (
      <span className="rounded-full bg-brand-pale px-3 py-1 text-xs font-semibold text-forest ring-1 ring-inset ring-brand/20">
        Replaced locally
      </span>
    );
  }

  if (shipShort) {
    return (
      <span className="rounded-full bg-brand-pale px-3 py-1 text-xs font-semibold text-forest ring-1 ring-inset ring-brand/20">
        Ship short
      </span>
    );
  }

  if (waiting) {
    return (
      <span className="rounded-full bg-amber-pale px-3 py-1 text-xs font-semibold text-amber-ink ring-1 ring-inset ring-amber/30">
        Awaiting
        Dispatcher
      </span>
    );
  }

  return (
    <span className="rounded-full bg-canvas px-3 py-1 text-xs font-semibold text-subtle ring-1 ring-inset ring-line">
      Resolved
    </span>
  );
}

function issueLink(
  issue: {
    tripId?: string;
    orderId: string;
    itemId: string;
    orderLineId?: string;
  },
) {
  const params =
    new URLSearchParams();

  if (issue.tripId) {
    params.set(
      'tripId',
      issue.tripId,
    );
  }

  params.set(
    'orderId',
    issue.orderId,
  );

  params.set(
    'itemId',
    issue.itemId,
  );

  if (
    issue.orderLineId
  ) {
    params.set(
      'orderLineId',
      issue.orderLineId,
    );
  }

  return `/issues?${params.toString()}`;
}