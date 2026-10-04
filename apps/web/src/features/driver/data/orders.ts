import type { Order } from '../types/orders';

export const seedOrders: Order[] = [
{
  id: 'ORD0092308',
  brand: 'Fresh',
  type: 'chilled',
  status: 'delivered',
  requestedDate: '2026-09-28',
  submittedAt: 'Sun 27 Sep, 2:05 PM',
  eta: '07:15',
  deliveredAt: '06:48',
  vehicle: { driver: 'Arjun Mehta', plate: 'WP-2291', vehicleType: 'Reefer van', progress: 1, stopsBefore: 0 },
  pod: { receivedBy: 'K. Thomas (Receiving)', location: 'Rear loading bay · GPS matched outlet' },
  items: [
  { id: 'a1', name: 'Whole milk 2L', qty: 6, unit: 'cases' },
  { id: 'a2', name: 'Greek yogurt 500g', qty: 4, unit: 'cases' },
  { id: 'a3', name: 'Chicken breast 1kg', qty: 3, unit: 'cases' },
  { id: 'a4', name: 'Mixed salad 200g', qty: 5, unit: 'crates' },
  { id: 'a5', name: 'Cheddar block 400g', qty: 2, unit: 'cases' }],

  events: {
    placed: 'Sun 2:05 PM',
    confirmed: 'Sun 2:06 PM',
    planned: 'Sun 7:40 PM',
    loading: '5:10 AM',
    in_transit: '5:45 AM',
    delivered: '6:48 AM'
  }
},
{
  id: 'ORD0092307',
  brand: 'Fresh',
  type: 'dry',
  status: 'receipt_confirmed',
  requestedDate: '2026-09-28',
  submittedAt: 'Sun 27 Sep, 1:58 PM',
  eta: '07:00',
  deliveredAt: '06:52',
  vehicle: { driver: 'Arjun Mehta', plate: 'WP-2291', vehicleType: 'Reefer van', progress: 1, stopsBefore: 0 },
  pod: { receivedBy: 'K. Thomas (Receiving)', location: 'Rear loading bay · GPS matched outlet' },
  items: [
  { id: 'b1', name: 'Sourdough loaf', qty: 8, unit: 'crates' },
  { id: 'b2', name: 'Penne 500g', qty: 6, unit: 'cases' },
  { id: 'b3', name: 'Chopped tomatoes 400g', qty: 10, unit: 'cases' }],

  events: {
    placed: 'Sun 1:58 PM',
    confirmed: 'Sun 1:59 PM',
    planned: 'Sun 7:40 PM',
    loading: '5:10 AM',
    in_transit: '5:45 AM',
    delivered: '6:52 AM',
    receipt_confirmed: '7:20 AM'
  }
},
{
  id: 'ORD0092315',
  brand: 'Tech',
  type: 'dry',
  status: 'in_transit',
  requestedDate: '2026-09-28',
  submittedAt: 'Fri 25 Sep, 11:20 AM',
  eta: '15:10',
  vehicle: { driver: 'Daniel Okafor', plate: 'WP-4127', vehicleType: 'Box truck', progress: 0.58, stopsBefore: 2 },
  items: [
  { id: 'c1', name: 'Microwave 20L', qty: 4, unit: 'units' },
  { id: 'c2', name: 'Air fryer 4L', qty: 6, unit: 'units' },
  { id: 'c3', name: 'Electric kettle 1.7L', qty: 10, unit: 'units' }],

  events: {
    placed: 'Fri 11:20 AM',
    confirmed: 'Fri 11:24 AM',
    planned: 'Sun 6:15 PM',
    loading: '11:05 AM',
    in_transit: '12:30 PM'
  }
},
{
  id: 'ORD0092296',
  brand: 'Style',
  type: 'dry',
  status: 'deferred',
  requestedDate: '2026-09-28',
  submittedAt: 'Thu 24 Sep, 3:12 PM',
  items: [
  { id: 'd1', name: 'Cotton tee, assorted', qty: 6, unit: 'cases' },
  { id: 'd2', name: 'Denim jeans, slim', qty: 3, unit: 'cases' },
  { id: 'd3', name: 'Crew socks 3-pack', qty: 4, unit: 'cases' }],

  deferral: {
    originalDate: '2026-09-28',
    newDate: '2026-10-02',
    reason: 'Fleet capacity exceeded due to festival demand',
    detail:
    'Festival-week orders across the North region filled every truck on Monday’s Style run. Rather than split your order across vehicles, it has been moved whole to the next weekly run.',
    decidedAt: 'Sun 27 Sep, 6:40 PM'
  },
  events: { placed: 'Thu 3:12 PM', confirmed: 'Thu 3:15 PM' }
},
{
  id: 'ORD0092322',
  brand: 'Tech',
  type: 'dry',
  status: 'planned',
  requestedDate: '2026-09-30',
  submittedAt: 'Sat 26 Sep, 9:40 AM',
  eta: '10:30',
  items: [
  { id: 'e1', name: 'Steam iron', qty: 8, unit: 'units' },
  { id: 'e2', name: 'Electric kettle 1.7L', qty: 6, unit: 'units' }],

  events: { placed: 'Sat 9:40 AM', confirmed: 'Sat 9:42 AM', planned: '11:15 AM' }
},
{
  id: 'ORD0092324',
  brand: 'Style',
  type: 'dry',
  status: 'confirmed',
  requestedDate: '2026-10-02',
  submittedAt: 'Sun 27 Sep, 4:55 PM',
  items: [
  { id: 'f1', name: 'Canvas tote', qty: 40, unit: 'units' },
  { id: 'f2', name: 'Cotton tee, assorted', qty: 4, unit: 'cases' }],

  events: { placed: 'Sun 4:55 PM', confirmed: 'Sun 5:02 PM' }
},
{
  id: 'ORD0092325',
  brand: 'Tech',
  type: 'dry',
  status: 'placed',
  requestedDate: '2026-09-30',
  submittedAt: 'Today, 10:12 AM',
  items: [{ id: 'g1', name: 'Air fryer 4L', qty: 4, unit: 'units' }],
  events: { placed: '10:12 AM' }
},
{
  id: 'ORD0092291',
  brand: 'Fresh',
  type: 'dry',
  status: 'receipt_confirmed',
  requestedDate: '2026-09-26',
  submittedAt: 'Fri 25 Sep, 1:30 PM',
  eta: '07:05',
  deliveredAt: '06:58',
  items: [
  { id: 'h1', name: 'Basmati rice 5kg', qty: 4, unit: 'cases' },
  { id: 'h2', name: 'Olive oil 1L', qty: 3, unit: 'cases' }]

},
{
  id: 'ORD0092290',
  brand: 'Fresh',
  type: 'chilled',
  status: 'receipt_confirmed',
  requestedDate: '2026-09-26',
  submittedAt: 'Fri 25 Sep, 1:26 PM',
  eta: '07:10',
  deliveredAt: '07:02',
  items: [
  { id: 'i1', name: 'Whole milk 2L', qty: 5, unit: 'cases' },
  { id: 'i2', name: 'Frozen peas 1kg', qty: 2, unit: 'cases' }]

},
{
  id: 'ORD0092288',
  brand: 'Style',
  type: 'dry',
  status: 'receipt_confirmed',
  requestedDate: '2026-09-25',
  submittedAt: 'Mon 21 Sep, 2:44 PM',
  eta: '09:30',
  deliveredAt: '09:12',
  items: [{ id: 'j1', name: 'Denim jeans, slim', qty: 5, unit: 'cases' }]
}];