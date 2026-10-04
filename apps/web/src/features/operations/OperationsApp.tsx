import {EvidenceGallery} from '../../components/shared/EvidenceGallery';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import type {
  CatalogItemView,
  DeliveryOutcomePayload,
  DeliveryView,
  FieldAction,
  FieldConflictView,
  LoadingView,
  OrderView,
  Page,
  PlanDraftView,
  TripStopView,
  TripView,
  VehicleView,
} from "@waypoint/contracts";
import { useAuth } from "../../app/providers/AuthProvider";
import { ApiError, apiFetch } from "../../api/client";
import {
  cachedTrips,
  enqueue,
  flushQueue,
  pendingActions,
  saveTrips,
  type PendingAction,
} from "./offline";
import "./operations.css";
type Call = <T>(path: string, body?: unknown, method?: string) => Promise<T>;
const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
const uid = () => crypto.randomUUID();
const value = (f: FormData, name: string) => String(f.get(name) ?? "");
const number = (f: FormData, name: string) => Number(value(f, name));
function Field({
  name,
  label,
  type = "text",
  defaultValue,
  required = true,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string | number;
  required?: boolean;
}) {
  return (
    <label>
      {label}
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        min={type === "number" ? 0 : undefined}
      />
    </label>
  );
}
/** Keep the same action key on a retry of unchanged form values. */
function ActionForm({
  title,
  children,
  onSubmit,
  repeatLabel,
}: {
  repeatLabel?: string;
  title: string;
  children?: ReactNode;
  onSubmit: (data: FormData, key: string) => Promise<unknown>;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState(false);
  const intent = useRef({ hash: "", key: uid() });
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const form = new FormData(e.currentTarget);
    const hash = JSON.stringify(
      [...form].map(([k, v]) => [
        k,
        v instanceof File ? [v.name, v.size, v.lastModified] : v,
      ]),
    );
    if (intent.current.hash !== hash) intent.current = { hash, key: uid() };
    setBusy(true);
    setError("");
    setDone(false);
    try {
      await onSubmit(form, intent.current.key);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit}>
      <fieldset disabled={busy || done}>
        {children}
        <button type="submit">
          {busy ? "Saving…" : done ? "Saved" : title}
        </button>
      </fieldset>
      {error && <p role="alert">{error}</p>}
      {done && repeatLabel && (
        <button
          type="button"
          onClick={() => {
            intent.current = { hash: "", key: uid() };
            setDone(false);
          }}
        >
          {repeatLabel}
        </button>
      )}
    </form>
  );
}
function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="ops-card">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
function Details({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details>
      <summary>{title}</summary>
      {children}
    </details>
  );
}
export function OperationsApp() {
  const { user, token, logout, expire } = useAuth();
  const [orders, setOrders] = useState<OrderView[]>([]),
    [trips, setTrips] = useState<TripView[]>([]),
    [catalog, setCatalog] = useState<CatalogItemView[]>([]),
    [depots, setDepots] = useState<{ id: string; name: string }[]>([]),
    [vehicles, setVehicles] = useState<VehicleView[]>([]),
    [conflicts, setConflicts] = useState<FieldConflictView[]>([]);
  const [day, setDay] = useState(
      () => sessionStorage.getItem(`waypoint.run-date:${user?.id}`) || today(),
    ),
    [depot, setDepot] = useState(""),
    [error, setError] = useState(""),
    [cached, setCached] = useState(false),
    [queue, setQueue] = useState<PendingAction[]>([]),
    [refreshing, setRefreshing] = useState(false);
  const call: Call = useCallback(
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
  const refreshEpoch = useRef(0);
  const refresh = useCallback(async () => {
    if (!user) return;
    const epoch = ++refreshEpoch.current;
    setRefreshing(true);
    setError("");
    try {
      async function all<T>(path: string): Promise<T[]> {
        let cursor: string | null = null;
        const items: T[] = [];
        do {
          const page: Page<T> = await call(
            `${path}${path.includes("?") ? "&" : "?"}limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
          );
          if (epoch !== refreshEpoch.current) throw new Error("Superseded refresh");
          items.push(...page.items);
          cursor = page.nextCursor;
        } while (cursor);
        return items;
      }
      if (user.role === "store_manager") {
        setOrders(await all<OrderView>("/store/orders"));
        setCatalog(await all<CatalogItemView>("/catalog"));
      } else {
        const rows = await all<TripView>(`/trips?date=${day}`);
        setTrips(rows);
        if (user.role === "driver") await saveTrips(user.id, rows);
      }
      if (user.role === "dispatcher") {
        setOrders(await all<OrderView>(`/dispatcher/orders?date=${day}`));
        const d = await all<{ id: string; name: string }>("/depots");
        setDepots(d);
        const selected = depot || d[0]?.id || "";
        if (!depot) setDepot(selected);
        if (selected)
          setVehicles(
            await all<VehicleView>(
              `/vehicles?date=${day}&depotId=${encodeURIComponent(selected)}`,
            ),
          );
        setConflicts(await all<FieldConflictView>("/sync/conflicts"));
      }
      setCached(false);
    } catch (e) {
      if (epoch !== refreshEpoch.current) return;
      setError(e instanceof Error ? e.message : "Connection unavailable");
      if (user.role === "driver") {
        setTrips(await cachedTrips(user.id));
        setCached(true);
      }
    } finally {
      if (epoch === refreshEpoch.current) {
        setRefreshing(false);
        if (user.role === "driver") setQueue(await pendingActions(user.id));
      }
    }
  }, [user, day, depot, call]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const sync = useCallback(async () => {
    if (!user || !token) return;
    try {
      await flushQueue(user.id, token);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Waiting for connection");
    } finally {
      setQueue(await pendingActions(user.id));
    }
  }, [user, token, refresh]);
  useEffect(() => {
    if (user?.role !== "driver") return;
    const online = () => void sync();
    window.addEventListener("online", online);
    return () => window.removeEventListener("online", online);
  }, [user, sync]);
  if (!user) return null;
  const act: Call = async <T,>(
    path: string,
    body?: unknown,
    method?: string,
  ) => {
    const result = await call<T>(path, body, method);
    await refresh();
    return result;
  };
  async function queueAction(
    action: FieldAction,
    trip: TripView,
    stop: TripStopView,
    attachments: PendingAction["attachments"] = [],
  ) {
    await enqueue({
      id: action.request.clientActionId,
      queuedAt: new Date().toISOString(),
      actorId: user!.id,
      action,
      orderId: stop.orderId,
      tripId: trip.id,
      attachments,
      status: "PENDING_SYNC",
    });
    setQueue(await pendingActions(user!.id));
    if (navigator.onLine) void sync();
  }
  return (
    <div className="operations">
      <header>
        <div>
          <b>WAYPOINT</b>
          <span>Delivery operations</span>
        </div>
        <div>
          {user.name} · {user.role.replace("_", " ")}{" "}
          <button onClick={() => void logout()}>Sign out</button>
        </div>
      </header>
      <main>
        <div className="ops-heading">
          <div>
            <p>WORKSPACE</p>
            <h1>
              {user.role === "store_manager"
                ? "Orders & receipts"
                : user.role === "dispatcher"
                  ? "Dispatch planning"
                  : user.role === "loader"
                    ? "Loading checks"
                    : "My deliveries"}
            </h1>
          </div>
          <button disabled={refreshing} onClick={() => void refresh()}>
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
        {user.role !== "store_manager" && (
          <label className="date-filter">
            Run date
            <input
              type="date"
              value={day}
              onChange={(e) => {
                setDay(e.target.value);
                sessionStorage.setItem(
                  `waypoint.run-date:${user.id}`,
                  e.target.value,
                );
              }}
            />
          </label>
        )}
        {error && <p role="alert">{error}</p>}
        {cached && (
          <p role="status">
            Showing the last saved trip plan. Field actions will wait safely on
            this device until they sync.
          </p>
        )}
        {user.role === "store_manager" && (
          <Card title="New order">
            <ActionForm
              title="Place order"
              repeatLabel="Place another order"
              onSubmit={async (f, key) => {
                const item = catalog.find((c) => c.id === value(f, "item"))!;
                await act("/orders", {
                  clientActionId: key,
                  requestedDate: value(f, "date"),
                  temp: item.temp,
                  lines: [
                    { catalogItemId: item.id, requestedQty: number(f, "qty") },
                  ],
                });
              }}
            >
              <Field
                name="date"
                label="Requested delivery date"
                type="date"
                defaultValue={day}
              />
              <label>
                Item
                <select aria-label="Item" name="item" required>
                  <option value="">Choose an item</option>
                  {catalog.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} · {c.unit} · {c.temp}
                    </option>
                  ))}
                </select>
              </label>
              <Field name="qty" label="Quantity" type="number" />
            </ActionForm>
            {!catalog.length && (
              <p>No catalog items are configured for your store.</p>
            )}
          </Card>
        )}
        {user.role === "dispatcher" && (
          <Card title="Plan a trip">
            <label>
              Depot
              <select value={depot} onChange={(e) => setDepot(e.target.value)}>
                {depots.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            <ActionForm
              key={`${day}:${depot}`}
              title="Validate, save draft & allocate"
              repeatLabel="Plan another trip"
              onSubmit={async (f, key) => {
                const ids = f.getAll("order").map(String);
                const plan = {
                  date: day,
                  depotId: depot,
                  vehicleId: value(f, "vehicle"),
                  plannedDeparture: value(f, "departure"),
                  orderIds: ids,
                };
                const check = await call<{
                  valid: boolean;
                  reasons: { message: string }[];
                }>("/planning/validate", { plan });
                if (!check.valid)
                  throw new Error(
                    check.reasons.map((r) => r.message).join(" · "),
                  );
                const draft = await call<PlanDraftView>("/planning/drafts", {
                  clientActionId: `${key}:draft`,
                  plan,
                });
                await act("/planning/allocate", {
                  clientActionId: key,
                  draftId: draft.id,
                  expectedDraftVersion: draft.version,
                });
              }}
            >
              <label>
                Vehicle
                <select aria-label="Vehicle" name="vehicle" required>
                  <option value="">Choose a vehicle</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.id} · {v.remainingFuelL.toFixed(1)} L remaining
                    </option>
                  ))}
                </select>
              </label>
              <Field
                name="departure"
                label="Departure time"
                type="time"
                defaultValue="05:00"
              />
              <p>Stops follow the order shown below.</p>
              {orders
                .filter(
                  (o) =>
                    !o.activeTripId &&
                    ["CONFIRMED", "DEFERRED"].includes(o.status),
                )
                .map((o) => (
                  <label className="check" key={o.id}>
                    <input type="checkbox" name="order" value={o.id} />
                    {o.id} · {o.outletId} · {o.units} units
                  </label>
                ))}
            </ActionForm>
          </Card>
        )}
        {orders.map((o) => (
          <Card
            key={`${o.id}:${o.version}`}
            title={`${o.outletId} · ${o.status}`}
          >
            <p className="reference">Order {o.id}</p>
            <p>
              Requested {o.requestedDate} · Scheduled{" "}
              {o.plannedDate ?? o.deferredToDate ?? "pending"}
            </p>
            <ul>
              {o.lines.map((l) => (
                <li key={l.id}>
                  {l.item}: requested {l.requestedQty}, cancelled{" "}
                  {l.cancelledQty}, accepted {l.deliveredQty}
                </li>
              ))}
            </ul>
            {o.deferReason && <p>Deferred: {o.deferReason}</p>}
            {user.role === "dispatcher" && !o.activeTripId && (
              <Details title="Defer order">
                <ActionForm
                  title="Confirm deferral"
                  onSubmit={(f, key) =>
                    act("/planning/defer", {
                      clientActionId: key,
                      orderId: o.id,
                      expectedVersion: o.version,
                      nextDate: value(f, "date"),
                      reason: value(f, "reason"),
                    })
                  }
                >
                  <Field name="date" label="Next run date" type="date" />
                  <Field name="reason" label="Reason" />
                </ActionForm>
              </Details>
            )}
            <OrderHistory order={o} role={user.role} call={call} act={act} />
          </Card>
        ))}
        {trips.map((trip) => (
          <Card
            key={`${trip.id}:${trip.version}`}
            title={`${trip.vehicleId} · Trip ${trip.tripNo} · ${trip.status}`}
          >
            <p className="reference">
              {trip.id} · plan {trip.planVersion}
            </p>
            <p>
              {trip.totalWeightKg} kg · {trip.totalVolumeM3} m³ ·{" "}
              {trip.estimatedDistanceKm} km
            </p>
            {user.role === "dispatcher" && !trip.publishedAt && (
              <ActionForm
                title="Publish to loading team"
                onSubmit={(_, key) =>
                  act("/plans/publish", {
                    clientActionId: key,
                    trips: [
                      {
                        tripId: trip.id,
                        expectedPlanVersion: trip.planVersion,
                      },
                    ],
                  })
                }
              />
            )}
            {user.role === "dispatcher" &&
              ["CONFIRMED", "LOADING", "READY"].includes(trip.status) && (
                <Details title="Release allocation">
                  <ActionForm
                    title="Release unloaded trip"
                    onSubmit={(f, key) =>
                      act(`/trips/${trip.id}/release`, {
                        clientActionId: key,
                        expectedPlanVersion: trip.planVersion,
                        reason: value(f, "reason"),
                      })
                    }
                  >
                    <Field name="reason" label="Reason" />
                  </ActionForm>
                </Details>
              )}
            {(user.role === "loader" || user.role === "dispatcher") &&
              trip.publishedAt && (
                <Loading trip={trip} role={user.role} call={call} act={act} />
              )}
            {user.role === "driver" && trip.status === "READY" && (
              <ActionForm
                title="Depart"
                onSubmit={(_, key) =>
                  act(`/trips/${trip.id}/depart`, {
                    clientActionId: key,
                    expectedPlanVersion: trip.planVersion,
                  })
                }
              />
            )}
            {trip.stops.map((stop) => (
              <article key={stop.id}>
                <h3>
                  Stop {stop.sequence} · {stop.outletId} · {stop.status}
                </h3>
                <p className="reference">Order {stop.orderId}</p>
                <p>
                  Arrival{" "}
                  {new Date(stop.plannedArrivalAt).toLocaleTimeString("en-GB", {
                    timeZone: "Asia/Colombo",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                {user.role === "dispatcher" &&
                  trip.status === "IN_TRANSIT" &&
                  ["PLANNED", "ARRIVED"].includes(stop.status) && (
                    <Details title="Reschedule stop">
                      <ActionForm
                        title="Request return & reschedule"
                        onSubmit={(f, key) =>
                          act(`/stops/${stop.id}/reschedule`, {
                            clientActionId: key,
                            expectedPlanVersion: trip.planVersion,
                            nextDate: value(f, "date"),
                            reason: value(f, "reason"),
                          })
                        }
                      >
                        <Field name="date" label="Next date" type="date" />
                        <Field name="reason" label="Reason" />
                      </ActionForm>
                    </Details>
                  )}
                {user.role === "driver" &&
                  trip.status === "IN_TRANSIT" &&
                  ["PLANNED", "ARRIVED"].includes(stop.status) && (
                    <>
                      {stop.reschedule ? (
                        <>
                          <p>
                            Return requested: {stop.reschedule.reason} · next
                            run {stop.reschedule.nextDate}
                          </p>
                          <ActionForm
                            title="Confirm all goods returned to depot"
                            onSubmit={(_, key) =>
                              act(`/stops/${stop.id}/acknowledge-reschedule`, {
                                clientActionId: key,
                                expectedPlanVersion: trip.planVersion,
                                returnedAt: new Date().toISOString(),
                                lines: stop.lines.map((l) => ({
                                  orderLineId: l.orderLineId,
                                  returnedQty: l.loadedQty ?? 0,
                                })),
                              })
                            }
                          />
                        </>
                      ) : (
                        <>
                          <ActionForm
                            title="Record arrival"
                            onSubmit={(_, key) =>
                              queueAction(
                                {
                                  kind: "ARRIVE",
                                  stopId: stop.id,
                                  request: {
                                    clientActionId: key,
                                    expectedPlanVersion: trip.planVersion,
                                    capturedAt: new Date().toISOString(),
                                  },
                                },
                                trip,
                                stop,
                              )
                            }
                          />
                          {!queue.some(
                            (q) =>
                              q.action.kind === "OUTCOME" &&
                              q.action.stopId === stop.id,
                          ) && (
                            <Outcome
                              trip={trip}
                              stop={stop}
                              save={queueAction}
                            />
                          )}
                        </>
                      )}
                    </>
                  )}
              </article>
            ))}
          </Card>
        ))}
        {user.role === "driver" && (
          <Card title="Saved field actions">
            <button onClick={() => void sync()}>Sync pending actions</button>
            <p>
              Keep this browser’s site data until all actions are synced. Sign
              in as the same driver to resume.
            </p>
            {queue.length === 0 ? (
              <p>No saved actions.</p>
            ) : (
              queue.map((q) => (
                <p key={q.id}>
                  {q.action.kind} · {q.status} ·{" "}
                  {q.message ?? "Saved on this device"}
                </p>
              ))
            )}
          </Card>
        )}
        {user.role === "dispatcher" &&
          conflicts.map((c) => (
            <Card
              key={`${c.id}:${c.version}`}
              title="Offline action needs review"
            >
              <p>
                {c.action.kind} · captured {c.action.request.capturedAt} ·
                current plan {c.currentPlanVersion}
              </p>
              {c.action.kind === "OUTCOME" && (
                <EvidenceGallery
                  ids={
                    c.action.request.delivery.outcome === "FAILED"
                      ? c.action.request.delivery.photoRefs
                      : [
                          ...c.action.request.delivery.proof.photoRefs,
                          ...(c.action.request.delivery.proof.signatureRef
                            ? [c.action.request.delivery.proof.signatureRef]
                            : []),
                        ]
                  }
                />
              )}
              {c.action.kind === "OUTCOME" && (
                <p>
                  {c.action.request.delivery.outcome}:{" "}
                  {c.action.request.delivery.lines
                    .map(
                      (l) =>
                        `${l.deliveredQty} delivered / ${l.returnedQty} returned`,
                    )
                    .join(", ")}
                </p>
              )}
              <ActionForm
                title="Save review decision"
                onSubmit={(f, key) =>
                  act(`/sync/conflicts/${c.id}/resolve`, {
                    clientActionId: key,
                    expectedVersion: c.version,
                    resolution: value(f, "resolution"),
                    reason: value(f, "reason"),
                  })
                }
              >
                <label>
                  Decision
                  <select name="resolution">
                    <option value="RETAIN_FOR_INVESTIGATION">
                      Keep for investigation
                    </option>
                    <option value="ACCEPT_RECORDED_FACT">
                      Accept recorded facts
                    </option>
                  </select>
                </label>
                <Field name="reason" label="Review reason" />
              </ActionForm>
            </Card>
          ))}
        {!orders.length && !trips.length && (
          <p>
            No work for this view. Use Refresh after another team member
            completes their step.
          </p>
        )}
      </main>
    </div>
  );
}
function Loading({
  trip,
  role,
  call,
  act,
}: {
  trip: TripView;
  role: string;
  call: Call;
  act: Call;
}) {
  const [data, setData] = useState<LoadingView | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    void call<LoadingView>(`/trips/${trip.id}/loading`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [call, trip.id, trip.version]);
  if (error) return <p role="alert">{error}</p>;
  if (!data) return <p>Loading checks…</p>;
  if (!["CONFIRMED", "LOADING", "READY"].includes(trip.status)) return null;
  return (
    <Details title="Loading checks & shortfalls">
      {role === "loader" && (
        <>
          <ActionForm
            title="Start loading"
            onSubmit={(_, key) =>
              act(`/loading/${trip.id}/start`, {
                clientActionId: key,
                expectedPlanVersion: trip.planVersion,
              })
            }
          />
          {trip.stops.flatMap((s) =>
            s.lines.map((l) => (
              <div key={l.orderLineId}>
                <p>
                  {s.outletId} · {l.plannedQty - l.cancelledQty} approved ·{" "}
                  {l.loadedQty ?? "not checked"} loaded
                </p>
                <ActionForm
                  title="Save checked quantity"
                  onSubmit={(f, key) =>
                    act(
                      `/loading/${trip.id}/lines/${l.orderLineId}`,
                      {
                        clientActionId: key,
                        expectedPlanVersion: trip.planVersion,
                        expectedVersion: l.version,
                        loadedQty: number(f, "qty"),
                      },
                      "PATCH",
                    )
                  }
                >
                  <Field
                    name="qty"
                    label="Loaded quantity"
                    type="number"
                    defaultValue={l.loadedQty ?? l.plannedQty - l.cancelledQty}
                  />
                </ActionForm>
                <Details title="Report shortfall">
                  <ActionForm
                    title="Report missing stock"
                    onSubmit={(f, key) =>
                      act(`/loading/${trip.id}/issues`, {
                        clientActionId: key,
                        expectedPlanVersion: trip.planVersion,
                        orderLineId: l.orderLineId,
                        type: "MISSING",
                        availableQty: number(f, "qty"),
                        note: value(f, "note"),
                        photoRefs: [],
                      })
                    }
                  >
                    <Field
                      name="qty"
                      label="Available quantity"
                      type="number"
                    />
                    <Field name="note" label="Shortfall note" />
                  </ActionForm>
                </Details>
              </div>
            )),
          )}
        </>
      )}
      {data.issues.map((i) => (
        <div key={i.id}>
          <p>
            {i.type} · {i.status} · {i.availableQty}/{i.expectedQty} available
          </p>
          {role === "dispatcher" && i.status === "OPEN" && (
            <ActionForm
              title="Save shortfall decision"
              onSubmit={(f, key) =>
                act(`/loading/issues/${i.id}/decision`, {
                  clientActionId: key,
                  expectedVersion: i.version,
                  expectedPlanVersion: trip.planVersion,
                  decision: {
                    action: value(f, "action"),
                    ...(value(f, "action") === "SHIP_SHORT"
                      ? { approvedLoadedQty: number(f, "qty") }
                      : {}),
                    reason: value(f, "reason"),
                  },
                })
              }
            >
              <label>
                Decision
                <select name="action">
                  <option value="REPLACEMENT_REQUIRED">
                    Load replacements
                  </option>
                  <option value="SHIP_SHORT">
                    Cancel unavailable quantity and ship short
                  </option>
                </select>
              </label>
              <Field
                name="qty"
                label="Approved loaded quantity"
                type="number"
                defaultValue={i.availableQty}
              />
              <Field name="reason" label="Reason" />
            </ActionForm>
          )}
          {role === "loader" && i.decision && i.status !== "RESOLVED" && (
            <ActionForm
              title="Acknowledge decision after checking goods"
              onSubmit={(_, key) =>
                act(`/loading/issues/${i.id}/acknowledge`, {
                  clientActionId: key,
                  expectedVersion: i.version,
                  expectedPlanVersion: trip.planVersion,
                })
              }
            />
          )}
        </div>
      ))}
      {role === "loader" && (
        <>
          <ActionForm
            title="Acknowledge current plan"
            onSubmit={(_, key) =>
              act(`/trips/${trip.id}/acknowledge-plan`, {
                clientActionId: key,
                expectedPlanVersion: trip.planVersion,
              })
            }
          />
          <ActionForm
            title="Mark ready for departure"
            onSubmit={(_, key) =>
              act(`/trips/${trip.id}/ready`, {
                clientActionId: key,
                expectedPlanVersion: trip.planVersion,
              })
            }
          />
        </>
      )}
    </Details>
  );
}
function Outcome({
  trip,
  stop,
  save,
}: {
  trip: TripView;
  stop: TripStopView;
  save: (
    a: FieldAction,
    t: TripView,
    s: TripStopView,
    files: PendingAction["attachments"],
  ) => Promise<void>;
}) {
  const [outcome, setOutcome] = useState("DELIVERED"),
    [exception, setException] = useState(false);
  return (
    <Details title="Record delivery outcome">
      <ActionForm
        title="Save delivery evidence"
        onSubmit={async (f, key) => {
          const attachments: PendingAction["attachments"] = [];
          for (const slot of ["signature", "photo"] as const) {
            const file = f.get(slot);
            if (file instanceof File && file.size) {
              if (file.size > 10 * 1024 * 1024)
                throw new Error("Each image must be under 10 MiB.");
              attachments.push({ slot, blob: file });
            }
          }
          const lines = stop.lines.map((l) => {
            const deliveredQty = number(f, l.orderLineId);
            return {
              orderLineId: l.orderLineId,
              deliveredQty,
              returnedQty: (l.loadedQty ?? 0) - deliveredQty,
            };
          });
          if (lines.some((l) => l.returnedQty < 0))
            throw new Error("Delivered quantity exceeds loaded goods.");
          const proof = exception
            ? {
                recipientName: value(f, "recipient"),
                signatureRef: null,
                signatureExceptionReason: value(f, "reason"),
                photoRefs: ["pending"] as [string],
              }
            : {
                recipientName: value(f, "recipient"),
                signatureRef: "pending",
                photoRefs: [],
              };
          const delivery: DeliveryOutcomePayload =
            outcome === "FAILED"
              ? {
                  outcome: "FAILED",
                  reason: value(f, "reason"),
                  photoRefs: ["pending"],
                  lines: lines as [(typeof lines)[number]],
                }
              : outcome === "PARTIAL"
                ? {
                    outcome: "PARTIAL",
                    reason: value(f, "reason"),
                    damageReported: f.get("damage") === "on",
                    proof,
                    lines: lines as [(typeof lines)[number]],
                  }
                : {
                    outcome: "DELIVERED",
                    damageReported: false,
                    proof,
                    lines: lines as [(typeof lines)[number]],
                  };
          if (outcome === "FAILED" && lines.some((l) => l.deliveredQty !== 0))
            throw new Error("Failed attempt must have zero handover.");
          if (outcome === "DELIVERED" && lines.some((l) => l.returnedQty !== 0))
            throw new Error("Choose Partial when goods are returned.");
          if (
            outcome === "PARTIAL" &&
            (!lines.some((l) => l.returnedQty > 0) ||
              !lines.some((l) => l.deliveredQty > 0))
          )
            throw new Error("Partial requires both handover and returns.");
          if (
            (outcome === "FAILED" || exception || f.get("damage") === "on") &&
            !attachments.some((a) => a.slot === "photo")
          )
            throw new Error("This outcome needs a photo.");
          await save(
            {
              kind: "OUTCOME",
              stopId: stop.id,
              request: {
                clientActionId: key,
                expectedPlanVersion: trip.planVersion,
                capturedAt: new Date().toISOString(),
                delivery,
              },
            },
            trip,
            stop,
            attachments,
          );
        }}
      >
        <label>
          Outcome
          <select value={outcome} onChange={(e) => setOutcome(e.target.value)}>
            <option>DELIVERED</option>
            <option>PARTIAL</option>
            <option>FAILED</option>
          </select>
        </label>
        {stop.lines.map((l) => (
          <Field
            key={`${l.orderLineId}:${outcome}`}
            name={l.orderLineId}
            label={`Delivered quantity (loaded ${l.loadedQty})`}
            type="number"
            defaultValue={outcome === "FAILED" ? 0 : (l.loadedQty ?? 0)}
          />
        ))}
        {outcome !== "FAILED" && (
          <>
            <Field name="recipient" label="Recipient name" />
            <label className="check">
              <input
                type="checkbox"
                checked={exception}
                onChange={(e) => setException(e.target.checked)}
              />
              Signature unavailable — request dispatcher review
            </label>
            {!exception && (
              <label>
                Receiver signature image
                <input
                  type="file"
                  name="signature"
                  accept="image/png,image/jpeg,image/webp"
                  required
                />
              </label>
            )}
          </>
        )}
        {(outcome !== "DELIVERED" || exception) && (
          <Field name="reason" label="Reason" />
        )}
        {outcome === "PARTIAL" && (
          <label className="check">
            <input type="checkbox" name="damage" />
            Damage reported
          </label>
        )}
        <label>
          Attempt photo
          <input
            type="file"
            name="photo"
            accept="image/png,image/jpeg,image/webp"
            required={outcome === "FAILED" || exception}
          />
        </label>
      </ActionForm>
    </Details>
  );
}
function OrderHistory({
  order,
  role,
  call,
  act,
}: {
  order: OrderView;
  role: string;
  call: Call;
  act: Call;
}) {
  const [deliveries, setDeliveries] = useState<DeliveryView[]>([]),
    [receipted, setReceipted] = useState<string[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    void (async () => {
      try {
        const ds = await call<Page<DeliveryView>>(
          `/orders/${order.id}/deliveries`,
        );
        setDeliveries(ds.items);
        const done: string[] = [];
        for (const d of ds.items) {
          try {
            await call(`/deliveries/${d.id}/receipt`);
            done.push(d.id);
          } catch (e) {
            if (!(e instanceof ApiError && e.status === 404)) throw e;
          }
        }
        setReceipted(done);
      } catch (e) {
        setError(e instanceof Error ? e.message : "History unavailable");
      }
    })();
  }, [call, order.id, order.version]);
  if (error) return <p role="alert">{error}</p>;
  return (
    <>
      {deliveries.map((d) => (
        <Details
          key={`${d.id}:${d.version}`}
          title={`${d.outcome} · ${receipted.includes(d.id) ? "Receipt confirmed" : "Receipt pending"}`}
        >
          <EvidenceGallery
            ids={
              d.recorded.outcome === "FAILED"
                ? d.recorded.photoRefs
                : [
                    ...d.recorded.proof.photoRefs,
                    ...(d.recorded.proof.signatureRef
                      ? [d.recorded.proof.signatureRef]
                      : []),
                  ]
            }
          />
          <p>
            Attempt {d.capturedAt} ·{" "}
            {d.recorded.lines
              .map(
                (l) =>
                  `${l.deliveredQty} handed over / ${l.returnedQty} returned`,
              )
              .join(", ")}
          </p>
          {role === "store_manager" &&
            d.outcome !== "FAILED" &&
            !receipted.includes(d.id) && (
              <ActionForm
                title="Confirm received quantities"
                onSubmit={(f, key) =>
                  act(`/deliveries/${d.id}/confirm`, {
                    clientActionId: key,
                    expectedDeliveryVersion: d.version,
                    lines: d.recorded.lines.map((l) => ({
                      orderLineId: l.orderLineId,
                      acceptedQty: number(f, `${l.orderLineId}:accepted`),
                      damagedQty: number(f, `${l.orderLineId}:damaged`),
                      missingQty: number(f, `${l.orderLineId}:missing`),
                      note: value(f, "note") || null,
                      photoRefs: [],
                    })),
                  })
                }
              >
                {d.recorded.lines.map((l) => (
                  <div key={l.orderLineId}>
                    <p>Handed over: {l.deliveredQty}</p>
                    <Field
                      name={`${l.orderLineId}:accepted`}
                      label="Accepted"
                      type="number"
                      defaultValue={l.deliveredQty}
                    />
                    <Field
                      name={`${l.orderLineId}:damaged`}
                      label="Damaged"
                      type="number"
                      defaultValue={0}
                    />
                    <Field
                      name={`${l.orderLineId}:missing`}
                      label="Missing"
                      type="number"
                      defaultValue={0}
                    />
                  </div>
                ))}
                <Field name="note" label="Receipt note" required={false} />
              </ActionForm>
            )}
          {role === "dispatcher" && d.requiresDispatcherReview && (
            <ActionForm
              title="Confirm evidence reviewed"
              onSubmit={(f, key) =>
                act(`/deliveries/${d.id}/review`, {
                  clientActionId: key,
                  expectedVersion: d.version,
                  reason: value(f, "reason"),
                })
              }
            >
              <Field name="reason" label="Review findings" />
            </ActionForm>
          )}
          {role === "dispatcher" && order.recoveryPending && (
            <ActionForm
              title="Save recovery decision"
              onSubmit={(f, key) =>
                act(`/deliveries/${d.id}/recovery`, {
                  clientActionId: key,
                  expectedVersion: d.version,
                  decision: {
                    action: value(f, "action"),
                    reason: value(f, "reason"),
                    ...(value(f, "action") === "REDELIVER"
                      ? { nextDate: value(f, "date") }
                      : {}),
                    lines: d.recorded.lines
                      .map((l) => ({
                        orderLineId: l.orderLineId,
                        qty: number(f, l.orderLineId),
                      }))
                      .filter((l) => l.qty > 0),
                  },
                })
              }
            >
              <label>
                Recovery
                <select name="action">
                  <option value="REDELIVER">Redeliver outstanding goods</option>
                  <option value="CLOSE_WITHOUT_REDELIVERY">
                    Close without redelivery
                  </option>
                </select>
              </label>
              {d.recorded.lines.map((l) => (
                <Field
                  key={l.orderLineId}
                  name={l.orderLineId}
                  label="Quantity to resolve"
                  type="number"
                  defaultValue={l.returnedQty}
                />
              ))}
              <Field
                name="date"
                label="Next run date (for redelivery)"
                type="date"
                required={false}
              />
              <Field name="reason" label="Decision reason" />
            </ActionForm>
          )}
        </Details>
      ))}
    </>
  );
}
