import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type {
  DispatcherOrderView,
  TripView,
  VehicleView,
  LoadingView,
  DriverIssueView,
} from "@waypoint/contracts";
import { useQuery } from "../../../api/useQuery";
import {
  Badge,
  Button,
  DataTable,
  ErrorPanel,
  Panel,
  ReadState,
  numberText,
} from "../../../components/shared/ui";
import { useDispatcher } from "./context";
import { localTime } from "./api";
import { Conflicts } from "./TripDetail";
import { DeferralDialog, OrderDetails } from "./OrderDetails";
export function useFleet() {
  const { api, date, depotId, depots } = useDispatcher();
  return useQuery(
    `fleet:${date}:${depotId}:${depots.map((d) => d.id).join(",")}`,
    async (s) =>
      (
        await Promise.all(
          (depotId ? [depotId] : depots.map((d) => d.id)).map((id) =>
            api.all<VehicleView>("/vehicles", { date, depotId: id }, s),
          ),
        )
      ).flat(),
  );
}
export function useTrips(poll = 0) {
  const { api, date, depotId } = useDispatcher();
  return useQuery(
    `trips:${date}:${depotId}`,
    (s) => api.all<TripView>("/trips", { date, depotId }, s),
    poll,
  );
}
export function OrdersPage({ deferred = false, history = false }: { deferred?: boolean; history?: boolean }) {
  const [params] = useSearchParams();
  const { api, date, depotId } = useDispatcher();
  const [allDates, setAllDates] = useState(deferred || history || params.get("allDates") === "1"),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [brand, setBrand] = useState(""),
    [selected, setSelected] = useState<string | null>(null),
    [defer, setDefer] = useState<DispatcherOrderView | null>(null);
  const result = useQuery(
    `orders:${date}:${depotId}:${allDates}:${status}`,
    (s) =>
      api.all<DispatcherOrderView>(
        "/dispatcher/orders",
        { date: allDates ? undefined : date, depotId, status },
        s,
      ),
  );
  const rows = (result.data ?? []).filter(
    (o) =>
      (!history || ["RECEIVED", "DELIVERED"].includes(o.status)) &&
      (!deferred || o.status === "DEFERRED" || o.deferralCount > 0) &&
      (!brand || o.brand === brand) &&
      `${o.id} ${o.outletName} ${o.outletId}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <div className="dispatch-page-title">
        <div>
          <h1>{history ? "Order History" : deferred ? "Deferrals" : "Orders Queue"}</h1>
          <p>
            {deferred
              ? "Review reasons, previous decisions and the next eligible run."
              : "Search real orders and inspect their quantities before planning."}
          </p>
        </div>
        <Button variant="secondary" onClick={result.refresh}>
          Refresh orders
        </Button>
      </div>
      <Panel title={deferred ? "Deferrals and retry orders" : "Orders"}>
        <div className="dispatch-filters">
          <label>
            Search orders
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Order ID or outlet"
            />
          </label>
          <label>
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              {[
                "CONFIRMED",
                "PLANNED",
                "LOADING",
                "READY",
                "IN_TRANSIT",
                "DELIVERED",
                "RECEIVED",
                "DEFERRED",
              ].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            Brand
            <select value={brand} onChange={(e) => setBrand(e.target.value)}>
              <option value="">All brands</option>
              {["FRESH", "STYLE", "TECH"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label className="dispatch-check">
            <input
              type="checkbox"
              checked={allDates}
              onChange={(e) => setAllDates(e.target.checked)}
            />
            All run dates
          </label>
        </div>
        <ReadState
          loading={result.loading}
          error={result.error}
          empty={!rows.length}
          retry={result.refresh}
        >
          <DataTable
            caption={deferred ? "Deferred orders" : "Orders queue"}
            rows={rows}
            rowKey={(o) => o.id}
            columns={[
              {
                key: "outlet",
                label: "Order / outlet",
                render: (o) => (
                  <>
                    <button
                      className="dispatch-link"
                      onClick={() => setSelected(o.id)}
                    >
                      {o.outletName}
                    </button>
                    <small className="dispatch-reference">{o.id}</small>
                    <small>
                      {o.brand} · {o.temp}
                    </small>
                  </>
                ),
              },
              {
                key: "date",
                label: "Delivery date",
                render: (o) =>
                  o.plannedDate ?? o.deferredToDate ?? o.requestedDate,
              },
              {
                key: "load",
                label: "Authorized next load",
                render: (o) =>
                  o.planningLoad ? (
                    <>
                      {numberText(o.planningLoad.weightKg)} kg
                      <br />
                      {numberText(o.planningLoad.volumeM3)} m³
                    </>
                  ) : (
                    "—"
                  ),
              },
              {
                key: "status",
                label: "Status",
                render: (o) => <Badge status={o.status} />,
              },
              {
                key: "reason",
                label: "Deferrals",
                render: (o) => (
                  <>
                    {o.deferralCount}
                    <small>{o.deferReason}</small>
                  </>
                ),
              },
              {
                key: "action",
                label: "Actions",
                render: (o) => (
                  <div className="dispatch-inline">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelected(o.id)}
                    >
                      Details
                    </Button>
                    {!o.activeTripId &&
                      ["CONFIRMED", "DEFERRED"].includes(o.status) && (
                        <>
                          <Link
                            className="dispatch-link"
                            to={`/planning?orderId=${encodeURIComponent(o.id)}`}
                          >
                            Plan
                          </Link>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setDefer(o)}
                          >
                            Defer
                          </Button>
                        </>
                      )}
                    {o.activeTripId && (
                      <Link
                        className="dispatch-link"
                        to={`/trips/${o.activeTripId}`}
                      >
                        Trip →
                      </Link>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </ReadState>
      </Panel>
      {selected && (
        <OrderDetails
          id={selected}
          onClose={() => setSelected(null)}
          onChanged={result.refresh}
        />
      )}{" "}
      {defer && (
        <DeferralDialog
          order={defer}
          onClose={() => setDefer(null)}
          onSaved={result.refresh}
        />
      )}
    </>
  );
}
export function VehiclesPage() {
  const fleet = useFleet();
  const [search, setSearch] = useState(""),
    [temp, setTemp] = useState(""),
    [availability, setAvailability] = useState("");
  const rows = (fleet.data ?? []).filter(
    (v) =>
      v.id.toLowerCase().includes(search.toLowerCase()) &&
      (!temp || v.temp === temp) &&
      (!availability || (availability === "available") === v.availableOnDate),
  );
  return (
    <>
      <div className="dispatch-page-title">
        <div>
          <h1>Vehicle List</h1>
          <p>Independent capacity, assigned Driver and weekly fuel balance.</p>
        </div>
        <Button variant="secondary" onClick={fleet.refresh}>
          Refresh vehicles
        </Button>
      </div>
      <Panel title="Fleet">
        <div className="dispatch-filters">
          <label>
            Search vehicles
            <input value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          <label>
            Temperature
            <select value={temp} onChange={(e) => setTemp(e.target.value)}>
              <option value="">All vehicles</option>
              <option>AMBIENT</option>
              <option>REEFER</option>
            </select>
          </label>
          <label>
            Availability
            <select
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
            >
              <option value="">Any availability</option>
              <option value="available">Available on date</option>
              <option value="unavailable">Unavailable on date</option>
            </select>
          </label>
        </div>
        <ReadState
          loading={fleet.loading}
          error={fleet.error}
          empty={!rows.length}
          retry={fleet.refresh}
        >
          <DataTable
            caption="Vehicle availability and fuel"
            rows={rows}
            rowKey={(v) => v.id}
            columns={[
              {
                key: "vehicle",
                label: "Vehicle",
                render: (v) => (
                  <>
                    <b>{v.id}</b>
                    <small>
                      {v.type} · {v.temp} · {v.depotId}
                    </small>
                  </>
                ),
              },
              {
                key: "capacity",
                label: "Capacity",
                render: (v) => (
                  <>
                    {numberText(v.weightCapKg)} kg
                    <br />
                    {numberText(v.volumeCapM3)} m³
                  </>
                ),
              },
              {
                key: "driver",
                label: "Driver",
                render: (v) => v.driverId ?? "Not configured",
              },
              {
                key: "available",
                label: "Availability",
                render: (v) => (
                  <Badge
                    status={v.availableOnDate ? "AVAILABLE" : "UNAVAILABLE"}
                  />
                ),
              },
              {
                key: "trips",
                label: "Trip slots",
                render: (v) => `${v.allocatedTripCountOnDate} / 2 allocated`,
              },
              {
                key: "fuel",
                label: "Fuel this week",
                render: (v) => (
                  <>
                    {numberText(v.remainingFuelL)} L remaining
                    <small>
                      {numberText(v.reservedFuelL)} L reserved ·{" "}
                      {numberText(v.committedFuelL)} L committed
                    </small>
                    <small>Week from {v.fuelWeekStart}</small>
                  </>
                ),
              },
              {
                key: "action",
                label: "Plan",
                render: (v) => (
                  <Link
                    className="dispatch-link"
                    to={`/planning?vehicleId=${encodeURIComponent(v.id)}&depotId=${encodeURIComponent(v.depotId)}`}
                  >
                    Use vehicle →
                  </Link>
                ),
              },
            ]}
          />
        </ReadState>
      </Panel>
    </>
  );
}
export function TripTable({ trips }: { trips: TripView[] }) {
  return (
    <DataTable
      caption="Trips"
      rows={trips}
      rowKey={(t) => t.id}
      columns={[
        {
          key: "vehicle",
          label: "Trip / vehicle",
          render: (t) => (
            <Link className="dispatch-link" to={`/trips/${t.id}`}>
              {t.vehicleId} · trip {t.tripNo}
              <small className="dispatch-reference">{t.id}</small>
            </Link>
          ),
        },
        {
          key: "status",
          label: "Status",
          render: (t) => (
            <>
              <Badge status={t.status} />
              {!t.publishedAt && <small>Not published</small>}
            </>
          ),
        },
        {
          key: "stops",
          label: "Progress",
          render: (t) =>
            `${t.stops.filter((s) => ["DELIVERED", "PARTIAL", "FAILED", "RESCHEDULED"].includes(s.status)).length} / ${t.stops.length} stops`,
        },
        {
          key: "time",
          label: "Departure / return",
          render: (t) =>
            `${localTime(t.plannedDepartureAt)} / ${localTime(t.plannedReturnAt)}`,
        },
        {
          key: "load",
          label: "Load",
          render: (t) =>
            `${numberText(t.totalWeightKg)} kg · ${numberText(t.totalVolumeM3)} m³`,
        },
      ]}
    />
  );
}
export function TripsPage() {
  const trips = useTrips();
  return (
    <>
      <div className="dispatch-page-title">
        <div>
          <h1>Trips</h1>
          <p>Open a trip to publish, review loading or follow each stop.</p>
        </div>
        <Button variant="secondary" onClick={trips.refresh}>
          Refresh trips
        </Button>
      </div>
      <Panel title="Run trips">
        <ReadState
          loading={trips.loading}
          error={trips.error}
          empty={!trips.data?.length}
          retry={trips.refresh}
        >
          <TripTable trips={trips.data ?? []} />
        </ReadState>
      </Panel>
    </>
  );
}
export function OperationsPage({ mode = "all" }: {mode?: "all" | "loading" | "monitoring"}) {
  const trips = useTrips(15000);
  const [status, setStatus] = useState("");
  const rows = (trips.data ?? []).filter((t) => (!status || t.status === status) && (mode === 'all' || (mode === 'loading' ? ['CONFIRMED','LOADING','READY'].includes(t.status) : ['IN_TRANSIT','COMPLETED','COMPLETED_WITH_EXCEPTIONS'].includes(t.status))));
  return (
    <>
      <div className="dispatch-page-title">
        <div>
          <h1>{mode === "loading" ? "Loading" : mode === "monitoring" ? "Delivery Monitoring" : "Operations Status"}</h1>
          <p>
            Updates every 15 seconds while this page is visible.{" "}
            {trips.updatedAt &&
              `Last checked ${localTime(trips.updatedAt.toISOString())}.`}
          </p>
        </div>
        <Button variant="secondary" onClick={trips.refresh}>
          Refresh operations
        </Button>
      </div>
      <Panel title="Trip progress">
        <label className="dispatch-short-field">
          Trip status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {[
              "CONFIRMED",
              "LOADING",
              "READY",
              "IN_TRANSIT",
              "COMPLETED",
              "COMPLETED_WITH_EXCEPTIONS",
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <ReadState
          loading={trips.loading}
          error={trips.error}
          empty={!rows.length}
          retry={trips.refresh}
        >
          <TripTable trips={rows} />
        </ReadState>
      </Panel>
      {rows
        .filter((t) => t.publishedAt)
        .map((t) => (
          <TripAlerts key={`${t.id}:${t.version}`} trip={t} />
        ))}
      <Conflicts onChanged={trips.refresh} />
    </>
  );
}
function TripAlerts({ trip }: { trip: TripView }) {
  const { api } = useDispatcher();
  const loading = useQuery(
    `ops-loading:${trip.id}:${trip.version}`,
    (s) => api.get<LoadingView>(`/trips/${trip.id}/loading`, s),
    15000,
  );
  const incidents = useQuery(
    `ops-incidents:${trip.id}:${trip.version}`,
    (s) => api.all<DriverIssueView>(`/trips/${trip.id}/issues`, {}, s),
    15000,
  );
  const issues =
    loading.data?.issues.filter((i) => i.status !== "RESOLVED") ?? [];
  const exceptions = trip.stops.filter((s) =>
    ["PARTIAL", "FAILED", "RESCHEDULED"].includes(s.status),
  );
  if (
    trip.status !== "COMPLETED_WITH_EXCEPTIONS" &&
    !issues.length &&
    !exceptions.length &&
    !incidents.data?.length &&
    !loading.error &&
    !incidents.error
  )
    return null;
  return (
    <Panel
      title={`${trip.vehicleId} · trip ${trip.tripNo} exceptions`}
      action={
        <Link className="dispatch-link" to={`/trips/${trip.id}`}>
          Review trip →
        </Link>
      }
    >
      <ErrorPanel
        error={loading.error || incidents.error}
        retry={() => {
          loading.refresh();
          incidents.refresh();
        }}
      />
      {trip.status === "COMPLETED_WITH_EXCEPTIONS" && (
        <p>
          Delivery exceptions recorded. Open the trip to review evidence,
          receipts and recovery decisions.
        </p>
      )}
      {issues.map((i) => (
        <p key={i.id}>
          <Badge status={i.status} /> {i.type}: {i.availableQty} of{" "}
          {i.expectedQty} available. Dispatcher decision / Loader acknowledgment
          required.
        </p>
      ))}
      {exceptions.map((s) => (
        <p key={s.id}>
          <Badge status={s.status} /> {s.outletId} · order {s.orderId}
        </p>
      ))}
      {incidents.data?.map((i) => (
        <p key={i.id}>
          <Badge status={i.type} /> {i.note} · {localTime(i.capturedAt)}
        </p>
      ))}
    </Panel>
  );
}
