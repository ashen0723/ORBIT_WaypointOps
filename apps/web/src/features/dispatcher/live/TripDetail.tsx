import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import type {
  DeliveryView,
  DispatcherOrderView,
  DriverIssueView,
  FieldConflictView,
  LoadingView,
  OperatingDateView,
  RecoveryStateView,
  TripStopView,
  TripView,
} from "@waypoint/contracts";
import { useQuery } from "../../../api/useQuery";
import {
  Badge,
  Button,
  DataTable,
  ErrorPanel,
  Modal,
  MutationForm,
  Panel,
  ReadState,
  formNumber,
  formText,
  numberText,
} from "../../../components/shared/ui";
import { EvidenceGallery } from "../../../components/shared/EvidenceGallery";
import { useDispatcher } from "./context";
import { addDays, localTime } from "./api";
import { OrderDetails } from "./OrderDetails";
export function TripDetail() {
  const { tripId = "" } = useParams(),
    { api } = useDispatcher();
  const query = useQuery(
    `trip:${tripId}`,
    (s) => api.get<TripView>(`/trips/${encodeURIComponent(tripId)}`, s),
    15000,
  );
  const trip = query.data;
  const [selected, setSelected] = useState<string | null>(null),
    [release, setRelease] = useState(false);
  return (
    <>
      <div className="dispatch-page-title">
        <div>
          <Link className="dispatch-link" to="/trips">
            ← Trips
          </Link>
          <h1>Trip View</h1>
          <p className="dispatch-reference">{tripId}</p>
        </div>
        <Button variant="secondary" onClick={query.refresh}>
          Refresh trip
        </Button>
      </div>
      <ReadState
        loading={query.loading}
        error={query.error}
        empty={false}
        retry={query.refresh}
      >
        {trip && (
          <>
            <Panel
              title={`${trip.vehicleId} · trip ${trip.tripNo}`}
              action={<Badge status={trip.status} />}
            >
              <dl className="dispatch-facts">
                <div>
                  <dt>Run / depot</dt>
                  <dd>
                    {trip.date} · {trip.depotId}
                  </dd>
                </div>
                <div>
                  <dt>Departure / return</dt>
                  <dd>
                    {localTime(trip.plannedDepartureAt)} /{" "}
                    {localTime(trip.plannedReturnAt)} Colombo
                  </dd>
                </div>
                <div>
                  <dt>Load / route</dt>
                  <dd>
                    {numberText(trip.totalWeightKg)} kg ·{" "}
                    {numberText(trip.totalVolumeM3)} m³ ·{" "}
                    {numberText(trip.estimatedDistanceKm)} km
                  </dd>
                </div>
                <div>
                  <dt>Loader acknowledgment</dt>
                  <dd>
                    {trip.loaderAcknowledgedPlanVersion === trip.planVersion
                      ? "Current plan acknowledged"
                      : "Current plan not yet acknowledged"}{" "}
                    · plan {trip.planVersion}
                  </dd>
                </div>
              </dl>
              {!trip.publishedAt ? (
                <MutationForm
                  key={`publish:${trip.planVersion}`}
                  label="Publish trip"
                  onSubmit={async () => {
                    await api.mutate("/plans/publish", {
                      trips: [
                        {
                          tripId: trip.id,
                          expectedPlanVersion: trip.planVersion,
                        },
                      ],
                    });
                    query.refresh();
                  }}
                />
              ) : (
                <p className="dispatch-success">
                  Published to Loader at {localTime(trip.publishedAt)}.
                </p>
              )}
              {["CONFIRMED", "LOADING", "READY"].includes(trip.status) && (
                <Button variant="ghost" onClick={() => setRelease(true)}>
                  Release allocation
                </Button>
              )}
            </Panel>
            <Panel title="Delivery stops">
              <DataTable
                caption="Trip delivery sequence"
                rows={trip.stops}
                rowKey={(s) => s.id}
                columns={[
                  { key: "sequence", label: "#", render: (s) => s.sequence },
                  {
                    key: "order",
                    label: "Outlet / order",
                    render: (s) => (
                      <>
                        <button
                          className="dispatch-link"
                          onClick={() => setSelected(s.orderId)}
                        >
                          {s.outletId}
                        </button>
                        <small className="dispatch-reference">
                          {s.orderId}
                        </small>
                      </>
                    ),
                  },
                  {
                    key: "arrival",
                    label: "Planned / actual arrival",
                    render: (s) => (
                      <>
                        {localTime(s.plannedArrivalAt)}
                        <small>
                          {s.arrivedAt
                            ? localTime(s.arrivedAt)
                            : "Not recorded"}
                        </small>
                      </>
                    ),
                  },
                  {
                    key: "status",
                    label: "Outcome",
                    render: (s) => <Badge status={s.status} />,
                  },
                  {
                    key: "qty",
                    label: "Loaded / handed over / returned",
                    render: (s) =>
                      `${sum(s, "loadedQty")} / ${sum(s, "deliveredQty")} / ${sum(s, "returnedQty")}`,
                  },
                ]}
              />
            </Panel>
            {trip.publishedAt && (
              <LoadingDecisions trip={trip} onChanged={query.refresh} />
            )}
            <DriverIncidents trip={trip} />
            {trip.stops.map((stop) => (
              <StopOperations
                key={`${stop.id}:${trip.version}`}
                stop={stop}
                trip={trip}
                onChanged={query.refresh}
              />
            ))}
            <Conflicts trip={trip} onChanged={query.refresh} />
            {release && (
              <Modal
                title="Release this allocation?"
                onClose={() => setRelease(false)}
              >
                <p>
                  Loader must unload and reconcile all goods first. This
                  restores the authorized unassigned balance and releases
                  reserved fuel.
                </p>
                <MutationForm
                  label="Confirm release"
                  onSubmit={async (f) => {
                    await api.mutate(`/trips/${trip.id}/release`, {
                      expectedPlanVersion: trip.planVersion,
                      reason: formText(f, "reason"),
                    });
                    window.location.assign("/dispatcher/trips");
                  }}
                >
                  <label>
                    Release reason
                    <textarea name="reason" required maxLength={500} />
                  </label>
                </MutationForm>
              </Modal>
            )}
          </>
        )}
      </ReadState>
      {selected && (
        <OrderDetails
          id={selected}
          onClose={() => setSelected(null)}
          onChanged={query.refresh}
        />
      )}
    </>
  );
}
const sum = (
  stop: TripStopView,
  key: "loadedQty" | "deliveredQty" | "returnedQty",
) =>
  stop.lines.some((l) => l[key] === null)
    ? "—"
    : stop.lines.reduce((n, l) => n + (l[key] ?? 0), 0);
