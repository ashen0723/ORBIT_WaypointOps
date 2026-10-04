import React from 'react';

import {
  Link,
  useParams,
} from 'react-router-dom';

import {
  CheckIcon,
  ListOrderedIcon,
} from 'lucide-react';

import { useLoader } from '../contexts/LoaderContext';

import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';

import { buttonStyles } from '../components/ui/Button';

import { TripContextBar } from '../components/loader/TripContextBar';

export function StopSequence() {
  const {
    tripId:
    routeTripId,
  } = useParams<{
    tripId: string;
  }>();

  const {
    tripDataById,
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
      <PageContainer>
        <Card className="mx-auto max-w-lg p-8 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-pale text-forest">
            <ListOrderedIcon
              aria-hidden="true"
              className="h-6 w-6"
            />
          </span>

          <h1 className="mt-4 text-xl font-semibold text-ink">
            Stop sequence
            unavailable
          </h1>

          <p className="mt-2 text-sm leading-6 text-subtle">
            Select a
            published trip
            from the Loading
            Queue to view its
            delivery sequence.
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

  const {
    queueItem,
    stops,
  } = trip;

  const orderedStops =
    [...stops].sort(
      (a, b) =>
        a.number -
        b.number,
    );

  const loadPath =
    `/trips/${encodeURIComponent(
      tripId,
    )}`;

  return (
    <PageContainer>
      <PageHeader
        backTo={{
          to: loadPath,
          label:
            'Trip Loading',
        }}
        title="Delivery Stop Sequence"
        subtitle="Review the Dispatcher-planned delivery order before staging goods in the vehicle."
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

      <section className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_310px] lg:items-start">
        <Card className="overflow-hidden p-5 md:p-7">
          <div className="flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-ink">
                Planned
                delivery order
              </h2>

              <p className="mt-1 max-w-xl text-sm leading-6 text-subtle">
                Stop 1 is the
                first outlet to
                receive goods.
                This screen does
                not assume that
                Stop 1 must be
                physically loaded
                into the vehicle
                first.
              </p>
            </div>

            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-brand-pale px-3 py-1.5 text-xs font-semibold text-forest">
              <ListOrderedIcon
                aria-hidden="true"
                className="h-3.5 w-3.5"
              />

              {
                orderedStops.length
              }{' '}

              {orderedStops.length ===
                1
                ? 'stop'
                : 'stops'}
            </span>
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

                    <div className="min-w-0 flex-1 px-1 pb-6 last:pb-0">
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
                No stops
                available
              </p>

              <p className="mt-2 text-sm text-subtle">
                The published
                stop sequence
                will be loaded
                from the
                backend.
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
            Current delivery
            plan
          </h2>

          <p className="mt-2 text-sm leading-6 text-white/75">
            Follow the latest
            published stop
            sequence when
            staging the load.
            Physical placement
            inside the vehicle
            should support safe
            unloading at these
            stops.
          </p>

          {queueItem.planVersion !==
            undefined && (
              <p className="mt-4 inline-flex rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-inset ring-white/15">
                Plan v
                {
                  queueItem.planVersion
                }
              </p>
            )}

          <Link
            to={
              loadPath
            }
            className={`${buttonStyles(
              'secondary',
              'md',
              true,
            )} mt-6 !border-white/25 !bg-white/10 !text-white hover:!bg-white/20`}
          >
            Back to loading
          </Link>
        </aside>
      </section>
    </PageContainer>
  );
}