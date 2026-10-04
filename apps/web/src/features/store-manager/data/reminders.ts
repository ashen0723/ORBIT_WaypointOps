import type { Brand } from '../types/orders';

export type ReminderPriority = 'high' | 'medium' | 'low';

export interface OrderReminder {
  id: string;
  brand: Brand;
  title: string;
  deadline: string;
  priority: ReminderPriority;
  /** Tied to today's live cutoff countdown */
  usesTodayCutoff?: boolean;
}

export const reminders: OrderReminder[] = [
{ id: 'rem-fresh', brand: 'Fresh', title: 'Fresh order for Tue, 29 Sep', deadline: 'Today 4:00 PM', priority: 'high', usesTodayCutoff: true },
{ id: 'rem-tech', brand: 'Tech', title: 'Tech restock for Wed, 30 Sep', deadline: 'Tue 4:00 PM', priority: 'medium' },
{ id: 'rem-style', brand: 'Style', title: 'Style weekly for Fri, 2 Oct', deadline: 'Wed 4:00 PM', priority: 'low' }];