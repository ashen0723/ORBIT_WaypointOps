import React from 'react';

import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom';

import {
  ClipboardCheckIcon,
  RefreshCwIcon,
  TruckIcon,
} from 'lucide-react';

import { Toaster } from 'sonner';

import { AppShell } from './components/layout/AppShell';

import { LoadingQueue } from './pages/LoadingQueue';
import { VehicleLoadDetail } from './pages/VehicleLoadDetail';

import { StopSequence } from './pages/StopSequence';
import { UpdatedStopSequence } from './pages/UpdatedStopSequence';

import { LoaderIssues } from './pages/LoaderIssues';

import { CompletedLoad } from './pages/CompletedLoad';
import { QueueCompletedLoad } from './pages/QueueCompletedLoad';

import { Settings } from './pages/Settings';

import { LoaderProvider } from './contexts/LoaderContext';
import { useLoader } from './contexts/LoaderContext';

import { PageContainer } from './components/ui/PageContainer';
import { PageHeader } from './components/ui/PageHeader';
import { Card } from './components/ui/Card';
import { buttonStyles } from './components/ui/Button';

interface AppProps {
  basename?: string;
}

export function App({
  basename,
}: AppProps) {
  return (
    <LoaderProvider>
      <BrowserRouter basename={basename}>
        <Routes>
          <Route element={<AppShell />}>
            <Route
              index
              element={<LoadingQueue />}
            />

            <Route
              path="issues"
              element={<LoaderIssues />}
            />

            <Route
              path="settings"
              element={<Settings />}
            />

            <Route
              path="completed"
              element={<CompletedLoadsIndex />}
            />

            <Route
              path="completed/:tripId"
              element={<QueueCompletedLoad />}
            />

            <Route
              path="trips/:tripId"
              element={<VehicleLoadDetail />}
            />

            <Route
              path="trips/:tripId/stops"
              element={<StopSequence />}
            />

            <Route
              path="trips/:tripId/stops/updated"
              element={<UpdatedStopSequence />}
            />

            <Route
              path="trips/:tripId/complete"
              element={<CompletedLoad />}
            />

            <Route
              path="*"
              element={
                <Navigate
                  to="/"
                  replace
                />
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>

      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            fontFamily:
              'Inter, sans-serif',
          },
        }}
      />
    </LoaderProvider>
  );
}

function CompletedLoadsIndex() {
  const {
    queueLoads,
    queueLoading,
    queueError,
    refreshQueue,
    handedOffVehicleIds,
  } = useLoader();

  const completedLoads =
    queueLoads.filter(
      (load) => {
        if (!load.tripId) {
          return false;
        }

        return (
          load.status ===
          'ready_to_depart' ||
          load.status ===
          'completed' ||
          load.status ===
          'loading_completed' ||
          handedOffVehicleIds.includes(
            load.tripId,
          )
        );
      },
    );

  return (
    <PageContainer>
      <PageHeader
        title="Completed Loads"
        subtitle="Review loading records that have completed the Loader handoff."
      />

      {completedLoads.length >
        0 ? (
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {completedLoads.map(
            (load) => (
              <Card
                key={
                  load.tripId
                }
                className="flex flex-col p-5 md:p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[28px] font-semibold leading-none tabular-nums tracking-tight text-ink">
                      {
                        load.vehicleId
                      }
                    </p>

                    <p className="mt-2 font-semibold text-ink">
                      {load.trip}
                    </p>

                    <p className="mt-1 text-sm text-subtle">
                      {
                        load.brand
                      }
                      {' · '}
                      {
                        load.district
                      }
                    </p>
                  </div>

                  <span className="rounded-full bg-brand-pale px-3 py-1.5 text-xs font-semibold text-forest ring-1 ring-inset ring-brand/20">
                    Loading
                    completed
                  </span>
                </div>

                <dl className="mt-5 grid grid-cols-3 gap-3 border-y border-line py-4">
                  <CompletedMeta
                    label="Planned departure"
                    value={
                      load.departure
                    }
                  />

                  <CompletedMeta
                    label="Stops"
                    value={String(
                      load.stops,
                    )}
                  />

                  <CompletedMeta
                    label="Orders"
                    value={String(
                      load.orderCount,
                    )}
                  />
                </dl>

                <Link
                  to={`/completed/${encodeURIComponent(
                    load.tripId ??
                    load.vehicleId,
                  )}`}
                  className={`${buttonStyles(
                    'secondary',
                    'md',
                  )} mt-5`}
                >
                  View Load
                </Link>
              </Card>
            ),
          )}
        </div>
      ) : (
        <Card className="mt-6 p-8 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-pale text-forest">
            <ClipboardCheckIcon
              aria-hidden="true"
              className="h-6 w-6"
            />
          </span>

          <h2 className="mt-4 text-lg font-semibold text-ink">
            {queueLoading
              ? 'Loading completed loads…'
              : queueError
                ? 'Could not load completed loads'
                : 'No completed loads'}
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-subtle">
            {queueLoading
              ? 'Retrieving persisted loading records from the Loader backend.'
              : queueError ?? 'Completed loading trips for this Loader’s depot will appear here.'}
          </p>

          {queueError && (
            <button
              type="button"
              onClick={() => {
                void refreshQueue();
              }}
              className={`${buttonStyles('secondary', 'md')} mt-5`}
            >
              <RefreshCwIcon
                aria-hidden="true"
                className="h-4 w-4"
              />
              Try again
            </button>
          )}

          <Link
            to="/"
            className={`${buttonStyles(
              'secondary',
              'md',
            )} mt-5 ${queueError ? 'ml-3' : ''}`}
          >
            <TruckIcon
              aria-hidden="true"
              className="h-4 w-4"
            />

            Loading Queue
          </Link>
        </Card>
      )}
    </PageContainer>
  );
}

function CompletedMeta({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-subtle">
        {label}
      </dt>

      <dd className="mt-1 text-sm font-semibold tabular-nums text-ink">
        {value}
      </dd>
    </div>
  );
}
