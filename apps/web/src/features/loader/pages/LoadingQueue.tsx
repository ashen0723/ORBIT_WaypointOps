import React, {
  useMemo,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  Clock3Icon,
  RefreshCwIcon,
  SearchIcon,
  SnowflakeIcon,
  TriangleAlertIcon,
  TruckIcon,
} from 'lucide-react';

import type {
  LoadQueueItem,
  LoaderQueueStatus,
} from '../types/loader';

import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { buttonStyles } from '../components/ui/Button';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { LoaderStatusChip } from '../components/loader/LoaderStatusChip';

import { useLoader } from '../contexts/LoaderContext';
import { useAuth } from '../../../app/providers/AuthProvider';

type QueueFilter =
  | 'all'
  | 'ready'
  | 'in_progress'
  | 'attention'
  | 'completed';

const FILTER_OPTIONS = [
  {
    value: 'all',
    label: 'All',
  },
  {
    value: 'ready',
    label: 'Ready',
  },
  {
    value: 'in_progress',
    label: 'Loading',
  },
  {
    value: 'attention',
    label: 'Attention',
  },
  {
    value: 'completed',
    label: 'Completed',
  },
] as const;

const visibleForFilter:
  Record<
    QueueFilter,
    LoaderQueueStatus[] | null
  > = {
  all: null,

  ready: [
    'ready',
    'ready_to_load',
    'ready_to_depart',
  ],

  in_progress: [
    'in_progress',
    'loading',
  ],

  attention: [
    'waiting',
    'awaiting_dispatcher',
    'plan_updated',
    'action_required',
  ],

  completed: [
    'completed',
    'loading_completed',
  ],
};

