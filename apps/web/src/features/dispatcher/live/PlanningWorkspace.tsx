import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type {
  AllocatePlanResponse,
  DispatcherOrderView,
  PlanDraftView,
  TripView,
  ValidatePlanResponse,
  VehicleView,
} from "@waypoint/contracts";
import { useAuth } from "../../../app/providers/AuthProvider";
import { useQuery } from "../../../api/useQuery";
import {
  Badge,
  Button,
  EmptyState,
  ErrorPanel,
  Modal,
  Panel,
  ReadState,
  numberText,
} from "../../../components/shared/ui";
import { useDispatcher } from "./context";
import {
  emptyEditor,
  fingerprint,
  isSaved,
  moveStop,
  readEditor,
  type EditablePlan,
  type EditorState,
} from "./planning-model";
export function ValidationPanel({
  result,
}: {
  result: ValidatePlanResponse | null;
}) {
  if (!result) return null;
  if (result.valid)
    return (
      <div className="dispatch-success" role="status">
        <b>All planning checks passed.</b>
        <p>
          {numberText(result.totals.weightKg)} kg ·{" "}
          {numberText(result.totals.volumeM3)} m³ ·{" "}
          {numberText(result.totals.distanceKm)} km including return ·{" "}
          {numberText(result.totals.estimatedFuelL)} L
        </p>
      </div>
    );
  return (
    <section
      className="dispatch-validation"
      role="alert"
      aria-label="Planning validation reasons"
    >
      <h3>Assignment blocked — your draft is retained</h3>
      <ul>
        {result.reasons.map((r, i) => (
          <li key={`${r.code}:${i}`}>
            <b>{r.code.toLowerCase().replace(/_/g, " ")}</b>
            <p>{r.message}</p>
            {r.entityId && <small>Order / vehicle: {r.entityId}</small>}
            {typeof r.actual === "number" && (
              <small>
                Actual: {numberText(r.actual)}
                {typeof r.limit === "number"
                  ? ` · Limit: ${numberText(r.limit)}`
                  : ""}
              </small>
            )}
          </li>
        ))}
      </ul>
      <p>
        Adjust the draft, save it again, then validate. No order, slot or fuel
        has been reserved.
      </p>
    </section>
  );
}
export function PlanningWorkspace() {
  const { api, date, depotId, depots } = useDispatcher(),
    { user } = useAuth(),
    [params, setParams] = useSearchParams();
  const storageKey = `waypoint.dispatcher.editor:${user!.id}`;
  const [editor, setEditor] = useState<EditorState>(() => {
    try {
      return readEditor(
        localStorage.getItem(storageKey),
        emptyEditor(date, depotId),
      );
    } catch {
      return emptyEditor(date, depotId);
    }
  });
  const [validation, setValidation] = useState<{
      hash: string;
      result: ValidatePlanResponse;
    } | null>(null),
    [busy, setBusy] = useState(""),
    [error, setError] = useState<unknown>(null),
    [storageError, setStorageError] = useState<unknown>(null),
    [search, setSearch] = useState(""),
    [notice, setNotice] = useState(""),
    [replace, setReplace] = useState<PlanDraftView | "new" | null>(null);
  const lock = useRef(false),
    queryApplied = useRef("");
  const plan = editor.plan,
    hash = fingerprint(plan),
    saved = isSaved(editor),
    result = validation?.hash === hash ? validation.result : null;
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(editor));
      setStorageError(null);
    } catch {
      setStorageError(
        new Error(
          "This browser could not preserve your working copy. Save the draft to the server before leaving.",
        ),
      );
    }
  }, [editor, storageKey]);
  const orders = useQuery(`planning-orders:${plan.date}:${plan.depotId}`, (s) =>
    api.all<DispatcherOrderView>(
      "/dispatcher/orders",
      { date: plan.date, depotId: plan.depotId },
      s,
    ),
  );
  const vehicles = useQuery(
    `planning-vehicles:${plan.date}:${plan.depotId}`,
    (s) =>
      plan.depotId
        ? api.all<VehicleView>(
            "/vehicles",
            { date: plan.date, depotId: plan.depotId },
            s,
          )
        : Promise.resolve([]),
  );
  const drafts = useQuery("saved-dispatcher-drafts", (s) =>
    api.all<PlanDraftView>("/planning/drafts", {}, s),
  );
  const selected = useQuery(
    `selected-orders:${plan.orderIds.join(",")}:${orders.updatedAt?.getTime()}`,
    (s) =>
      Promise.all(
        plan.orderIds.map((id) =>
          api.get<DispatcherOrderView>(`/orders/${encodeURIComponent(id)}`, s),
        ),
      ),
  );
  const serverDraft = useQuery(`server-draft:${editor.draft?.id ?? ""}`, (s) =>
    editor.draft
      ? api.get<PlanDraftView>(`/planning/drafts/${editor.draft.id}`, s)
      : Promise.resolve(null),
  );
  useEffect(() => {
    if (serverDraft.data?.allocatedTripId)
      setEditor((old) =>
        old.draft?.id === serverDraft.data!.id
          ? {
              ...old,
              draft: serverDraft.data!,
              allocatedTripId: serverDraft.data!.allocatedTripId,
            }
          : old,
      );
  }, [serverDraft.data]);
  const allocated = useQuery(
    `allocated-trip:${editor.allocatedTripId ?? ""}`,
    (s) =>
      editor.allocatedTripId
        ? api.get<TripView>(`/trips/${editor.allocatedTripId}`, s)
        : Promise.resolve(null),
  );
  const initialOrder = params.get("orderId"),
    initialVehicle = params.get("vehicleId"),
    initialDepot = params.get("depotId");
  useEffect(() => {
    const queryKey = params.toString();
    if (!queryKey || queryApplied.current === queryKey) return;
    queryApplied.current = queryKey;
    const controller = new AbortController();
    void (async () => {
      try {
        const order = initialOrder
          ? await api.get<DispatcherOrderView>(
              `/orders/${encodeURIComponent(initialOrder)}`,
              controller.signal,
            )
          : null;
        if (controller.signal.aborted) return;
        setEditor((old) => {
          const base = old.allocatedTripId ? emptyEditor(date, depotId) : old;
          const p = { ...base.plan };
          if (order && !p.orderIds.includes(order.id)) {
            if (!p.orderIds.length) {
              p.date =
                order.plannedDate ??
                order.deferredToDate ??
                order.requestedDate;
              p.depotId = order.depotId;
            }
            p.orderIds = [...p.orderIds, order.id];
          }
          if (initialVehicle) p.vehicleId = initialVehicle;
          if (initialDepot) p.depotId = initialDepot;
          return { ...base, plan: p };
        });
        setValidation(null);
        setParams({}, { replace: true });
      } catch (e) {
        if (!controller.signal.aborted) setError(e);
      }
    })();
    return () => controller.abort();
  }, [
    initialOrder,
    initialVehicle,
    initialDepot,
    params,
    api,
    date,
    depotId,
    setParams,
  ]);
  function edit(change: Partial<EditablePlan>) {
    setEditor((old) => ({ ...old, plan: { ...old.plan, ...change } }));
    setValidation(null);
    setNotice("");
    setError(null);
  }
  async function run(label: string, work: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(label);
    setError(null);
    setNotice("");
    try {
      await work();
    } catch (e) {
      setError(e);
    } finally {
      setBusy("");
      lock.current = false;
    }
  }
  async function save() {
    const draft = await api.mutate<PlanDraftView>(
      editor.draft ? `/planning/drafts/${editor.draft.id}` : "/planning/drafts",
      {
        plan,
        ...(editor.draft ? { expectedVersion: editor.draft.version } : {}),
      },
      editor.draft ? "PATCH" : "POST",
    );
    setEditor((old) => ({
      ...old,
      draft,
      allocatedTripId: draft.allocatedTripId,
    }));
    setValidation(null);
    drafts.refresh();
    setNotice("Draft saved on the server. It holds no reservations.");
  }
  const vehicle = vehicles.data?.find((v) => v.id === plan.vehicleId),
    allSelected = selected.data ?? [];
  const knownLoad =
    allSelected.length === plan.orderIds.length &&
    allSelected.every((o) => o.planningLoad);
  const weight = allSelected.reduce(
      (n, o) => n + (o.planningLoad?.weightKg ?? 0),
      0,
    ),
    volume = allSelected.reduce(
      (n, o) => n + (o.planningLoad?.volumeM3 ?? 0),
      0,
    );
  const candidateOrders = (orders.data ?? []).filter(
    (o) =>
      !plan.orderIds.includes(o.id) &&
      !o.activeTripId &&
      ["CONFIRMED", "DEFERRED"].includes(o.status) &&
      `${o.id} ${o.outletName}`.toLowerCase().includes(search.toLowerCase()),
  );
  const locked = !!busy || !!editor.allocatedTripId;
  function adopt(draft: PlanDraftView | "new") {
    setEditor(
      draft === "new"
        ? emptyEditor(date, depotId)
        : { plan: draft.plan, draft, allocatedTripId: draft.allocatedTripId },
    );
    setValidation(null);
    setError(null);
    setReplace(null);
    setNotice(
      draft === "new"
        ? "New working copy started. Saved drafts remain available below."
        : "Saved draft opened. Validate again before allocating.",
    );
  }
  return (
    <>
      <div className="dispatch-page-title">
        <div>
          <h1>Planning Workspace</h1>
          <p>
            Build the stop sequence, check constraints, then publish the
            allocated trip.
          </p>
        </div>
        <Button
          variant="secondary"
          disabled={!!busy}
          onClick={() => setReplace("new")}
        >
          New plan
        </Button>
      </div>
      <div className="dispatch-stepper">
        <span className={editor.draft ? "active" : ""}>1 · Save draft</span>
        <span className={result?.valid ? "active" : ""}>2 · Validate</span>
        <span className={editor.allocatedTripId ? "active" : ""}>
          3 · Allocate
        </span>
        <span className={allocated.data?.publishedAt ? "active" : ""}>
          4 · Publish
        </span>
      </div>
      <ErrorPanel error={error} />
      <ErrorPanel error={storageError} />
      {notice && (
        <p className="dispatch-success" role="status">
          {notice}
        </p>
      )}
      <div className="dispatch-planning-grid">
        <div>
          <Panel title="Trip setup">
            <fieldset disabled={locked}>
              <div className="dispatch-filters">
                <label>
                  Plan date
                  <input
                    type="date"
                    value={plan.date}
                    onChange={(e) => {
                      if (e.target.value) edit({ date: e.target.value });
                    }}
                  />
                </label>
                <label>
                  Planning depot
                  <select
                    aria-label="Planning depot"
                    value={plan.depotId}
                    onChange={(e) =>
                      edit({ depotId: e.target.value, vehicleId: "" })
                    }
                  >
                    <option value="">Choose a depot</option>
                    {depots.map((d) => (
                      <option value={d.id} key={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Departure time
                  <input
                    type="time"
                    value={plan.plannedDeparture}
                    onChange={(e) => edit({ plannedDeparture: e.target.value })}
                  />
                </label>
              </div>
              <label>
                Vehicle
                <select
                  aria-label="Vehicle"
                  value={plan.vehicleId}
                  onChange={(e) => edit({ vehicleId: e.target.value })}
                >
                  <option value="">Choose a vehicle</option>
                  {plan.vehicleId &&
                    !vehicles.data?.some((v) => v.id === plan.vehicleId) && (
                      <option aria-label="Vehicle" value={plan.vehicleId}>
                        {plan.vehicleId} — not in current depot list
                      </option>
                    )}
                  {vehicles.data?.map((v) => (
                    <option value={v.id} key={v.id}>
                      {v.id} · {v.type} · {v.temp} · {numberText(v.weightCapKg)}{" "}
                      kg / {numberText(v.volumeCapM3)} m³
                    </option>
                  ))}
                </select>
              </label>
            </fieldset>
            <ErrorPanel error={vehicles.error} retry={vehicles.refresh} />
            {vehicle && (
              <p className="dispatch-muted">
                {vehicle.availableOnDate ? "Available" : "Unavailable"} ·{" "}
                {vehicle.allocatedTripCountOnDate}/2 trip slots used ·{" "}
                {numberText(vehicle.remainingFuelL)} L remaining this week ·
                Driver {vehicle.driverId ?? "not configured"}
              </p>
            )}
          </Panel>
          <Panel title={`Stop sequence (${plan.orderIds.length})`}>
            <ErrorPanel error={selected.error} retry={selected.refresh} />
            <fieldset disabled={locked}>
              {plan.orderIds.map((id, i) => {
                const o = allSelected.find((o) => o.id === id);
                return (
                  <div className="dispatch-stop" key={id}>
                    <div>
                      <b>
                        {i + 1}. {o?.outletName ?? id}
                      </b>
                      <small className="dispatch-reference">{id}</small>
                      <small>
                        {o?.planningLoad
                          ? `${numberText(o.planningLoad.weightKg)} kg · ${numberText(o.planningLoad.volumeM3)} m³`
                          : editor.allocatedTripId
                            ? "Quantities are recorded in the allocated trip."
                            : "Load preview unavailable; backend validation required"}
                      </small>
                    </div>
                    <div className="dispatch-inline">
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Move stop ${i + 1} up`}
                        disabled={i === 0 || locked}
                        onClick={() =>
                          edit({ orderIds: moveStop(plan.orderIds, i, i - 1) })
                        }
                      >
                        ↑
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Move stop ${i + 1} down`}
                        disabled={i === plan.orderIds.length - 1 || locked}
                        onClick={() =>
                          edit({ orderIds: moveStop(plan.orderIds, i, i + 1) })
                        }
                      >
                        ↓
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        aria-label={`Remove order ${id}`}
                        onClick={() =>
                          edit({
                            orderIds: plan.orderIds.filter((x) => x !== id),
                          })
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                );
              })}
            </fieldset>
            {!plan.orderIds.length && (
              <EmptyState title="Add orders to this trip">
                Their order here determines the delivery sequence.
              </EmptyState>
            )}
          </Panel>
          {!editor.allocatedTripId && (
            <Panel title="Available orders">
              <label>
                Find an order
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Order ID or outlet"
                />
              </label>
              <ReadState
                loading={orders.loading}
                error={orders.error}
                empty={!candidateOrders.length}
                retry={orders.refresh}
              >
                {candidateOrders.map((o) => (
                  <div className="dispatch-action-row" key={o.id}>
                    <div>
                      <b>{o.outletName}</b>
                      <small className="dispatch-reference">{o.id}</small>
                      <small>
                        {o.brand} · {o.temp} ·{" "}
                        {o.planningLoad
                          ? `${numberText(o.planningLoad.weightKg)} kg / ${numberText(o.planningLoad.volumeM3)} m³`
                          : "Preview unavailable"}
                      </small>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      aria-label={`Add order ${o.id}`}
                      disabled={!!busy}
                      onClick={() =>
                        edit({ orderIds: [...plan.orderIds, o.id] })
                      }
                    >
                      Add order
                    </Button>
                  </div>
                ))}
              </ReadState>
            </Panel>
          )}
        </div>
        <div>
          <Panel title="Load & validation">
            <Capacity
              label="Weight"
              total={
                allocated.data?.totalWeightKg ?? (knownLoad ? weight : null)
              }
              capacity={vehicle?.weightCapKg}
              unit="kg"
            />
            <Capacity
              label="Volume"
              total={
                allocated.data?.totalVolumeM3 ?? (knownLoad ? volume : null)
              }
              capacity={vehicle?.volumeCapM3}
              unit="m³"
            />
            <p className="dispatch-muted">
              Preview uses the authorized next-attempt quantities. Validation
              also checks temperature, access, delivery windows, fuel, calendar
              and existing trips.
            </p>
            <ValidationPanel result={result} />
            <div className="dispatch-inline">
              <Button
                disabled={locked || serverDraft.loading}
                onClick={() => void run("Saving draft", save)}
              >
                {busy === "Saving draft" ? "Saving…" : "Save draft"}
              </Button>
              <Button
                variant="secondary"
                disabled={locked || !saved}
                onClick={() =>
                  void run("Validating", async () => {
                    const response = await api.mutate<ValidatePlanResponse>(
                      "/planning/validate",
                      { plan },
                    );
                    setValidation({ hash, result: response });
                  })
                }
              >
                {busy === "Validating" ? "Validating…" : "Validate plan"}
              </Button>
              <Button
                disabled={locked || !saved || !result?.valid}
                onClick={() =>
                  void run("Allocating", async () => {
                    const response = await api.mutate<AllocatePlanResponse>(
                      "/planning/allocate",
                      {
                        draftId: editor.draft!.id,
                        expectedDraftVersion: editor.draft!.version,
                      },
                    );
                    setEditor((old) => ({
                      ...old,
                      allocatedTripId: response.trip.id,
                      draft: old.draft
                        ? {
                            ...old.draft,
                            allocatedTripId: response.trip.id,
                            version: old.draft.version + 1,
                          }
                        : null,
                    }));
                    drafts.refresh();
                    setNotice(
                      "Allocation saved. Publish the trip when it is ready for Loader.",
                    );
                  })
                }
              >
                {busy === "Allocating" ? "Allocating…" : "Allocate trip"}
              </Button>
            </div>
            <p className="dispatch-muted">
              {editor.allocatedTripId
                ? "This draft has an allocated trip."
                : saved
                  ? "Latest draft saved on server."
                  : "Working copy changed. Save it before validating."}
            </p>
            {editor.draft && (
              <small className="dispatch-reference">
                Draft {editor.draft.id} · version {editor.draft.version}
              </small>
            )}
            <ErrorPanel error={serverDraft.error} retry={serverDraft.refresh} />
          </Panel>
          {editor.allocatedTripId && (
            <Panel title="Allocated trip">
              <ReadState
                loading={allocated.loading}
                error={allocated.error}
                empty={false}
                retry={allocated.refresh}
              >
                {allocated.data && (
                  <>
                    <div className="dispatch-inline">
                      <b>
                        {allocated.data.vehicleId} · trip{" "}
                        {allocated.data.tripNo}
                      </b>
                      <Badge status={allocated.data.status} />
                    </div>
                    <p>
                      {allocated.data.publishedAt
                        ? "Published to Loader."
                        : "This trip is not visible to Loader until published."}
                    </p>
                    <div className="dispatch-inline">
                      {!allocated.data.publishedAt && (
                        <Button
                          disabled={!!busy}
                          onClick={() =>
                            void run("Publishing", async () => {
                              await api.mutate("/plans/publish", {
                                trips: [
                                  {
                                    tripId: allocated.data!.id,
                                    expectedPlanVersion:
                                      allocated.data!.planVersion,
                                  },
                                ],
                              });
                              allocated.refresh();
                              setNotice("Trip published to the loading team.");
                            })
                          }
                        >
                          {busy === "Publishing"
                            ? "Publishing…"
                            : "Publish trip"}
                        </Button>
                      )}
                      <Link
                        className="dispatch-link"
                        to={`/trips/${allocated.data.id}`}
                      >
                        Open trip →
                      </Link>
                    </div>
                  </>
                )}
              </ReadState>
            </Panel>
          )}
          <Panel
            title="Saved drafts"
            action={
              <Button variant="ghost" size="sm" onClick={drafts.refresh}>
                Refresh drafts
              </Button>
            }
          >
            <ReadState
              loading={drafts.loading}
              error={drafts.error}
              empty={!drafts.data?.length}
              retry={drafts.refresh}
            >
              <div className="dispatch-draft-list">
                {drafts.data
                  ?.slice()
                  .reverse()
                  .map((d) => (
                    <div className="dispatch-action-row" key={d.id}>
                      <div>
                        <b>
                          {d.plan.date} · {d.plan.vehicleId}
                        </b>
                        <small>
                          {d.plan.orderIds.length} stops ·{" "}
                          {d.allocatedTripId ? "Allocated" : "Draft"}
                        </small>
                        <small className="dispatch-reference">{d.id}</small>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={!!busy}
                        onClick={() => setReplace(d)}
                      >
                        Open
                      </Button>
                    </div>
                  ))}
              </div>
            </ReadState>
          </Panel>
        </div>
      </div>
      {replace && (
        <Modal
          title={
            replace === "new" ? "Start a new plan?" : "Open this saved draft?"
          }
          onClose={() => setReplace(null)}
        >
          <p>
            Your current browser working copy will be replaced. Previously saved
            server drafts remain in Saved drafts.
          </p>
          <div className="dispatch-inline">
            <Button onClick={() => adopt(replace)}>Continue</Button>
            <Button variant="secondary" onClick={() => setReplace(null)}>
              Keep current plan
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
function Capacity({
  label,
  total,
  capacity,
  unit,
}: {
  label: string;
  total: number | null;
  capacity?: number;
  unit: string;
}) {
  return (
    <div className="dispatch-capacity">
      <div className="dispatch-inline">
        <b>{label}</b>
        <span>
          {total === null
            ? "Awaiting load data"
            : `${numberText(total)} ${unit}`}
          {capacity !== undefined ? ` / ${numberText(capacity)} ${unit}` : ""}
        </span>
      </div>
      {total !== null && capacity !== undefined && (
        <meter
          aria-label={`${label} capacity`}
          min={0}
          max={Math.max(capacity, total, 1)}
          high={capacity}
          value={total}
        />
      )}{" "}
      {total !== null && capacity !== undefined && total > capacity && (
        <p className="dispatch-error">
          {label} preview exceeds vehicle capacity by{" "}
          {numberText(total - capacity)} {unit}.
        </p>
      )}
    </div>
  );
}
