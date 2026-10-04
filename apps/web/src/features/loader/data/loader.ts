import type { LoadOrder, LoadQueueItem, LoadStop } from '../types/loader';

export const LOADER_DEPOT = 'Peliyagoda';
export const LOADER_CURRENT_TIME = '4:06 AM';
export const LOADER_CURRENT_DATE = 'Tuesday, September 29';

export const LOADER_OPERATOR = {
  name: 'Kasun Fernando',
  role: 'Loader',
  email: 'kasun.fernando@waypoint.lk',
  phone: '+94 77 482 1910'
};

export const LOADING_ISSUE_SCENARIO = {
  vehicleId: 'VEH014',
  trip: 'Trip 1',
  orderId: 'ORD1002',
  outletId: 'OUT014',
  outletName: 'Waypoint Fresh',
  itemName: 'Milk crates',
  expected: 20,
  loaded: 18,
  shortfall: 2
};

export const LOAD_AUDIT_TRAIL = [
{ time: '4:08 AM', title: 'Loading started', detail: undefined, tone: 'default' as const },
{ time: '4:19 AM', title: '2 milk crates reported missing', detail: 'ORD1002', tone: 'warning' as const },
{ time: '4:23 AM', title: 'Shortfall acknowledged', detail: 'Decision received — proceed with recorded shortfall', tone: 'default' as const },
{ time: '4:31 AM', title: 'Loading completed', detail: undefined, tone: 'default' as const },
{ time: '4:32 AM', title: 'Ready to depart', detail: undefined, tone: 'default' as const }];


export const VEHICLE_LOAD = {
  vehicleId: 'VEH014',
  type: 'Refrigerated truck / Reefer',
  trip: 'Trip 1',
  brand: 'Waypoint Fresh',
  departure: '4:40 AM',
  stops: 4
};

export const LOAD_QUEUE: LoadQueueItem[] = [
{ vehicleId: 'VEH014', trip: 'Trip 1', brand: 'Waypoint Fresh', departure: '4:40 AM', stops: 4, status: 'ready', priority: 'High', priorityReason: 'Next departure at the dock', vehicleType: 'Truck', temperature: 'Reefer', district: 'Gampaha', orderCount: 6, loadedWeightKg: 1250, weightCapacityKg: 2500, loadedVolumeM3: 5.3, volumeCapacityM3: 12 },
{ vehicleId: 'VEH022', trip: 'Trip 2', brand: 'Waypoint Fresh', departure: '4:55 AM', stops: 5, status: 'in_progress', priority: 'Standard', vehicleType: 'Truck', temperature: 'Reefer', district: 'Colombo', orderCount: 7, loadedWeightKg: 1480, weightCapacityKg: 2500, loadedVolumeM3: 6.8, volumeCapacityM3: 12 },
{ vehicleId: 'VEH031', trip: 'Trip 1', brand: 'Waypoint Fresh', departure: '5:10 AM', stops: 4, status: 'plan_updated', priority: 'High', priorityReason: 'Dispatcher change must be reviewed', vehicleType: 'Truck', temperature: 'Reefer', district: 'Gampaha', orderCount: 6, loadedWeightKg: 1310, weightCapacityKg: 2500, loadedVolumeM3: 5.9, volumeCapacityM3: 12, updateMessage: 'Stop sequence changed 2 min ago.' },
{ vehicleId: 'VEH018', trip: 'Trip 3', brand: 'Waypoint Fresh', departure: '5:25 AM', stops: 4, status: 'waiting', priority: 'Standard', vehicleType: 'Van', temperature: 'Reefer', district: 'Colombo', orderCount: 4, loadedWeightKg: 0, weightCapacityKg: 1200, loadedVolumeM3: 0, volumeCapacityM3: 6 },
{ vehicleId: 'VEH009', trip: 'Trip 1', brand: 'Waypoint Fresh', departure: '4:15 AM', stops: 4, status: 'completed', priority: 'Standard', vehicleType: 'Truck', temperature: 'Ambient', district: 'Colombo', orderCount: 5, loadedWeightKg: 1920, weightCapacityKg: 3000, loadedVolumeM3: 8.4, volumeCapacityM3: 14 }];