export function LoadingQueue() {
  const { user } = useAuth();

  const {
    queueLoads,
    reviewedPlanVehicleIds,
    handedOffVehicleIds,
  } = useLoader();

  const [
    filter,
    setFilter,
  ] =
    useState<QueueFilter>(
      'all',
    );

  const [
    query,
    setQuery,
  ] = useState('');

  const normalizedQuery =
    query
      .trim()
      .toLowerCase();

  const loads =
    useMemo(
      () =>
        queueLoads.map(
          (load) => {
            const identity =
              load.tripId ??
              load.vehicleId;

            if (
              handedOffVehicleIds.includes(
                identity,
              )
            ) {
              return {
                ...load,

                status:
                  'loading_completed' as const,

                priority:
                  'Standard' as const,

                priorityReason:
                  undefined,
              };
            }

            if (
              reviewedPlanVehicleIds.includes(
                identity,
              ) &&
              load.status ===
              'plan_updated'
            ) {
              return {
                ...load,

                status:
                  'ready_to_load' as const,

                priority:
                  'Standard' as const,

                priorityReason:
                  undefined,

                updateMessage:
                  undefined,

                requiresPlanAcknowledgement:
                  false,
              };
            }

            return load;
          },
        ),
      [
        handedOffVehicleIds,
        queueLoads,
        reviewedPlanVehicleIds,
      ],
    );

  const visibleLoads =
    useMemo(() => {
      const statuses =
        visibleForFilter[
        filter
        ];

      return loads.filter(
        (load) => {
          const matchesStatus =
            !statuses ||
            statuses.includes(
              load.status,
            );

          const searchable =
            [
              load.vehicleId,
              load.trip,
              load.brand,
              load.district,
            ]
              .join(' ')
              .toLowerCase();

          const matchesSearch =
            !normalizedQuery ||
            searchable.includes(
              normalizedQuery,
            );

          return (
            matchesStatus &&
            matchesSearch
          );
        },
      );
    }, [
      filter,
      loads,
      normalizedQuery,
    ]);

  const stats =
    useMemo(
      () => ({
        ready:
          loads.filter(
            (load) =>
              [
                'ready',
                'ready_to_load',
                'ready_to_depart',
              ].includes(
                load.status,
              ),
          ).length,

        inProgress:
          loads.filter(
            (load) =>
              [
                'in_progress',
                'loading',
              ].includes(
                load.status,
              ),
          ).length,

        attention:
          loads.filter(
            (load) =>
              [
                'waiting',
                'awaiting_dispatcher',
                'plan_updated',
                'action_required',
              ].includes(
                load.status,
              ),
          ).length,

        completed:
          loads.filter(
            (load) =>
              [
                'completed',
                'loading_completed',
              ].includes(
                load.status,
              ),
          ).length,
      }),
      [loads],
    );

  const featuredLoad =
    useMemo(() => {
      if (
        filter !== 'all' ||
        normalizedQuery
      ) {
        return undefined;
      }

      return loads
        .filter(
          (load) =>
            ![
              'completed',
              'loading_completed',
            ].includes(
              load.status,
            ),
        )
        .sort(
          (a, b) =>
            a.departure.localeCompare(
              b.departure,
            ),
        )[0];
    }, [
      filter,
      loads,
      normalizedQuery,
    ]);

  const cardLoads =
    visibleLoads.filter(
      (load) =>
        load.tripId !==
        featuredLoad?.tripId ||
        load.vehicleId !==
        featuredLoad?.vehicleId,
    );

  const depotLabel =
    user?.depotId ??
    'Depot not assigned';

  return (
    <PageContainer>
      <PageHeader
        title="Loading Queue"
        subtitle={
          <>
            <span className="font-semibold text-ink">
              {depotLabel}
            </span>

            {' · '}

            Published loading work
            for your depot
          </>
        }
        actions={
          <span className="inline-flex h-10 items-center gap-2 rounded-full bg-brand-pale px-4 text-sm font-semibold text-forest ring-1 ring-inset ring-brand/20">
            <span className="h-2 w-2 rounded-full bg-brand-medium" />

            Loader workspace
          </span>
        }
      />

      <section
        aria-label="Queue overview"
        className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        <QueueMetric
          label="Ready"
          value={stats.ready}
          icon={
            <TruckIcon
              aria-hidden="true"
              className="h-4 w-4"
            />
          }
          tone="forest"
        />

        <QueueMetric
          label="Loading"
          value={
            stats.inProgress
          }
          icon={
            <Clock3Icon
              aria-hidden="true"
              className="h-4 w-4"
            />
          }
          tone="pale"
        />

        <QueueMetric
          label="Needs attention"
          value={
            stats.attention
          }
          icon={
            <TriangleAlertIcon
              aria-hidden="true"
              className="h-4 w-4"
            />
          }
          tone="amber"
        />

        <QueueMetric
          label="Completed"
          value={
            stats.completed
          }
          icon={
            <CheckCircle2Icon
              aria-hidden="true"
              className="h-4 w-4"
            />
          }
          tone="surface"
        />
      </section>

      <section
        aria-label="Loading queue controls"
        className="mt-7 flex flex-col gap-4 border-y border-line py-4 xl:flex-row xl:items-center xl:justify-between"
      >
        <div className="overflow-x-auto pb-1">
          <SegmentedControl
            label="Filter loading queue"
            options={[
              ...FILTER_OPTIONS,
            ]}
            value={filter}
            onChange={setFilter}
          />
        </div>

        <label className="relative block w-full max-w-sm">
          <span className="sr-only">
            Search loading queue
          </span>

          <SearchIcon
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          />

          <input
            value={query}
            onChange={(
              event,
            ) =>
              setQuery(
                event.target
                  .value,
              )
            }
            placeholder="Search vehicle, trip, brand, or district"
            className="h-11 w-full rounded-full border border-line/80 bg-surface pl-10 pr-4 text-sm text-ink outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </label>
      </section>

      {featuredLoad && (
        <section
          aria-labelledby="priority-load-heading"
          className="mt-7"
        >
          <div className="mb-3">
            <p className="text-sm font-semibold text-forest">
              Next planned load
            </p>

            <h2
              id="priority-load-heading"
              className="mt-1 text-xl font-semibold tracking-tight text-ink"
            >
              Loading priority
            </h2>
          </div>

          <FeaturedLoad
            load={featuredLoad}
          />
        </section>
      )}

      {cardLoads.length >
        0 && (
          <section
            aria-labelledby="queue-cards-heading"
            className="mt-8"
          >
            <div>
              <h2
                id="queue-cards-heading"
                className="text-xl font-semibold tracking-tight text-ink"
              >
                {featuredLoad
                  ? 'Other loads'
                  : filterLabel(
                    filter,
                  )}
              </h2>

              <p className="mt-1 text-sm text-subtle">
                Open a published
                trip to review its
                loading work.
              </p>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              {cardLoads.map(
                (load) => (
                  <LoadCard
                    key={
                      load.tripId ??
                      `${load.vehicleId}-${load.trip}`
                    }
                    load={load}
                  />
                ),
              )}
            </div>
          </section>
        )}

      {loads.length ===
        0 && (
          <Card className="mt-7 p-8 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-pale text-forest">
              <TruckIcon
                aria-hidden="true"
                className="h-6 w-6"
              />
            </span>

            <p className="mt-4 font-semibold text-ink">
              No published
              loading trips
            </p>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-subtle">
              Trips published by
              the Dispatcher for
              this Loader&apos;s
              depot will appear
              here when the Loader
              backend is connected.
            </p>
          </Card>
        )}

      {loads.length > 0 &&
        visibleLoads.length ===
        0 && (
          <Card className="mt-7 p-8 text-center">
            <p className="font-semibold text-ink">
              No loads match
              this view
            </p>

            <p className="mt-1 text-sm text-subtle">
              Try another queue
              status or search
              term.
            </p>
          </Card>
        )}
    </PageContainer>
  );
}

