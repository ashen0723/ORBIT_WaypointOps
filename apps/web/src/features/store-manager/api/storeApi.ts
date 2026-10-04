import { apiFetch } from '../../../api/client';
import type { Brand, CatalogItem, NewOrderInput, Order, OrderStatus } from '../types/orders';

import type { CatalogItemView, CreateOrderResponse, DeliveryView, OrderView, ReceiptView } from '@waypoint/contracts';
import { ApiError } from '../../../api/client';
type ApiBrand = 'FRESH' | 'STYLE' | 'TECH';
export interface StoreContext { outletName: string; brand: ApiBrand; scheduledWeekday: number | null; nextDeliveryDate: string | null; cutoffAt: string | null }
type ApiOrder = OrderView & { createdAt?: string; plannedArrivalAt?: string | null };
interface Page<T> { items: T[]; nextCursor: string | null }
async function allPages<T>(path: string, token: string): Promise<T[]> {
  const items: T[] = [];
  let cursor: string | null = null;
  do {
    const page: Page<T> = await apiFetch(`${path}?limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`, { token });
    items.push(...page.items); cursor = page.nextCursor;
  } while (cursor);
  return items;
}
export const fetchStoreContext = (token: string) => apiFetch<StoreContext>('/store/context', { token });

export interface ReceiptQuantityLine {
  orderLineId: string; acceptedQty: number; damagedQty: number; missingQty: number; note: string | null; photoRefs: string[];
}

