import React, {
  useMemo,
} from 'react';

import {
  Link,
  useParams,
} from 'react-router-dom';

import {
  ClipboardCheckIcon,
  PackageCheckIcon,
} from 'lucide-react';

import { useLoader } from '../contexts/LoaderContext';

import {
  computeLoadTotals,
} from '../utils/loader';

import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';

import { buttonStyles } from '../components/ui/Button';

import { LoadCompletionHero } from '../components/loader/LoadCompletionHero';
import { TripContextBar } from '../components/loader/TripContextBar';

export function QueueCompletedLoad() {
  const {
    tripId:
    routeTripId,
  } = useParams<{
    tripId: string;
  }>();

  const {
    tripDataById,
    quantities,
    issues,
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
      <CompletedUnavailable />
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

  const tripIssues =
    Object.values(
      issues,
    ).filter(
      (issue) =>
        issue.tripId ===
        tripId,
    );

  const shipShortCount =
    tripIssues.filter(
      (issue) =>
        issue.resolution ===
        'ship_short',
    ).length;

  const replacementCount =
    tripIssues.filter(
      (issue) =>
        issue.resolution ===
        'replacement_loaded',
    ).length;

  return (
    <PageContainer className="max-w-[960px]">
      <PageHeader
        backTo={{
          to: '/completed',
          label:
            'Completed Loads',
        }}
        title="Completed Load"
        subtitle={`${queueItem.vehicleId} · ${queueItem.trip} · ${queueItem.brand}`}
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
          title="Loading Completed"
          subtitle={`${queueItem.trip} · ${queueItem.brand} · planned departure ${queueItem.departure}`}
        />

        <div className="p-6 md:p-8">
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryMetric
              label="Orders"
              value={String(
                totals.orderCount,
              )}
            />

            <SummaryMetric
              label="Units loaded"
              value={`${totals.loaded} / ${totals.expected}`}
            />

            <SummaryMetric
              label="Exceptions"
              value={String(
                tripIssues.length,
              )}
            />
          </div>

          <div className="mt-6 flex gap-3 rounded-card border border-brand/15 bg-brand-pale/70 p-5">
            <ClipboardCheckIcon
              aria-hidden="true"
              className="mt-0.5 h-5 w-5 shrink-0 text-forest"
            />

            <div>
              <p className="font-semibold text-forest">
                Loading record
                complete
              </p>

              <p className="mt-1 text-sm leading-6 text-forest/75">
                The final
                loaded
                quantities and
                exception
                resolutions are
                retained with
                this trip.
              </p>
            </div>
          </div>

          {(shipShortCount >
            0 ||
            replacementCount >
            0) && (
              <div className="mt-5 rounded-card border border-line bg-canvas/60 p-5">
                <div className="flex gap-3">
                  <PackageCheckIcon
                    aria-hidden="true"
                    className="mt-0.5 h-5 w-5 shrink-0 text-forest"
                  />

                  <div>
                    <p className="font-semibold text-ink">
                      Exception
                      summary
                    </p>

                    <p className="mt-1 text-sm leading-6 text-subtle">
                      {
                        replacementCount
                      }{' '}
                      local{' '}
                      {replacementCount ===
                        1
                        ? 'replacement'
                        : 'replacements'}
                      {' · '}

                      {
                        shipShortCount
                      }{' '}
                      ship-short{' '}
                      {shipShortCount ===
                        1
                        ? 'decision'
                        : 'decisions'}
                    </p>
                  </div>
                </div>
              </div>
            )}

          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              to="/completed"
              className={buttonStyles(
                'secondary',
                'lg',
              )}
            >
              Completed Loads
            </Link>

            <Link
              to="/"
              className={buttonStyles(
                'primary',
                'lg',
              )}
            >
              Loading Queue
            </Link>
          </div>
        </div>
      </Card>
    </PageContainer>
  );
}

function SummaryMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-card border border-line/70 bg-canvas/65 p-5">
      <p className="text-sm font-medium text-subtle">
        {label}
      </p>

      <p className="mt-3 text-[28px] font-semibold leading-none tabular-nums text-ink">
        {value}
      </p>
    </div>
  );
}

function CompletedUnavailable() {
  return (
    <PageContainer>
      <Card className="mx-auto max-w-lg p-8 text-center">
        <ClipboardCheckIcon
          aria-hidden="true"
          className="mx-auto h-7 w-7 text-forest"
        />

        <h1 className="mt-4 text-xl font-semibold text-ink">
          Completed load
          unavailable
        </h1>

        <p className="mt-2 text-sm leading-6 text-subtle">
          Completed loading
          records will appear
          here when they are
          retrieved from the
          Loader backend.
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