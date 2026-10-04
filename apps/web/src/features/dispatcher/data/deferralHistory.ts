import type { DeferralHistoryEntry } from '../types/dispatch';

export const deferralHistory: DeferralHistoryEntry[] = [
{ orderId: 'ORD-1032', originalDate: 'Oct 4', reason: 'No refrigerated vehicle', deferredDate: 'Oct 3', newDate: 'Oct 5', status: 'Rescheduled' },
{ orderId: 'ORD-1019', originalDate: 'Oct 3', reason: 'Freezer trucks full', deferredDate: 'Oct 3', newDate: 'Oct 4', status: 'Rescheduled' },
{ orderId: 'ORD-1021', originalDate: 'Oct 3', reason: 'No van could arrive by 7:00 AM', deferredDate: 'Oct 3', newDate: 'Oct 5', status: 'Rescheduled' },
{ orderId: 'ORD-0988', originalDate: 'Sep 30', reason: 'Insufficient capacity', deferredDate: 'Sep 30', newDate: 'Oct 1', status: 'Delivered' },
{ orderId: 'ORD-0971', originalDate: 'Sep 29', reason: 'Delivery window conflict', deferredDate: 'Sep 29', newDate: 'Sep 30', status: 'Delivered' },
{ orderId: 'ORD-0964', originalDate: 'Sep 28', reason: 'No vehicle available', deferredDate: 'Sep 28', newDate: 'Sep 29', status: 'Deferred again' }];