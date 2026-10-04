import type { Trip } from '../types/dispatch';

export const trips: Trip[] = [
{
  id: 'TRP-001',
  number: 1,
  vehicleId: 'TRK-018',
  depot: 'Peliyagoda',
  driver: 'Kasun Perera',
  departAt: '05:00',
  departedAt: '05:05',
  status: 'on_road',
  load: [
  { orderId: 'ORD-1010', loaded: 22, shortfallRecorded: false },
  { orderId: 'ORD-1011', loaded: 18, shortfallRecorded: false },
  { orderId: 'ORD-1012', loaded: 24, shortfallRecorded: false }],

  stops: [
  { orderId: 'ORD-1010', status: 'delivered', eta: '05:40', deliveredAt: '05:42' },
  { orderId: 'ORD-1011', status: 'delivered', eta: '06:05', deliveredAt: '06:08' },
  { orderId: 'ORD-1012', status: 'pending', eta: '06:45' }]

},
{
  id: 'TRP-004',
  number: 4,
  vehicleId: 'TRK-015',
  depot: 'Peliyagoda',
  driver: 'Ruwan Jayasinghe',
  departAt: '05:15',
  departedAt: '05:20',
  status: 'on_road',
  load: [
  { orderId: 'ORD-1013', loaded: 20, shortfallRecorded: false },
  { orderId: 'ORD-1014', loaded: 22, shortfallRecorded: false },
  { orderId: 'ORD-1015', loaded: 18, shortfallRecorded: false },
  { orderId: 'ORD-1016', loaded: 19, shortfallRecorded: false }],

  stops: [
  { orderId: 'ORD-1013', status: 'delivered', eta: '05:55', deliveredAt: '05:58' },
  { orderId: 'ORD-1014', status: 'delayed', eta: '06:35', delayMin: 40 },
  { orderId: 'ORD-1015', status: 'pending', eta: '07:15' },
  { orderId: 'ORD-1016', status: 'pending', eta: '07:55' }]

},
{
  id: 'TRP-002',
  number: 2,
  vehicleId: 'TRK-030',
  depot: 'Peliyagoda',
  driver: 'Saman Kumara',
  departAt: '07:00',
  status: 'loading',
  load: [
  { orderId: 'ORD-1017', loaded: 20, shortfallRecorded: false },
  { orderId: 'ORD-1018', loaded: 12, shortfallRecorded: false },
  { orderId: 'ORD-1020', loaded: 25, shortfallRecorded: false }],

  stops: [
  { orderId: 'ORD-1017', status: 'pending', eta: '07:40' },
  { orderId: 'ORD-1018', status: 'pending', eta: '08:20' },
  { orderId: 'ORD-1020', status: 'pending', eta: '09:00' }]

},
{
  id: 'TRP-003',
  number: 3,
  vehicleId: 'VAN-012',
  depot: 'Peliyagoda',
  driver: 'Dilshan Wickrama',
  departAt: '07:00',
  status: 'loading',
  load: [
  { orderId: 'ORD-1023', loaded: 18, shortfallRecorded: false },
  { orderId: 'ORD-1009', loaded: 12, shortfallRecorded: false }],

  stops: [
  { orderId: 'ORD-1023', status: 'pending', eta: '07:40' },
  { orderId: 'ORD-1009', status: 'pending', eta: '08:20' }]

}];


export const NEXT_TRIP_NUMBER = 5;