function QueueMetric({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone:
  | 'forest'
  | 'pale'
  | 'amber'
  | 'surface';
}) {
  const styles = {
    forest:
      'border-forest bg-forest text-white',

    pale:
      'border-brand/15 bg-brand-pale text-forest',

    amber:
      'border-amber/25 bg-amber-pale text-amber-ink',

    surface:
      'border-line/80 bg-surface text-ink',
  };

  return (
    <div
      className={`flex min-h-[116px] flex-col justify-between rounded-card border p-5 shadow-card ${styles[tone]}`}
    >
      <span className="grid h-8 w-8 place-items-center rounded-full bg-white/15 ring-1 ring-inset ring-current/15">
        {icon}
      </span>

      <div>
        <p className="text-[32px] font-semibold leading-none tabular-nums">
          {value}
        </p>

        <p className="mt-2 text-sm font-medium opacity-75">
          {label}
        </p>
      </div>
    </div>
  );
}

function FeaturedLoad({
  load,
}: {
  load: LoadQueueItem;
}) {
  return (
    <Card className="overflow-hidden !border-forest !bg-forest text-white shadow-pop">
      <div className="grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_270px] md:items-stretch md:p-7">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ring-white/25">
              Next planned
              departure
            </span>

            <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/85">
              {load.brand}
            </span>
          </div>

          <div className="mt-6 flex flex-wrap items-end gap-x-4 gap-y-2">
            <h3 className="text-[46px] font-semibold leading-none tabular-nums tracking-tight">
              {load.vehicleId}
            </h3>

            <p className="pb-1 text-base font-medium text-white/75">
              {load.trip}
              {' · '}
              {load.temperature}{' '}
              {load.vehicleType.toLowerCase()}
            </p>
          </div>

          {load.priorityReason && (
            <p className="mt-3 text-sm text-white/70">
              {
                load.priorityReason
              }
            </p>
          )}

          <div className="mt-6 grid max-w-xl grid-cols-2 gap-3 border-t border-white/15 pt-5 sm:grid-cols-4">
            <QueueMeta
              label="Departure"
              value={
                load.departure
              }
            />

            <QueueMeta
              label="Stops"
              value={`${load.stops}`}
            />

            <QueueMeta
              label="Orders"
              value={String(
                load.orderCount,
              )}
            />

            <QueueMeta
              label="District"
              value={
                load.district
              }
            />
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-card border border-white/15 bg-white/10 p-5">
          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white">
                Trip status
              </p>

              <LoaderStatusChip
                status={
                  load.status
                }
              />
            </div>

            <p className="mt-5 text-[30px] font-semibold leading-none tabular-nums">
              {load.departure}
            </p>

            <p className="mt-2 text-sm leading-6 text-white/70">
              Planned load:{' '}
              {load.loadedWeightKg.toLocaleString()}
              {' / '}
              {load.weightCapacityKg.toLocaleString()}
              {' kg · '}
              {
                load.loadedVolumeM3
              }
              {' / '}
              {
                load.volumeCapacityM3
              }
              {' m³'}
            </p>
          </div>

          <Link
            to={destinationFor(
              load,
            )}
            className={`${buttonStyles(
              'secondary',
              'lg',
              true,
            )} mt-5 !border-white/25 !bg-white !text-forest hover:!bg-brand-pale`}
          >
            {labelFor(load)}

            <ArrowRightIcon
              aria-hidden="true"
              className="h-4 w-4"
            />
          </Link>
        </div>
      </div>
    </Card>
  );
}

