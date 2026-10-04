import { apiFetch } from '../../../api/client';
import type { Brand, CatalogItem, NewOrderInput, Order, OrderStatus } from '../types/orders';

type ApiBrand = 'FRESH' | 'STYLE' | 'TECH';
type ApiTemp = 'AMBIENT' | 'CHILLED' | 'FROZEN';
type ApiStatus = 'CONFIRMED' | 'PLANNED' | 'LOADING' | 'READY' | 'IN_TRANSIT' | 'DELIVERED' | 'RECEIVED' | 'DEFERRED';

interface ApiCatalogItem { id: string; name: string; brand: ApiBrand; temp: ApiTemp; unit: string; weightKg: number; volumeM3: number }
interface ApiAttemptLine { orderLineId: string; deliveredQty: number | null }
interface ApiDelivery { id: string; version: number; outcome: string; completedAt: string | null; pod: { recipientName: string | null; signatureRef: string | null; photoRef: string | null } | null; receipt: { confirmedAt: string | null } | null }
interface ApiStop { id: string; lines?: ApiAttemptLine[]; delivery: ApiDelivery | null }
interface ApiOrderLine { id: string; item: string; unit: string; requestedQty: number; cancelledQty: number; deliveredQty: number }
interface ApiOrder {
  id: string; brand: ApiBrand; temp: ApiTemp; status: ApiStatus; requestedDate: string; createdAt: string;
  lines: ApiOrderLine[]; attempts?: ApiStop[]; deferredToDate: string | null; deferReason: string | null;
  recoveryPending: boolean;
}

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
const statusToUi: Record<ApiStatus, OrderStatus> = {
  CONFIRMED: 'confirmed', PLANNED: 'planned', LOADING: 'loading', READY: 'loading',
  IN_TRANSIT: 'in_transit', DELIVERED: 'delivered', RECEIVED: 'receipt_confirmed', DEFERRED: 'deferred',
};

export function mapCatalog(items: ApiCatalogItem[]): CatalogItem[] {
  return items.map(item => ({ id: item.id, name: item.name, brand: brandToUi[item.brand], type: item.temp === 'AMBIENT' ? 'dry' : 'chilled', unit: item.unit as CatalogItem['unit'], kg: item.weightKg, m3: item.volumeM3 }));
}

export function mapOrder(order: ApiOrder): Order {
  const latest = [...(order.attempts ?? [])].reverse().find(stop => stop.delivery?.outcome === 'DELIVERED' || stop.delivery?.outcome === 'PARTIAL');
  const delivery = latest?.delivery;
  const handedOver = new Map((latest?.lines ?? []).map(line => [line.orderLineId, line.deliveredQty ?? 0]));
  return {
    id: order.id, brand: brandToUi[order.brand], type: order.temp === 'AMBIENT' ? 'dry' : 'chilled',
    status: statusToUi[order.status], requestedDate: order.requestedDate,
    submittedAt: new Date(order.createdAt).toLocaleString('en-LK', { timeZone: 'Asia/Colombo', dateStyle: 'medium', timeStyle: 'short' }),
    items: order.lines.map(line => ({ id: line.id, name: line.item, qty: line.requestedQty, unit: line.unit as Order['items'][number]['unit'], deliveredQty: handedOver.get(line.id) })),
    deliveryId: delivery?.id, deliveryVersion: delivery?.version, receiptConfirmed: Boolean(delivery?.receipt?.confirmedAt),
    pod: delivery?.pod ? { receivedBy: delivery.pod.recipientName ?? 'Recipient not recorded', location: '', photoRef: delivery.pod.photoRef, signatureRef: delivery.pod.signatureRef } : undefined,
    recoveryPending: order.recoveryPending,
    deliveredAt: delivery?.completedAt ? new Date(delivery.completedAt).toLocaleTimeString('en-GB', { timeZone: 'Asia/Colombo', hour12: false, hour: '2-digit', minute: '2-digit' }) : undefined,
    deferral: order.status === 'DEFERRED' && order.deferredToDate ? { originalDate: order.requestedDate, newDate: order.deferredToDate, reason: order.deferReason ?? 'Deferred', detail: order.deferReason ?? '', decidedAt: 'See order timeline' } : undefined,
  };
}

export async function fetchCatalog(token: string): Promise<CatalogItem[]> {
  return mapCatalog(await apiFetch<ApiCatalogItem[]>('/catalog', { token }));
}

export async function fetchOrders(token: string): Promise<Order[]> {
  return (await apiFetch<ApiOrder[]>('/store/orders', { token })).map(mapOrder);
}

export async function createOrder(token: string, input: NewOrderInput, catalog: CatalogItem[], clientActionId: string): Promise<Order> {
  const lines = input.items.map(item => {
    const product = catalog.find(entry => entry.name === item.name && entry.brand === input.brand && entry.type === input.type && entry.unit === item.unit);
    if (!product?.id) throw new Error(`Choose a catalogue item for ${item.name}.`);
    return { catalogItemId: product.id, requestedQty: item.qty };
  });
  const saved = await apiFetch<ApiOrder>('/orders', {
    method: 'POST', token,
    body: JSON.stringify({ clientActionId, requestedDate: input.requestedDate, temp: input.type === 'chilled' ? 'CHILLED' : 'AMBIENT', lines }),
  });
  return mapOrder(saved);
}

export async function confirmReceipt(token: string, deliveryId: string, expectedDeliveryVersion: number, lines: ReceiptQuantityLine[], clientActionId: string): Promise<void> {
  await apiFetch(`/deliveries/${encodeURIComponent(deliveryId)}/confirm`, {
    method: 'POST', token,
    body: JSON.stringify({ clientActionId, expectedDeliveryVersion, lines }),
  });
}