/** Mirrors the API's next-run rule for the form preview; the server remains authoritative. */
export function nextDeliveryDateColombo(now = new Date()): string {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Colombo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(now).map(part => [part.type, part.value]));
  const date = new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00.000Z`);
  const next = () => {
    do { date.setUTCDate(date.getUTCDate() + 1); } while (date.getUTCDay() === 0);
  };
  next();
  if (Number(parts.hour) >= 16) next();
  return date.toISOString().slice(0, 10);
}

export function todayColombo(now = new Date()): string {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Colombo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

const brandToUi: Record<ApiBrand, Brand> = { FRESH: 'Fresh', STYLE: 'Style', TECH: 'Tech' };
const statusToUi: Record<OrderView['status'], OrderStatus> = {
  CONFIRMED: 'confirmed', PLANNED: 'planned', LOADING: 'loading', READY: 'loading',
  IN_TRANSIT: 'in_transit', DELIVERED: 'delivered', RECEIVED: 'receipt_confirmed', DEFERRED: 'deferred',
};

const time = (value: string) => new Date(value).toLocaleTimeString('en-GB', { timeZone: 'Asia/Colombo', hour: '2-digit', minute: '2-digit', hour12: false });
export function mapCatalog(items: CatalogItemView[], brand: ApiBrand): CatalogItem[] {
  return items.map(item => ({ id: item.id, name: item.name, brand: brandToUi[brand], type: item.temp === 'AMBIENT' ? 'dry' : 'chilled', unit: item.unit, kg: item.unitWeightKg, m3: item.unitVolumeM3 }));
}
export function mapOrder(order: ApiOrder, deliveries: DeliveryView[] = [], receipts: ReceiptView[] = []): Order {
  const handovers = deliveries.filter(d => d.outcome !== 'FAILED').sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
  // An unconfirmed earlier attempt must remain receiptable during recovery/redelivery.
  const delivery = handovers.find(d => !receipts.some(r => r.deliveryId === d.id)) ?? handovers[0];
  const receipt = receipts.find(r => r.deliveryId === delivery?.id);
  const proof = delivery?.recorded.outcome !== 'FAILED' ? delivery?.recorded.proof : undefined;
  return {
    id: order.id, brand: brandToUi[order.brand], type: order.temp === 'AMBIENT' ? 'dry' : 'chilled',
    status: statusToUi[order.status], requestedDate: order.plannedDate ?? order.requestedDate,
    submittedAt: order.createdAt ? new Date(order.createdAt).toLocaleString('en-LK', { timeZone: 'Asia/Colombo', dateStyle: 'medium', timeStyle: 'short' }) : 'Recorded by dispatch',
    eta: order.plannedArrivalAt ? time(order.plannedArrivalAt) : undefined,
    items: order.lines.map(line => ({ id: line.id, name: line.item, qty: line.requestedQty, unit: line.unit, deliveredQty: delivery?.recorded.lines.find(l => l.orderLineId === line.id)?.deliveredQty })),
    deliveryId: delivery?.id, deliveryVersion: delivery?.version, receiptConfirmed: Boolean(receipt),
    pod: proof ? { receivedBy: proof.recipientName, location: '', photoRef: proof.photoRefs[0], signatureRef: proof.signatureRef } : undefined,
    recoveryPending: order.recoveryPending,
    deliveredAt: delivery ? time(delivery.capturedAt) : undefined,
    events: { ...(order.createdAt ? { placed: time(order.createdAt), confirmed: time(order.createdAt) } : {}), ...(delivery ? { delivered: time(delivery.capturedAt) } : {}), ...(receipt ? { receipt_confirmed: time(receipt.confirmedAt) } : {}) },
    deferral: order.status === 'DEFERRED' && order.deferredToDate ? { originalDate: order.requestedDate, newDate: order.deferredToDate, reason: order.deferReason ?? 'Deferred', detail: order.deferReason ?? '', decidedAt: 'Recorded by dispatch' } : undefined,
  };
}
export async function fetchCatalog(token: string, brand: ApiBrand): Promise<CatalogItem[]> {
  return mapCatalog(await allPages<CatalogItemView>('/catalog', token), brand);
}
export async function fetchOrders(token: string): Promise<Order[]> {
  const orders = await allPages<ApiOrder>('/store/orders', token);
  const result: Order[] = [];
  // Bounded requests avoid flooding the API when loading a large history.
  for (let offset = 0; offset < orders.length; offset += 5) {
    result.push(...await Promise.all(orders.slice(offset, offset + 5).map(async order => {
      if (!order.attemptStopIds.length) return mapOrder(order);
      try {
      const response = await apiFetch<Page<DeliveryView>>(`/orders/${encodeURIComponent(order.id)}/deliveries`, { token });
      const receipts = await Promise.all(response.items.filter(d => d.outcome !== 'FAILED').map(async d => {
        try { return await apiFetch<ReceiptView>(`/deliveries/${encodeURIComponent(d.id)}/receipt`, { token }); }
        catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; }
      }));
      return mapOrder(order, response.items, receipts.filter((r): r is ReceiptView => r !== null));
      } catch (error) {
        if (error instanceof ApiError && [401, 403].includes(error.status)) throw error;
        return { ...mapOrder(order), deliveryError: error instanceof Error ? error.message : 'Delivery details are unavailable. Please retry.' };
      }
    })));
  }
  return result;
}

export async function createOrder(token: string, input: NewOrderInput, catalog: CatalogItem[], clientActionId: string): Promise<Order> {
  const lines = input.items.map(item => {
    const product = catalog.find(entry => entry.name === item.name && entry.brand === input.brand && entry.type === input.type && entry.unit === item.unit);
    if (!product?.id) throw new Error(`Choose a catalogue item for ${item.name}.`);
    return { catalogItemId: product.id, requestedQty: item.qty };
  });
  const saved = await apiFetch<CreateOrderResponse>('/orders', {
    method: 'POST', token,
    body: JSON.stringify({ clientActionId, requestedDate: input.requestedDate, temp: input.type === 'chilled' ? 'CHILLED' : 'AMBIENT', lines }),
  });
  return mapOrder({ ...saved.order, createdAt: saved.receivedAt });
}

export async function confirmReceipt(token: string, deliveryId: string, expectedDeliveryVersion: number, lines: ReceiptQuantityLine[], clientActionId: string): Promise<void> {
  await apiFetch(`/deliveries/${encodeURIComponent(deliveryId)}/confirm`, {
    method: 'POST', token,
    body: JSON.stringify({ clientActionId, expectedDeliveryVersion, lines }),
  });
}
