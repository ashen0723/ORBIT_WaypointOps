import { useCallback, useEffect, useRef, useState } from "react";
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useParams,
} from "react-router-dom";
import type { LoadingView, OrderView } from "@waypoint/contracts";
import { useAuth } from "../../../app/providers/AuthProvider";
import { ApiError, apiFetch } from "../../../api/client";
import { ActionForm, Field, Loading } from "../../operations/OperationsApp";
import { EvidenceGallery } from "../../../components/shared/EvidenceGallery";
import { loadQueue, queueState, type LoaderCall } from "./api";
import "../../operations/operations.css";
import "./loader.css";
import {
  Truck,
  Clock3,
  TriangleAlert,
  CheckCircle2,
  ClipboardCheck,
} from "lucide-react";
import { LoaderShell } from "./LoaderShell";
import { Settings } from "../pages/Settings";
const today = () =>
  new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
export function LoaderApp({ basename }: { basename?: string }) {
  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route index element={<LoaderScreen view="queue" />} />
        <Route path="issues" element={<LoaderScreen view="issues" />} />
        <Route path="completed" element={<LoaderScreen view="completed" />} />
        <Route path="trips/:tripId/*" element={<LoaderScreen view="trip" />} />
        <Route
          path="completed/:tripId"
          element={<LoaderScreen view="trip" />}
        />
        <Route path="settings" element={<LoaderScreen view="settings" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
function LoaderScreen({
  view,
}: {
  view: "queue" | "issues" | "completed" | "trip" | "settings";
}) {
  const { user, token, expire } = useAuth();
  const { tripId } = useParams();
  const [date, setDate] = useState(
    () => sessionStorage.getItem(`waypoint.run-date:${user?.id}`) || today(),
  );
  const [loads, setLoads] = useState<LoadingView[]>([]);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const epoch = useRef(0);
  const call: LoaderCall = useCallback(
    async <T,>(path: string, body?: unknown, method?: string) => {
      try {
        return await apiFetch<T>(path, {
          token,
          method: method ?? (body === undefined ? "GET" : "POST"),
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) expire(token);
        throw e;
      }
    },
    [token, expire],
  );
  const refresh = useCallback(async () => {
    const current = ++epoch.current;
    setBusy(true);
    setError("");
    try {
      const data = tripId
        ? [
            await call<LoadingView>(
              `/trips/${encodeURIComponent(tripId)}/loading`,
            ),
          ]
        : await loadQueue(call, date);
      if (current === epoch.current) setLoads(data);
    } catch (e) {
      if (current === epoch.current)
        setError(e instanceof Error ? e.message : "Could not load trips.");
    } finally {
      if (current === epoch.current) setBusy(false);
    }
  }, [call, date, tripId]);
  useEffect(() => {
    void refresh();
    return () => {
      epoch.current++;
    };
  }, [refresh]);
  useEffect(() => {
    sessionStorage.setItem(`waypoint.run-date:${user?.id}`, date);
  }, [date, user?.id]);
  const act: LoaderCall = useCallback(
    async <T,>(path: string, body?: unknown, method?: string) => {
      const result = await call<T>(path, body, method);
      await refresh();
      return result;
    },
    [call, refresh],
  );
  const visible = loads.filter(
    (l) =>
      (view !== "issues" || l.issues.length > 0) &&
      (view !== "queue" || filter === "all" || displayState(l) === filter) &&
      (view !== "completed" || queueState(l) === "completed") &&
      `${l.trip.id} ${l.trip.vehicleId} ${l.trip.status} ${l.trip.stops.map((s) => s.outletId).join(" ")}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const titles = {
    queue: "Loading Queue",
    issues: "Loading Issues",
    completed: "Completed Loads",
    trip: "Trip Loading",
    settings: "Settings",
  };
  const descriptions = {
    queue: `${user?.depotId ?? "No depot assigned"} · Published loading work for your depot`,
    issues:
      "Missing, damaged, replaced, and Dispatcher-resolved loading exceptions.",
    completed: "Review loading records that have completed the Loader handoff.",
    trip: "Review the stop sequence, check quantities, and prepare the vehicle for departure.",
    settings: "",
  };
  const metrics = [
    { state: "ready", label: "Ready", Icon: Truck },
    { state: "loading", label: "Loading", Icon: Clock3 },
    { state: "attention", label: "Needs attention", Icon: TriangleAlert },
    { state: "completed", label: "Completed", Icon: CheckCircle2 },
  ];
  return (
    <LoaderShell
      issueCount={
        loads.flatMap((l) => l.issues).filter((i) => i.status !== "RESOLVED")
          .length
      }
    >
      {view === "settings" ? (
        <Settings />
      ) : (
        <div className="loader-page">
          <div className="loader-heading">
            <div>
              <h1>{titles[view]}</h1>
              <p>{descriptions[view]}</p>
            </div>
            <span className="loader-workspace-badge">
              ● &nbsp; Loader workspace
            </span>
          </div>
          {view === "queue" && (
            <section className="loader-metrics" aria-label="Queue overview">
              {metrics.map(({ state, label, Icon }) => (
                <button
                  key={state}
                  className={`loader-metric ${state}`}
                  onClick={() => setFilter(state)}
                  aria-label={`Filter ${label}`}
                >
                  <span>
                    <Icon size={18} />
                  </span>
                  <strong>
                    {loads.filter((l) => displayState(l) === state).length}
                  </strong>
                  <small>{label}</small>
                </button>
              ))}
            </section>
          )}
          <div className="loader-toolbar">
            {view === "queue" && (
              <div
                className="loader-tabs"
                role="group"
                aria-label="Filter loading queue"
              >
                {["all", "ready", "loading", "attention", "completed"].map(
                  (state) => (
                    <button
                      key={state}
                      aria-pressed={filter === state}
                      onClick={() => setFilter(state)}
                    >
                      {state[0].toUpperCase() + state.slice(1)}
                    </button>
                  ),
                )}
              </div>
            )}
            <label className="loader-search">
              <span className="sr-only">Search trips</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search vehicle, trip, outlet, or status"
              />
            </label>
          </div>
          <div className="loader-run-controls">
            <label>
              Run date{" "}
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={view === "trip"}
              />
            </label>
            <button disabled={busy} onClick={() => void refresh()}>
              Refresh
            </button>
          </div>
          {busy && (
            <p role="status" className="loader-message">
              Refreshing loading work…
            </p>
          )}
          {error && (
            <p role="alert" className="loader-message loader-error">
              {error} Refresh before making changes.
            </p>
          )}
          {!busy && !error && !visible.length && (
            <div className="loader-empty">
              <span>
                {view === "completed" ? (
                  <ClipboardCheck />
                ) : view === "issues" ? (
                  <CheckCircle2 />
                ) : (
                  <Truck />
                )}
              </span>
              <h2>
                {search || (filter !== "all" && view === "queue")
                  ? "No matching loads"
                  : view === "completed"
                    ? "No completed loads"
                    : view === "issues"
                      ? "No loading issues"
                      : "No published loading trips"}
              </h2>
              <p>
                {view === "completed"
                  ? "Completed loading trips for your depot will appear here."
                  : view === "issues"
                    ? "Missing, damaged, and replacement records will appear here when they are recorded during loading."
                    : "Trips published by the Dispatcher for your depot will appear here. Check the run date or refresh for the latest work."}
              </p>
              {view !== "queue" && <Link to="/">Back to Loading Queue</Link>}
            </div>
          )}
          <div className="operations loader-live">
            <fieldset className="loader-work" disabled={busy || !!error}>
              {visible.map((load) => (
                <LoadCard
                  key={`${load.trip.id}:${load.trip.version}:${load.trip.loaderAcknowledgedPlanVersion}:${load.issues.map((i) => `${i.id}-${i.version}-${i.status}`).join(",")}`}
                  load={load}
                  call={call}
                  act={act}
                  token={token}
                  expire={expire}
                />
              ))}
            </fieldset>
          </div>
        </div>
      )}
    </LoaderShell>
  );
}
function displayState(load: LoadingView) {
  if (queueState(load) === "completed") return "completed";
  if (queueState(load) === "issues") return "attention";
  return load.trip.status === "LOADING" ? "loading" : "ready";
}

function LoadCard({
  load,
  call,
  act,
  token,
  expire,
}: {
  load: LoadingView;
  call: LoaderCall;
  act: LoaderCall;
  token: string | null;
  expire: (token?: string | null) => void;
}) {
  const { trip } = load;
  const [orders, setOrders] = useState<OrderView[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void Promise.all(
      trip.stops.map((s) =>
        call<OrderView>(`/orders/${encodeURIComponent(s.orderId)}`),
      ),
    )
      .then((v) => {
        if (active) setOrders(v);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [call, trip.id, trip.version]);
  const terminal = [
    "READY",
    "IN_TRANSIT",
    "COMPLETED",
    "COMPLETED_WITH_EXCEPTIONS",
  ].includes(trip.status);
  return (
    <section className="ops-card">
      <h2>
        Trip {trip.tripNo} · {trip.status}
      </h2>
      <p>
        {trip.vehicleId} · {trip.date} · {trip.stops.length} stops · Plan v
        {trip.planVersion}
      </p>
      <p>
        Planned load: {trip.totalWeightKg} kg /{" "}
        {Number(trip.totalVolumeM3.toFixed(3))} m³ · Departure{" "}
        {new Date(trip.plannedDepartureAt).toLocaleTimeString("en-GB", {
          timeZone: "Asia/Colombo",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>
      <Link to={`/trips/${encodeURIComponent(trip.id)}`}>Open trip</Link>
      {!terminal && trip.loaderAcknowledgedPlanVersion !== trip.planVersion && (
        <p role="status">
          Plan acknowledgement required. Review stop sequence and checked
          quantities before departure.
        </p>
      )}
      {error && <p role="alert">Order labels unavailable: {error}</p>}
      <details>
        <summary>Stop sequence and loading list</summary>
        <ol>
          {[...trip.stops]
            .sort((a, b) => a.sequence - b.sequence)
            .map((s) => (
              <li key={s.id}>
                <strong>
                  {s.sequence}. {s.outletId}
                </strong>
                <p>
                  Order {s.orderId} · {s.status} · ETA{" "}
                  {new Date(s.plannedArrivalAt).toLocaleTimeString("en-GB", {
                    timeZone: "Asia/Colombo",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <ul>
                  {s.lines.map((l) => {
                    const item = orders
                      .find((o) => o.id === s.orderId)
                      ?.lines.find((i) => i.id === l.orderLineId);
                    return (
                      <li key={l.orderLineId}>
                        {item?.item ?? l.orderLineId}:{" "}
                        {l.loadedQty ?? "Unchecked"} /{" "}
                        {l.plannedQty - l.cancelledQty} {item?.unit ?? "units"}{" "}
                        · cancelled {l.cancelledQty}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
        </ol>
      </details>
      <Loading trip={trip} role="loader" call={call} act={act} />
      {!terminal && (
        <details>
          <summary>Report damaged or missing stock with photo</summary>
          {trip.stops.flatMap((s) =>
            s.lines.map((l) => (
              <ActionForm
                key={l.orderLineId}
                title="Report loading issue"
                onSubmit={async (f, key) => {
                  const photo = f.get("photo");
                  let photoRefs: string[] = [];
                  if (photo instanceof File && photo.size) {
                    const form = new FormData();
                    form.set("file", photo);
                    form.set("orderId", s.orderId);
                    form.set("tripId", trip.id);
                    form.set("clientActionId", `${key}:photo`);
                    try {
                      const evidence = await apiFetch<{ evidenceId: string }>(
                        "/evidence",
                        { token, method: "POST", body: form },
                      );
                      photoRefs = [evidence.evidenceId];
                    } catch (e) {
                      if (e instanceof ApiError && e.status === 401)
                        expire(token);
                      throw e;
                    }
                  }
                  await act(`/loading/${trip.id}/issues`, {
                    clientActionId: key,
                    expectedPlanVersion: trip.planVersion,
                    orderLineId: l.orderLineId,
                    type: String(f.get("type")),
                    availableQty: Number(f.get("qty")),
                    note: String(f.get("note")),
                    photoRefs,
                  });
                }}
              >
                <p>
                  {s.outletId} ·{" "}
                  {orders
                    .find((o) => o.id === s.orderId)
                    ?.lines.find((i) => i.id === l.orderLineId)?.item ??
                    l.orderLineId}
                </p>
                <label>
                  Issue type
                  <select name="type">
                    <option value="MISSING">Missing</option>
                    <option value="DAMAGED">Damaged</option>
                  </select>
                </label>
                <Field name="qty" type="number" label="Available quantity" />
                <Field name="note" label="Issue note" />
                <label>
                  Issue photo (optional)
                  <input
                    name="photo"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                  />
                </label>
              </ActionForm>
            )),
          )}
        </details>
      )}
      {load.issues.length > 0 && (
        <details>
          <summary>Issue history and evidence</summary>
          {load.issues.map((i) => (
            <article key={i.id}>
              <h3>
                {i.type} · {i.status}
              </h3>
              <p>{i.note}</p>
              <p>
                {i.availableQty}/{i.expectedQty} available · cancelled{" "}
                {i.cancelledQty}
              </p>
              {i.decision && (
                <p>
                  Dispatcher: {i.decision.action} · {i.decision.reason}
                </p>
              )}
              <p>
                {i.acknowledgedAt
                  ? `Acknowledged ${i.acknowledgedAt}`
                  : "Awaiting acknowledgement"}
              </p>
              <EvidenceGallery ids={i.photoRefs ?? []} />
            </article>
          ))}
        </details>
      )}
    </section>
  );
}
