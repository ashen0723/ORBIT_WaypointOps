import type { Order } from '../types/dispatch';
import { REPEAT_DEFERRAL_THRESHOLD } from '../data/rules';
import { toMin } from './time';

/**
 * Transparent planning priority, shown to the dispatcher:
 *  1. Orders deferred more often come first (they have already waited).
 *  2. Fresh before Style/Tech (Fresh has a hard morning deadline).
 *  3. Older requested date first.
 *  4. Earlier window close first.
 */
export const PRIORITY_POLICY = ['Most-deferred first', 'Fresh before Style & Tech', 'Oldest requested date', 'Earliest window close'];

export function comparePriority(a: Order, b: Order): number {
  return (
    b.deferralCount - a.deferralCount ||
    Number(b.brand === 'Fresh') - Number(a.brand === 'Fresh') ||
    a.requestedDate.localeCompare(b.requestedDate) ||
    toMin(a.windowEnd) - toMin(b.windowEnd) ||
    a.id.localeCompare(b.id));

}

export function priorityReason(o: Order): string | null {
  if (o.deferralCount >= REPEAT_DEFERRAL_THRESHOLD) return `Deferred ${o.deferralCount}×`;
  if (o.deferralCount > 0) return 'Deferred once';
  return null;
}