export const LOAD_ORDERS: LoadOrder[] = [
{
  id: 'ORD1001',
  outletId: 'OUT014',
  outletName: 'Waypoint Fresh',
  location: 'Gampaha',
  stop: 1,
  weightKg: 800,
  volumeM3: 3.5,
  items: [
  { id: 'rice', name: 'Rice cartons', expected: 20, loaded: 20, unit: 'cartons', condition: 'ambient' },
  { id: 'flour', name: 'Flour cartons', expected: 15, loaded: 15, unit: 'cartons', condition: 'ambient' },
  { id: 'canned', name: 'Canned goods', expected: 10, loaded: 10, unit: 'cartons', condition: 'ambient' }]

},
{
  id: 'ORD1002',
  outletId: 'OUT014',
  outletName: 'Waypoint Fresh',
  location: 'Gampaha',
  stop: 1,
  weightKg: 450,
  volumeM3: 1.8,
  items: [
  { id: 'milk', name: 'Milk crates', expected: 20, loaded: 18, unit: 'crates', condition: 'chilled', maxAvailable: 18 },
  { id: 'yogurt', name: 'Yogurt crates', expected: 10, loaded: 10, unit: 'crates', condition: 'chilled' },
  { id: 'cheese', name: 'Cheese cartons', expected: 5, loaded: 5, unit: 'cartons', condition: 'chilled' }]

},
{
  id: 'ORD1010',
  outletId: 'OUT027',
  outletName: 'Waypoint Fresh',
  location: 'Gampaha',
  stop: 4,
  items: [{ id: 'cream', name: 'Cream crates', expected: 18, loaded: 18, unit: 'crates', condition: 'chilled' }]
},
{
  id: 'ORD1016',
  outletId: 'OUT033',
  outletName: 'Waypoint Fresh',
  location: 'Gampaha',
  stop: 2,
  items: [{ id: 'water', name: 'Water cases', expected: 8, loaded: 8, unit: 'cases', condition: 'ambient' }]
},
{
  id: 'ORD1020',
  outletId: 'OUT040',
  outletName: 'Waypoint Fresh',
  location: 'Gampaha',
  stop: 3,
  items: [{ id: 'snacks', name: 'Snack cartons', expected: 7, loaded: 7, unit: 'cartons', condition: 'ambient' }]
},
{
  id: 'ORD1022',
  outletId: 'OUT040',
  outletName: 'Waypoint Fresh',
  location: 'Gampaha',
  stop: 3,
  items: [{ id: 'juice', name: 'Juice cases', expected: 7, loaded: 7, unit: 'cases', condition: 'ambient' }]
}];


export const LOAD_STOPS_ORIGINAL: LoadStop[] = [
{ number: 1, outletId: 'OUT014', outletName: 'Waypoint Fresh', location: 'Gampaha', orderIds: ['ORD1001', 'ORD1002'], conditions: 'Ambient + Chilled' },
{ number: 2, outletId: 'OUT027', outletName: 'Waypoint Fresh', location: 'Gampaha', orderIds: ['ORD1010'], conditions: 'Chilled' },
{ number: 3, outletId: 'OUT033', outletName: 'Waypoint Fresh', location: 'Gampaha', orderIds: ['ORD1016'], conditions: 'Ambient' },
{ number: 4, outletId: 'OUT040', outletName: 'Waypoint Fresh', location: 'Gampaha', orderIds: ['ORD1020', 'ORD1022'], conditions: 'Ambient' }];


export const LOAD_STOPS: LoadStop[] = [
{ number: 1, outletId: 'OUT014', outletName: 'Waypoint Fresh', location: 'Gampaha', orderIds: ['ORD1001', 'ORD1002'], conditions: 'Ambient + Chilled' },
{ number: 2, outletId: 'OUT033', outletName: 'Waypoint Fresh', location: 'Gampaha', orderIds: ['ORD1016'], conditions: 'Ambient' },
{ number: 3, outletId: 'OUT040', outletName: 'Waypoint Fresh', location: 'Gampaha', orderIds: ['ORD1020', 'ORD1022'], conditions: 'Ambient' },
{ number: 4, outletId: 'OUT027', outletName: 'Waypoint Fresh', location: 'Gampaha', orderIds: ['ORD1010'], conditions: 'Chilled' }];