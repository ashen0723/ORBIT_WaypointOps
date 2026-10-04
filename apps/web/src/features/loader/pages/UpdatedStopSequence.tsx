import React from 'react';

import {
  Link,
  useParams,
} from 'react-router-dom';

import {
  CheckIcon,
  RefreshCwIcon,
  TriangleAlertIcon,
} from 'lucide-react';

import { useLoader } from '../contexts/LoaderContext';

import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';

import {
  Button,
  buttonStyles,
} from '../components/ui/Button';

import { TripContextBar } from '../components/loader/TripContextBar';

export function UpdatedStopSequence() {
  const {
    tripId:
    routeTripId,
  } = useParams<{
    tripId: string;
  }>();

  const {
    tripDataById,
    reviewedPlanVehicleIds,
    acknowledgePlanUpdate,
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
      <PlanUnavailable />
    );
  }

  const {
    queueItem,
    stops,
  } = trip;

  const reviewed =
    reviewedPlanVehicleIds.includes(
      tripId,
    );

  const loadPath =
    `/trips/${encodeURIComponent(
      tripId,
    )}`;

  const orderedStops =
    [...stops].sort(
      (a, b) =>
        a.number -
        b.number,
    );

  return (
    <PageContainer>
      <PageHeader
        backTo={{
          to: '/',
          label:
            'Loading Queue',
        }}
        title="Plan Update"
        subtitle="Review the latest Dispatcher change before continuing affected loading work."
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

      {!reviewed ? (
        <section
          role="status"
          className="mt-5 overflow-hidden rounded-card border border-amber/45 bg-amber-pale shadow-card"
        >
          <div className="p-5 md:p-6">
            <div className="flex gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber text-amber-ink">
                <TriangleAlertIcon
                  aria-hidden="true"
                  className="h-5 w-5"
                />
              </span>

              <div>
                <p className="text-base font-semibold text-amber-ink">
                  Dispatcher
                  published an
                  updated plan
                </p>

                <p className="mt-1 max-w-2xl text-sm leading-6 text-amber-ink">
                  {queueItem.updateMessage ??
                    'The trip plan has changed. Review the latest stop sequence before continuing affected loading work.'}
                </p>

                {queueItem.planVersion !==
                  undefined && (
                    <p className="mt-2 text-xs font-semibold text-amber-ink">
                      Current plan
                      version:{' '}
                      {
                        queueItem.planVersion
                      }
                    </p>
                  )}
              </div>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Link
                to="/"
                className={buttonStyles(
                  'secondary',
                  'md',
                )}
              >
                Back to Queue
              </Link>

              <Button
                size="md"
                onClick={() =>
                  acknowledgePlanUpdate(
                    tripId,
                  )
                }
              >
                <RefreshCwIcon
                  aria-hidden="true"
                  className="h-4 w-4"
                />

                Review &amp;
                Acknowledge
              </Button>
            </div>
          </div>
        </section>
      ) : (
        <div
          role="status"
          className="mt-5 flex flex-col gap-3 rounded-card border border-brand/20 bg-brand-pale p-5 shadow-card sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="font-semibold text-forest">
              Latest plan
              acknowledged
            </p>

            <p className="mt-1 text-sm text-forest/75">
              You can continue
              loading using the
              current published
              sequence.
            </p>
          </div>

          <Link
            to={loadPath}
            className={buttonStyles(
              'primary',
              'md',
            )}
          >
            Continue Loading
          </Link>
        </div>
      )}

      <section className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_310px] lg:items-start">
        <Card className="p-5 md:p-7">
          <div className="border-b border-line pb-5">
            <h2 className="text-xl font-semibold tracking-tight text-ink">
              Current delivery
              sequence
            </h2>

            <p className="mt-1 text-sm leading-6 text-subtle">
              This is the
              latest stop order
              published for this
              trip.
            </p>
          </div>

          {orderedStops.length >
            0 ? (
            <ol className="mt-6">
              {orderedStops.map(
                (
                  stop,
                  index,
                ) => (
                  <li
                    key={
                      stop.id ??
                      `${stop.number}-${stop.outletId}`
                    }
                    className="relative flex gap-4 pb-6 last:pb-0"
                  >
                    <span
                      aria-hidden="true"
                      className="relative z-10 grid h-11 w-11 shrink-0 place-items-center rounded-full bg-forest text-base font-semibold text-white shadow-card"
                    >
                      {
                        stop.number
                      }
                    </span>

                    {index <
                      orderedStops.length -
                      1 && (
                        <span
                          aria-hidden="true"
                          className="absolute left-[21px] top-11 h-[calc(100%-20px)] w-0.5 bg-brand-mint/75"
                        />
                      )}

                    <div className="min-w-0 flex-1 pb-6 last:pb-0">
                      <p className="text-xs font-semibold tracking-wide text-subtle">
                        DELIVERY STOP{' '}
                        {
                          stop.number
                        }
                      </p>

                      <h3 className="mt-1 text-xl font-semibold tracking-tight text-ink">
                        {
                          stop.outletId
                        }
                      </h3>

                      <p className="mt-1 text-sm text-subtle">
                        {
                          stop.outletName
                        }

                        {stop.location && (
                          <>
                            {' · '}
                            {
                              stop.location
                            }
                          </>
                        )}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {stop.orderIds
                          .length >
                          0 && (
                            <span className="rounded-full bg-canvas px-3 py-1.5 text-xs font-semibold text-ink">
                              {stop.orderIds.join(
                                ' · ',
                              )}
                            </span>
                          )}

                        {stop.conditions && (
                          <span className="rounded-full bg-canvas px-3 py-1.5 text-xs font-semibold text-subtle">
                            {
                              stop.conditions
                            }
                          </span>
                        )}

                        {stop.eta && (
                          <span className="rounded-full bg-brand-pale px-3 py-1.5 text-xs font-semibold text-forest">
                            ETA{' '}
                            {
                              stop.eta
                            }
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                ),
              )}
            </ol>
          ) : (
            <div className="py-10 text-center">
              <p className="font-semibold text-ink">
                No stop
                sequence
                available
              </p>

              <p className="mt-2 text-sm text-subtle">
                The latest
                published stop
                sequence will be
                supplied by the
                Loader API.
              </p>
            </div>
          )}
        </Card>

        <aside className="rounded-card bg-forest p-6 text-white shadow-pop">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-white/15 ring-1 ring-white/20">
            <CheckIcon
              aria-hidden="true"
              className="h-5 w-5"
              strokeWidth={3}
            />
          </span>

          <h2 className="mt-5 text-xl font-semibold tracking-tight">
            Latest plan
          </h2>

          <p className="mt-2 text-sm leading-6 text-white/75">
            Always work from
            the latest
            Dispatcher-published
            plan. A changed plan
            must be acknowledged
            before affected
            loading continues.
          </p>

          {queueItem.planVersion !==
            undefined && (
              <p className="mt-4 inline-flex rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ring-white/15">
                Plan v
                {
                  queueItem.planVersion
                }
              </p>
            )}

          {reviewed && (
            <Link
              to={loadPath}
              className={`${buttonStyles(
                'secondary',
                'md',
                true,
              )} mt-6 !border-white/25 !bg-white/10 !text-white hover:!bg-white/20`}
            >
              Open Trip Load
            </Link>
          )}
        </aside>
      </section>
    </PageContainer>
  );
}

function PlanUnavailable() {
  return (
    <PageContainer>
      <Card className="mx-auto max-w-lg p-8 text-center">
        <TriangleAlertIcon
          aria-hidden="true"
          className="mx-auto h-7 w-7 text-amber-ink"
        />

        <h1 className="mt-4 text-xl font-semibold text-ink">
          Updated plan
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