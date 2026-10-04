import type { Order, OrderStatus, TimelineStep } from '../types/orders';
import { formatDate } from './format';
import { formatTime24, toMinutes } from './time';

export const TIMELINE_STEPS: {key: TimelineStep;label: string;}[] = [
{ key: 'placed', label: 'Placed' },
{ key: 'confirmed', label: 'Confirmed' },
{ key: 'planned', label: 'Planned' },
{ key: 'loading', label: 'Loading' },
{ key: 'in_transit', label: 'In Transit' },
{ key: 'delivered', label: 'Delivered' },
{ key: 'receipt_confirmed', label: 'Receipt Confirmed' }];


export function statusRank(status: OrderStatus): number {
  if (status === 'deferred') return 1.5;
  return TIMELINE_STEPS.findIndex((s) => s.key === status);
}

export function totalQuantity(items: {qty: number;}[]): number {
  return items.reduce((sum, i) => sum + i.qty, 0);
}

export function nextOrderId(orders: Order[]): string {
  const max = Math.max(...orders.map((o) => Number(o.id.replace('ORD', ''))));
  return `ORD${String(max + 1).padStart(7, '0')}`;
}

export function orderAction(order: Order): {label: string;to: string;} | null {
  if (order.deliveryId && !order.receiptConfirmed) return { label: 'Confirm receipt', to: `/orders/${order.id}/receipt` };
  if (order.status === 'deferred') return { label: 'View notice', to: `/orders/${order.id}/deferral` };
  if (order.status === 'in_transit') return { label: 'Track', to: `/orders/${order.id}` };
  return null;
}

export function arrivalLabel(order: Order): string {
  if (order.status === 'deferred' && order.deferral) return `Moved to ${formatDate(order.deferral.newDate)}`;
  if ((order.status === 'delivered' || order.status === 'receipt_confirmed') && order.deliveredAt) {
    return `Arrived ${formatTime24(order.deliveredAt)}`;
  }
  if (order.eta) return formatTime24(order.eta);
  return 'Pending plan';
}

export function arrivalSortValue(order: Order): number {
  const time = order.deliveredAt ?? order.eta;
  const date = order.deferral?.newDate ?? order.requestedDate;
  const day = Number(date.replace(/-/g, ''));
  return day * 10000 + (time ? toMinutes(time) : 9999);
}