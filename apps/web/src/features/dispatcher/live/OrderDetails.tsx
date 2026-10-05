import { useState } from "react";
import { Link } from "react-router-dom";
import type {
  DeferralView,
  DeliveryView,
  DispatcherOrderView,
  OperatingDateView,
  ReceiptView,
} from "@waypoint/contracts";
import { useQuery } from "../../../api/useQuery";
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  ErrorPanel,
  Modal,
  MutationForm,
  ReadState,
  formText,
  numberText,
} from "../../../components/shared/ui";
import { useDispatcher } from "./context";
import { addDays, colomboDate } from "./api";
export function DeferralDialog({
  order,
  onClose,
  onSaved,
}: {
  order: DispatcherOrderView;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { api } = useDispatcher();
  const earliest = [
    addDays(
      order.plannedDate ?? order.deferredToDate ?? order.requestedDate,
      1,
    ),
    colomboDate(),
  ]
    .sort()
    .slice(-1)[0]!;
  const [from, setFrom] = useState(earliest);
  const dates = useQuery(`calendar:${order.outletId}:${from}`, (s) =>
    api.all<OperatingDateView>(
      "/planning/calendar",
      { from, to: addDays(from, 180), outletId: order.outletId },
      s,
    ),
  );
  return (
    <Modal title={`Defer ${order.outletName}`} onClose={onClose}>
      <p>
        Order {order.id}. The current order must be unassigned before it can be
        deferred.
      </p>
      <label>
        Calendar starting
        <input
          type="date"
          min={earliest}
          value={from}
          onChange={(e) => {
            if (e.target.value) setFrom(e.target.value);
          }}
        />
      </label>
      <ErrorPanel error={dates.error} retry={dates.refresh} />
      {dates.loading ? (
        <p role="status">Checking operating dates…</p>
      ) : !dates.data?.length ? (
        <EmptyState title="No eligible dates configured">
          Choose a later calendar range or ask for the operating calendar to be
          configured.
        </EmptyState>
      ) : null}
      <MutationForm
        label="Confirm deferral"
        disabled={
          dates.loading ||
          !!dates.error ||
          !dates.data?.length ||
          !!order.activeTripId
        }
        onSubmit={async (f) => {
          await api.mutate("/planning/defer", {
            orderId: order.id,
            expectedVersion: order.version,
            nextDate: formText(f, "date"),
            reason: formText(f, "reason"),
          });
          onSaved();
          onClose();
        }}
      >
        <label>
          Next valid delivery date
          <select name="date" required key={from}>
            <option value="">Choose a delivery date</option>
            {dates.data?.map((d) => (
              <option key={d.id}>{d.date}</option>
            ))}
          </select>
        </label>
        <label>
          Deferral reason
          <textarea
            name="reason"
            required
            maxLength={500}
            placeholder="Explain why this order needs another run"
          />
        </label>
      </MutationForm>
    </Modal>
  );
}
export function OrderDetails({
  id,
  onClose,
  onChanged,
}: {
  id: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { api } = useDispatcher();
  const order = useQuery(`order:${id}`, (s) =>
    api.get<DispatcherOrderView>(`/orders/${encodeURIComponent(id)}`, s),
  );
  const [defer, setDefer] = useState(false);
  const o = order.data;
  return (
    <Modal title="Order details" onClose={onClose}>
      <ReadState
        loading={order.loading}
        error={order.error}
        empty={false}
        retry={order.refresh}
      >
        {o && (
          <>
            <div className="dispatch-inline">
              <h3>{o.outletName}</h3>
              <Badge status={o.status} />
            </div>
            <p className="dispatch-reference">{o.id}</p>
            <dl className="dispatch-facts">
              <div>
                <dt>Brand / temperature</dt>
                <dd>
                  {o.brand} · {o.temp}
                </dd>
              </div>
              <div>
                <dt>Requested / scheduled</dt>
                <dd>
                  {o.requestedDate} /{" "}
                  {o.plannedDate ?? o.deferredToDate ?? "Not allocated"}
                </dd>
              </div>
              <div>
                <dt>Original load</dt>
                <dd>
                  {numberText(o.weightKg)} kg · {numberText(o.volumeM3)} m³
                </dd>
              </div>
              <div>
                <dt>Authorized next load</dt>
                <dd>
                  {o.planningLoad
                    ? `${numberText(o.planningLoad.weightKg)} kg · ${numberText(o.planningLoad.volumeM3)} m³`
                    : "No unassigned balance"}
                </dd>
              </div>
            </dl>
            <DataTable
              caption="Order quantities"
              rows={o.lines}
              rowKey={(l) => l.id}
              columns={[
                { key: "item", label: "Item", render: (l) => l.item },
                {
                  key: "requested",
                  label: "Requested",
                  render: (l) => l.requestedQty,
                },
                {
                  key: "cancelled",
                  label: "Cancelled",
                  render: (l) => l.cancelledQty,
                },
                {
                  key: "accepted",
                  label: "Accepted",
                  render: (l) => l.deliveredQty,
                },
              ]}
            />
            {o.activeTripId ? (
              <Link
                className="dispatch-link"
                to={`/trips/${o.activeTripId}`}
                onClick={onClose}
              >
                Open assigned trip →
              </Link>
            ) : (
              ["CONFIRMED", "DEFERRED"].includes(o.status) && (
                <Button onClick={() => setDefer(true)}>Defer order</Button>
              )
            )}
            <OrderTimeline order={o} />
            {defer && (
              <DeferralDialog
                order={o}
                onClose={() => setDefer(false)}
                onSaved={() => {
                  order.refresh();
                  onChanged();
                }}
              />
            )}
          </>
        )}
      </ReadState>
    </Modal>
  );
}
export function OrderTimeline({ order }: { order: DispatcherOrderView }) {
  const { api } = useDispatcher();
  const history = useQuery(`deferrals:${order.id}:${order.version}`, (s) =>
    api.all<DeferralView>(`/orders/${order.id}/deferrals`, {}, s),
  );
  const deliveries = useQuery(`deliveries:${order.id}:${order.version}`, (s) =>
    api.all<DeliveryView>(`/orders/${order.id}/deliveries`, {}, s),
  );
  return (
    <>
      <h3 className="dispatch-section-title">Deferral history</h3>
      <ReadState
        loading={history.loading}
        error={history.error}
        empty={!history.data?.length}
        retry={history.refresh}
      >
        <ol className="dispatch-timeline">
          {history.data?.map((d) => (
            <li key={d.id}>
              <b>
                {d.fromDate ?? "Unscheduled"} → {d.toDate}
              </b>
              <p>{d.reason}</p>
              <small>
                {new Date(d.recordedAt).toLocaleString()} · {d.actorId}
              </small>
            </li>
          ))}
        </ol>
      </ReadState>
      <h3 className="dispatch-section-title">Delivery attempts</h3>
      <ReadState
        loading={deliveries.loading}
        error={deliveries.error}
        empty={!deliveries.data?.length}
        retry={deliveries.refresh}
      >
        {deliveries.data?.map((d) => (
          <DeliverySummary key={d.id} delivery={d} />
        ))}
      </ReadState>
    </>
  );
}
function DeliverySummary({ delivery: d }: { delivery: DeliveryView }) {
  const { api } = useDispatcher();
  const receipt = useQuery(`receipt:${d.id}:${d.version}`, async (s) => {
    try {
      return await api.get<ReceiptView>(`/deliveries/${d.id}/receipt`, s);
    } catch (e) {
      if (e && typeof e === "object" && "status" in e && e.status === 404)
        return null;
      throw e;
    }
  });
  return (
    <article className="dispatch-attempt">
      <div className="dispatch-inline">
        <Badge status={d.outcome} />
        {d.requiresDispatcherReview && <Badge status="REVIEW_REQUIRED" />}
        <span>{new Date(d.capturedAt).toLocaleString()}</span>
      </div>
      {"reason" in d.recorded && <p>{d.recorded.reason}</p>}
      <p>
        {d.recorded.lines.reduce((n, l) => n + l.deliveredQty, 0)} handed over ·{" "}
        {d.recorded.lines.reduce((n, l) => n + l.returnedQty, 0)} returned
      </p>
      <ErrorPanel error={receipt.error} retry={receipt.refresh} />
      <p>
        {receipt.loading
          ? "Checking receipt…"
          : receipt.data
            ? `Receipt: ${receipt.data.status.replace(/_/g, " ").toLowerCase()}`
            : d.outcome === "FAILED"
              ? "No receipt: no handover"
              : "Awaiting Store receipt"}
      </p>
      {receipt.data?.lines
        .filter((l) => l.damagedQty > 0 || l.missingQty > 0)
        .map((l) => (
          <p key={l.orderLineId} role="note">
            Store reported {l.damagedQty} damaged · {l.missingQty} missing
            {l.note ? ` — “${l.note}”` : ""}
          </p>
        ))}
    </article>
  );
}
