import type { ForecastDay } from '../types/dispatch';

/** Capacity is shown as the number of orders the available fleet can carry. */
export const forecastDays: ForecastDay[] = [
{
  id: 'tomorrow',
  label: 'Tomorrow',
  date: 'Sun 4 Oct',
  breakdown: [
  { brand: 'Fresh', orders: 18, capacity: 12 },
  { brand: 'Style', orders: 14, capacity: 14 },
  { brand: 'Tech', orders: 10, capacity: 9 }]

},
{
  id: 'mon',
  label: 'Mon 5 Oct',
  date: 'Mon 5 Oct',
  breakdown: [
  { brand: 'Fresh', orders: 15, capacity: 16 },
  { brand: 'Style', orders: 12, capacity: 12 },
  { brand: 'Tech', orders: 9, capacity: 10 }]

},
{
  id: 'tue',
  label: 'Tue 6 Oct',
  date: 'Tue 6 Oct',
  breakdown: [
  { brand: 'Fresh', orders: 17, capacity: 15 },
  { brand: 'Style', orders: 13, capacity: 13 },
  { brand: 'Tech', orders: 10, capacity: 9 }]

}];