function LoadingDecisions({
  trip,
  onChanged,
}: {
  trip: TripView;
  onChanged: () => void;
}) {
  const { api } = useDispatcher();
  const loading = useQuery(
    `loading:${trip.id}:${trip.version}`,
    (s) => api.get<LoadingView>(`/trips/${trip.id}/loading`, s),
    15000,
  );
  const [chosen, setChosen] = useState<string | null>(null);
  const issue = loading.data?.issues.find((i) => i.id === chosen);
  return (
    <Panel title="Loading checks & shortfalls">
      <ReadState
        loading={loading.loading}
        error={loading.error}
        empty={false}
        retry={loading.refresh}
      >
        {loading.data && (
          <>
            <p>
              {loading.data.issues.length
                ? "Warehouse exceptions and decisions"
                : "No loading issues reported."}
            </p>
            <DataTable
              caption="Loading checks"
              rows={trip.stops.flatMap((s) =>
                s.lines.map((l) => ({ ...l, orderId: s.orderId })),
              )}
              rowKey={(l) => l.orderLineId}
              columns={[
                {
                  key: "line",
                  label: "Order line",
                  render: (l) => (
                    <>
                      {l.orderId}
                      <small className="dispatch-reference">
                        {l.orderLineId}
                      </small>
                    </>
                  ),
                },
                {
                  key: "expected",
                  label: "Planned",
                  render: (l) => l.plannedQty,
                },
                {
                  key: "cancelled",
                  label: "Cancelled",
                  render: (l) => l.cancelledQty,
                },
                {
                  key: "loaded",
                  label: "Loaded",
                  render: (l) => l.loadedQty ?? "Unchecked",
                },
              ]}
            />
            {loading.data.issues.map((i) => (
              <div className="dispatch-attempt" key={i.id}>
                <div className="dispatch-inline">
                  <Badge status={i.status} />
                  <b>
                    {i.type} · {i.availableQty}/{i.expectedQty} available
                  </b>
                </div>
                {i.decision && (
                  <p>
                    {i.decision.action.replace(/_/g, " ")}: {i.decision.reason}
                  </p>
                )}
                <small>
                  Cancelled {i.cancelledQty} ·{" "}
                  {i.acknowledgedAt
                    ? "Loader acknowledged"
                    : "Loader acknowledgment pending"}
                </small>
                {i.status === "OPEN" &&
                  ["CONFIRMED", "LOADING", "READY"].includes(trip.status) && (
                    <Button size="sm" onClick={() => setChosen(i.id)}>
                      Review shortfall
                    </Button>
                  )}
              </div>
            ))}
          </>
        )}
      </ReadState>
      {issue && (
        <Modal
          title="Loading shortfall decision"
          onClose={() => setChosen(null)}
        >
          <p>
            {issue.availableQty} available out of {issue.expectedQty}.
            Ship-short cancellation will never be retried as delivery recovery.
          </p>
          <MutationForm
            label="Save shortfall decision"
            onSubmit={async (f) => {
              const action = formText(f, "action");
              await api.mutate(`/loading/issues/${issue.id}/decision`, {
                expectedVersion: issue.version,
                expectedPlanVersion: trip.planVersion,
                decision: {
                  action,
                  reason: formText(f, "reason"),
                  ...(action === "SHIP_SHORT"
                    ? { approvedLoadedQty: formNumber(f, "qty") }
                    : {}),
                },
              });
              setChosen(null);
              loading.refresh();
              onChanged();
            }}
          >
            <label>
              Decision
              <select name="action">
                <option value="REPLACEMENT_REQUIRED">Load replacements</option>
                <option value="SHIP_SHORT">
                  Cancel unavailable quantity and ship short
                </option>
              </select>
            </label>
            <label>
              Approved loaded quantity
              <input
                type="number"
                name="qty"
                min={0}
                max={issue.availableQty}
                defaultValue={issue.availableQty}
                required
              />
            </label>
            <label>
              Reason
              <textarea name="reason" required maxLength={500} />
            </label>
          </MutationForm>
        </Modal>
      )}
    </Panel>
  );
}
function DriverIncidents({ trip }: { trip: TripView }) {
  const { api } = useDispatcher();
  const incidents = useQuery(
    `incidents:${trip.id}`,
    (s) => api.all<DriverIssueView>(`/trips/${trip.id}/issues`, {}, s),
    15000,
  );
  return (
    <Panel title="Driver reports">
      <ReadState
        loading={incidents.loading}
        error={incidents.error}
        empty={!incidents.data?.length}
        retry={incidents.refresh}
      >
        {incidents.data?.map((i) => (
          <div className="dispatch-attempt" key={i.id}>
            <Badge status={i.type} />
            <p>{i.note}</p>
            <small>Captured {new Date(i.capturedAt).toLocaleString()}</small>
            <EvidenceGallery ids={i.photoRefs} />
          </div>
        ))}
      </ReadState>
    </Panel>
  );
}
function StopOperations({
  trip,
  stop,
  onChanged,
}: {
  trip: TripView;
  stop: TripStopView;
  onChanged: () => void;
}) {
  const { api } = useDispatcher();
  const order = useQuery(`stop-order:${stop.id}:${trip.version}`, (s) =>
    api.get<DispatcherOrderView>(`/orders/${stop.orderId}`, s),
  );
  const deliveries = useQuery(
    `stop-deliveries:${stop.id}:${trip.version}`,
    (s) => api.all<DeliveryView>(`/orders/${stop.orderId}/deliveries`, {}, s),
    15000,
  );
  const [reschedule, setReschedule] = useState(false);
  const from = addDays(trip.date, 1);
  const dates = useQuery(`reschedule-dates:${stop.outletId}:${from}`, (s) =>
    api.all<OperatingDateView>(
      "/planning/calendar",
      { from, to: addDays(from, 180), outletId: stop.outletId },
      s,
    ),
  );
  const delivery = deliveries.data?.find((d) => d.stopId === stop.id);
  return (
    <Panel
      title={`Stop ${stop.sequence} · ${order.data?.outletName ?? stop.outletId}`}
    >
      <ErrorPanel error={order.error} retry={order.refresh} />
      <ErrorPanel error={deliveries.error} retry={deliveries.refresh} />
      {stop.reschedule && (
        <p className="dispatch-validation">
          Reschedule requested for {stop.reschedule.nextDate}:{" "}
          {stop.reschedule.reason}.{" "}
          {stop.reschedule.acknowledgedAt
            ? "Goods returned and acknowledged."
            : "Waiting for Driver to reconcile returned goods."}
        </p>
      )}
      {trip.status === "IN_TRANSIT" &&
        ["PLANNED", "ARRIVED"].includes(stop.status) &&
        !stop.reschedule && (
          <Button variant="secondary" onClick={() => setReschedule(true)}>
            Reschedule stop
          </Button>
        )}
      {delivery ? (
        <DeliveryDecision
          delivery={delivery}
          order={order.data}
          trip={trip}
          onChanged={() => {
            deliveries.refresh();
            order.refresh();
            onChanged();
          }}
        />
      ) : (
        <p className="dispatch-muted">
          No delivery outcome recorded for this attempt.
        </p>
      )}
      {reschedule && (
        <Modal
          title="Request return and reschedule"
          onClose={() => setReschedule(false)}
        >
          <p>
            The current assignment stays active until the Driver reconciles the
            goods. Captured delivery facts require review.
          </p>
          <ErrorPanel error={dates.error} retry={dates.refresh} />
          <MutationForm
            label="Request reschedule"
            disabled={dates.loading || !!dates.error || !dates.data?.length}
            onSubmit={async (f) => {
              await api.mutate(`/stops/${stop.id}/reschedule`, {
                expectedPlanVersion: trip.planVersion,
                nextDate: formText(f, "date"),
                reason: formText(f, "reason"),
              });
              setReschedule(false);
              onChanged();
            }}
          >
            <label>
              Next valid date
              <select name="date" required>
                <option value="">Choose a date</option>
                {dates.data?.map((d) => (
                  <option key={d.id}>{d.date}</option>
                ))}
              </select>
            </label>
            <label>
              Reason
              <textarea name="reason" required maxLength={500} />
            </label>
          </MutationForm>
        </Modal>
      )}
    </Panel>
  );
}
function DeliveryDecision({
  delivery: d,
  order,
  trip,
  onChanged,
}: {
  delivery: DeliveryView;
  order?: DispatcherOrderView;
  trip: TripView;
  onChanged: () => void;
}) {
  const { api } = useDispatcher();
  const recovery = useQuery(`recovery:${d.id}:${d.version}`, (s) =>
    api.get<RecoveryStateView>(`/deliveries/${d.id}/recovery`, s),
  );
  const [action, setAction] = useState("CLOSE_WITHOUT_REDELIVERY");
  const from = addDays(trip.date, 1);
  const dates = useQuery(`retry-dates:${order?.outletId}:${from}`, (s) =>
    order
      ? api.all<OperatingDateView>(
          "/planning/calendar",
          { from, to: addDays(from, 180), outletId: order.outletId },
          s,
        )
      : Promise.resolve([]),
  );
  const photos =
    d.recorded.outcome === "FAILED"
      ? d.recorded.photoRefs
      : [
          ...d.recorded.proof.photoRefs,
          ...(d.recorded.proof.signatureRef
            ? [d.recorded.proof.signatureRef]
            : []),
        ];
  const lines = recovery.data?.lines.filter((l) => l.qty > 0) ?? [];
  return (
    <>
      <div className="dispatch-inline">
        <Badge status={d.outcome} />
        {d.requiresDispatcherReview && <Badge status="REVIEW_REQUIRED" />}
      </div>
      {"reason" in d.recorded && <p>{d.recorded.reason}</p>}
      <EvidenceGallery ids={photos} />
      <p>
        {d.recorded.lines.reduce((n, l) => n + l.deliveredQty, 0)} handed over /{" "}
        {d.recorded.lines.reduce((n, l) => n + l.returnedQty, 0)} returned
      </p>
      {d.requiresDispatcherReview && (
        <MutationForm
          label="Confirm evidence review"
          onSubmit={async (f) => {
            await api.mutate(`/deliveries/${d.id}/review`, {
              expectedVersion: d.version,
              reason: formText(f, "reviewReason"),
            });
            onChanged();
          }}
        >
          <label>
            Review findings
            <textarea name="reviewReason" required maxLength={500} />
          </label>
        </MutationForm>
      )}
      <ErrorPanel error={recovery.error} retry={recovery.refresh} />
      {lines.length > 0 && (
        <>
          <h3 className="dispatch-section-title">
            Outstanding recovery quantities
          </h3>
          <MutationForm
            label="Save recovery decision"
            disabled={
              action === "REDELIVER" &&
              (dates.loading || !!dates.error || !dates.data?.length)
            }
            onSubmit={async (f) => {
              const decided = lines
                .map((l) => ({
                  orderLineId: l.orderLineId,
                  qty: formNumber(f, l.orderLineId),
                }))
                .filter((l) => l.qty > 0);
              if (!decided.length)
                throw new Error("Choose at least one outstanding unit.");
              await api.mutate(`/deliveries/${d.id}/recovery`, {
                expectedVersion: recovery.data!.version,
                decision: {
                  action,
                  reason: formText(f, "reason"),
                  lines: decided,
                  ...(action === "REDELIVER"
                    ? { nextDate: formText(f, "date") }
                    : {}),
                },
              });
              recovery.refresh();
              onChanged();
            }}
          >
            <label>
              Recovery action
              <select
                value={action}
                onChange={(e) => setAction(e.target.value)}
              >
                <option value="CLOSE_WITHOUT_REDELIVERY">
                  Close without redelivery
                </option>
                <option value="REDELIVER">
                  Authorize another delivery attempt
                </option>
              </select>
            </label>
            {lines.map((l) => (
              <label key={l.orderLineId}>
                {order?.lines.find((o) => o.id === l.orderLineId)?.item ??
                  l.orderLineId}{" "}
                — {l.qty} outstanding
                <input
                  type="number"
                  name={l.orderLineId}
                  min={0}
                  max={l.qty}
                  defaultValue={l.qty}
                  required
                />
              </label>
            ))}
            {action === "REDELIVER" && (
              <>
                <ErrorPanel error={dates.error} retry={dates.refresh} />
                <label>
                  Next valid date
                  <select name="date" required>
                    <option value="">Choose a date</option>
                    {dates.data?.map((d) => (
                      <option key={d.id}>{d.date}</option>
                    ))}
                  </select>
                </label>
              </>
            )}
            <label>
              Decision reason
              <textarea name="reason" required maxLength={500} />
            </label>
          </MutationForm>
        </>
      )}{" "}
      {!!recovery.data?.decisions.length && (
        <>
          <h3 className="dispatch-section-title">Recovery decisions</h3>
          <ol className="dispatch-timeline">
            {recovery.data.decisions.map((r) => (
              <li key={r.id}>
                <b>{r.decision.action.replace(/_/g, " ")}</b>
                <p>{r.decision.reason}</p>
                <small>
                  {r.decision.lines.reduce((n, l) => n + l.qty, 0)} units ·{" "}
                  {new Date(r.decidedAt).toLocaleString()}
                </small>
              </li>
            ))}
          </ol>
        </>
      )}
    </>
  );
}
export function Conflicts({
  trip,
  onChanged,
}: {
  trip?: TripView;
  onChanged: () => void;
}) {
  const { api } = useDispatcher();
  const conflicts = useQuery(
    `field-conflicts:${trip?.id ?? "all"}`,
    (s) => api.all<FieldConflictView>("/sync/conflicts", {}, s),
    15000,
  );
  const rows = (conflicts.data ?? []).filter(
    (c) =>
      !trip ||
      (c.action.kind === "ISSUE"
        ? c.action.request.tripId === trip.id
        : trip.stops.some(
            (s) => c.action.kind !== "ISSUE" && s.id === c.action.stopId,
          )),
  );
  const [chosen, setChosen] = useState<string | null>(null);
  const current = rows.find((c) => c.id === chosen);
  return (
    <Panel title="Offline facts needing reconciliation">
      <ReadState
        loading={conflicts.loading}
        error={conflicts.error}
        empty={!rows.length}
        retry={conflicts.refresh}
      >
        {rows.map((c) => (
          <div className="dispatch-action-row" key={c.id}>
            <div>
              <Badge status="CONFLICT" />
              <b> {c.action.kind}</b>
              <small>
                Captured{" "}
                {new Date(c.action.request.capturedAt).toLocaleString()} ·
                current plan {c.currentPlanVersion}
              </small>
            </div>
            <Button variant="secondary" onClick={() => setChosen(c.id)}>
              Review recorded facts
            </Button>
          </div>
        ))}
      </ReadState>
      {current && (
        <Modal
          title="Reconcile preserved field facts"
          onClose={() => setChosen(null)}
        >
          <p>
            This action was captured against plan{" "}
            {current.action.request.expectedPlanVersion}; current plan was{" "}
            {current.currentPlanVersion}. Accept only after checking the
            recorded facts and evidence.
          </p>
          {current.action.kind === "OUTCOME" && (
            <>
              <Badge status={current.action.request.delivery.outcome} />
              <p>
                {current.action.request.delivery.lines
                  .map(
                    (l) =>
                      `${l.deliveredQty} handed over / ${l.returnedQty} returned`,
                  )
                  .join(", ")}
              </p>
              <EvidenceGallery
                ids={
                  current.action.request.delivery.outcome === "FAILED"
                    ? current.action.request.delivery.photoRefs
                    : [
                        ...current.action.request.delivery.proof.photoRefs,
                        ...(current.action.request.delivery.proof.signatureRef
                          ? [current.action.request.delivery.proof.signatureRef]
                          : []),
                      ]
                }
              />
            </>
          )}
          {current.action.kind === "ISSUE" && (
            <>
              <p>{current.action.request.note}</p>
              <EvidenceGallery ids={current.action.request.photoRefs} />
            </>
          )}
          <MutationForm
            label="Save review decision"
            onSubmit={async (f) => {
              await api.mutate(`/sync/conflicts/${current.id}/resolve`, {
                expectedVersion: current.version,
                resolution: formText(f, "resolution"),
                reason: formText(f, "reason"),
              });
              setChosen(null);
              conflicts.refresh();
              onChanged();
            }}
          >
            <label>
              Decision
              <select name="resolution">
                <option value="RETAIN_FOR_INVESTIGATION">
                  Retain for investigation
                </option>
                <option value="ACCEPT_RECORDED_FACT">
                  Accept recorded facts
                </option>
              </select>
            </label>
            <label>
              Review reason
              <textarea name="reason" required maxLength={500} />
            </label>
          </MutationForm>
        </Modal>
      )}
    </Panel>
  );
}