function LoadCard({
  load,
}: {
  load: LoadQueueItem;
}) {
  const primaryAction =
    [
      'ready',
      'ready_to_load',
      'in_progress',
      'loading',
      'ready_to_depart',
    ].includes(load.status);

  return (
    <Card className="flex min-h-[310px] flex-col overflow-hidden !bg-surface p-5 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[30px] font-semibold leading-none tabular-nums tracking-tight text-ink">
              {load.vehicleId}
            </p>

            <LoaderStatusChip
              status={
                load.status
              }
            />
          </div>

          <p className="mt-2 text-base font-semibold text-ink">
            {load.trip}

            <span className="font-normal text-subtle">
              {' · '}
              {load.brand}
            </span>
          </p>

          <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-subtle">
            {load.temperature ===
              'Reefer' && (
                <SnowflakeIcon
                  aria-hidden="true"
                  className="h-3.5 w-3.5 text-brand"
                />
              )}

            {load.temperature}{' '}
            {load.vehicleType.toLowerCase()}
            {' · '}
            {load.district}
          </p>
        </div>

        <span
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${load.priority ===
              'High'
              ? 'bg-amber-pale text-amber-ink ring-1 ring-inset ring-amber/25'
              : 'bg-canvas text-subtle ring-1 ring-inset ring-line'
            }`}
        >
          {load.priority}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-4 gap-3 border-y border-line py-4">
        <QueueMetaLight
          label="Departure"
          value={
            load.departure
          }
        />

        <QueueMetaLight
          label="Stops"
          value={String(
            load.stops,
          )}
        />

        <QueueMetaLight
          label="Orders"
          value={String(
            load.orderCount,
          )}
        />

        <QueueMetaLight
          label="Planned"
          value={`${load.loadedWeightKg.toLocaleString()} kg`}
        />
      </div>

      {load.updateMessage && (
        <div className="mt-4 flex gap-3 rounded-2xl border border-amber/35 bg-amber-pale px-4 py-3">
          <TriangleAlertIcon
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-ink"
          />

          <div>
            <p className="text-sm font-semibold text-amber-ink">
              Action required
            </p>

            <p className="mt-0.5 text-sm text-amber-ink">
              {
                load.updateMessage
              }
            </p>
          </div>
        </div>
      )}

      <div className="mt-auto pt-5">
        <Link
          to={destinationFor(
            load,
          )}
          className={buttonStyles(
            primaryAction
              ? 'primary'
              : 'secondary',
            'lg',
            true,
          )}
        >
          {labelFor(load)}

          <ArrowRightIcon
            aria-hidden="true"
            className="h-4 w-4"
          />
        </Link>
      </div>
    </Card>
  );
}

function QueueMeta({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-white/60">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-white">
        {value}
      </p>
    </div>
  );
}

function QueueMetaLight({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-subtle">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold tabular-nums text-ink">
        {value}
      </p>
    </div>
  );
}

function labelFor(
  load: LoadQueueItem,
) {
  if (
    load.status ===
    'ready' ||
    load.status ===
    'ready_to_load'
  ) {
    return 'Start Loading';
  }

  if (
    load.status ===
    'in_progress' ||
    load.status ===
    'loading'
  ) {
    return 'Continue Loading';
  }

  if (
    load.status ===
    'plan_updated' ||
    load.status ===
    'action_required'
  ) {
    return 'Review Update';
  }

  if (
    load.status ===
    'awaiting_dispatcher' ||
    load.status ===
    'waiting'
  ) {
    return 'View Issue';
  }

  if (
    load.status ===
    'ready_to_depart'
  ) {
    return 'Final Check';
  }

  if (
    load.status ===
    'completed' ||
    load.status ===
    'loading_completed'
  ) {
    return 'View Load';
  }

  return 'View Trip';
}

function destinationFor(
  load: LoadQueueItem,
) {
  if (!load.tripId) {
    return '/';
  }

  return `/trips/${encodeURIComponent(
    load.tripId,
  )}`;
}

function filterLabel(
  filter: QueueFilter,
) {
  if (filter === 'ready') {
    return 'Ready loads';
  }

  if (
    filter ===
    'in_progress'
  ) {
    return 'Loading in progress';
  }

  if (
    filter === 'attention'
  ) {
    return 'Needs attention';
  }

  if (
    filter === 'completed'
  ) {
    return 'Completed loads';
  }

  return 'All loads';
}