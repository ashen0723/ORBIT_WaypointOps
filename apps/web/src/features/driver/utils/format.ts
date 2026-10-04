import { format, parseISO } from 'date-fns';
import { TODAY } from '../data/schedule';

export function formatDate(iso: string): string {
  return format(parseISO(iso), 'EEE, d MMM');
}

export function formatDateLong(iso: string): string {
  return format(parseISO(iso), 'EEEE, d MMMM yyyy');
}

export function relativeDay(iso: string): string {
  if (iso === TODAY) return 'Today';
  return formatDate(iso);
}