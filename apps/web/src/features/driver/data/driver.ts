import type { DriverTrip } from '../types/driver';

export const DRIVER = {
  name: 'Nuwan Perera',
  email: 'nuwan.perera@waypoint.co',
  avatar: "/58c66d11-4505-4e4e-88a9-0abccd947006.jpg",
  vehicle: 'VEH052',
  vehicleType: 'Refrigerated van',
  depot: 'Kandy depot',
  date: 'Wed 30 Sep 2026'
};

export const TRIPS: DriverTrip[] = [
{
  id: 'trip-1',
  number: 1,
  brand: 'Waypoint Fresh',
  district: 'Kandy district',
  departure: '04:10',
  status: 'Loaded',
  loaderFlag: 'Stop 3 (OUT067): 2 cases yoghurt missing — flagged by Loader, 03:52',
  stops: [
  {
    sequence: 1,
    outletId: 'OUT061',
    name: 'Fresh Peradeniya Rd',
    address: '482 Peradeniya Road, Kandy',
    window: '05:00–07:30',
    eta: '04:35',
    unloading: 'rear dock',
    access: 'normal',
    cases: 18,
    chilledCases: 6,
    contactName: 'R. Jayasinghe',
    contactPhone: '+94771234561',
    accessNote: 'Enter from the service lane and reverse to the marked rear dock.',
    items: [
    { id: '061-chilled', name: 'Chilled dairy', planned: 6, chilled: true },
    { id: '061-dry', name: 'Fresh grocery cases', planned: 12, chilled: false }]

  },
  {
    sequence: 2,
    outletId: 'OUT064',
    name: 'Fresh Katugastota',
    address: '73 Katugastota Road, Kandy',
    window: '05:00–07:45',
    eta: '05:05',
    unloading: 'street',
    access: 'van_only',
    cases: 14,
    chilledCases: 4,
    contactName: 'M. Nazeer',
    contactPhone: '+94771234564',
    accessNote: 'Narrow street access. Stop beside the signed curbside receiving point.',
    items: [
    { id: '064-chilled', name: 'Chilled dairy', planned: 4, chilled: true },
    { id: '064-dry', name: 'Fresh grocery cases', planned: 10, chilled: false }]

  },
  {
    sequence: 3,
    outletId: 'OUT067',
    name: 'Fresh Kandy Town',
    address: '18 Dalada Veediya, Kandy',
    window: '05:30–07:30',
    eta: '05:40',
    unloading: 'rear dock',
    access: 'normal',
    cases: 22,
    chilledCases: 8,
    contactName: 'S. Fernando',
    contactPhone: '+94771234567',
    accessNote: 'Use the rear service road. Ring the receiving bell beside Dock 2.',
    items: [
    { id: '067-yoghurt', name: 'Yoghurt cases', planned: 4, chilled: true },
    { id: '067-milk', name: 'Fresh milk cases', planned: 4, chilled: true },
    { id: '067-produce', name: 'Fresh produce cases', planned: 14, chilled: false }]

  },
  {
    sequence: 4,
    outletId: 'OUT070',
    name: 'Fresh Ampitiya',
    address: '211 Ampitiya Road, Kandy',
    window: '05:00–07:30',
    eta: '06:20',
    unloading: 'street',
    access: 'van_only',
    cases: 10,
    chilledCases: 3,
    contactName: 'P. Weerakoon',
    contactPhone: '+94771234570',
    accessNote: 'Van access only. Unload curbside at the side entrance.',
    items: [
    { id: '070-chilled', name: 'Chilled dairy', planned: 3, chilled: true },
    { id: '070-dry', name: 'Fresh grocery cases', planned: 7, chilled: false }]

  },
  {
    sequence: 5,
    outletId: 'OUT072',
    name: 'Fresh Tennekumbura',
    address: '94 Tennekumbura Road, Kandy',
    window: '06:00–07:45',
    eta: '06:55',
    unloading: 'rear dock',
    access: 'normal',
    cases: 16,
    chilledCases: 5,
    contactName: 'A. Perera',
    contactPhone: '+94771234572',
    accessNote: 'Turn behind the outlet and use the green receiving door.',
    items: [
    { id: '072-chilled', name: 'Chilled dairy', planned: 5, chilled: true },
    { id: '072-dry', name: 'Fresh grocery cases', planned: 11, chilled: false }]

  }]

},
{
  id: 'trip-2',
  number: 2,
  brand: 'Waypoint Style',
  district: 'Kandy district',
  departure: '09:30',
  status: 'Planned',
  stops: [
  {
    sequence: 1,
    outletId: 'OUT098',
    name: 'Style Kandy City Centre mall',
    address: 'Kandy City Centre, Dalada Veediya, Kandy',
    window: '09:00–11:00',
    unloading: 'mall loading bay',
    access: 'mall_dock',
    cases: 12,
    chilledCases: 0,
    contactName: 'K. Silva',
    contactPhone: '+94771234598',
    accessNote: 'Use the mall loading bay only during the booked access window.',
    items: [{ id: '098-cartons', name: 'Garment cartons', planned: 12, chilled: false }]
  },
  {
    sequence: 2,
    outletId: 'OUT101',
    name: 'Style Peradeniya',
    address: '155 Peradeniya Road, Kandy',
    window: '10:00–16:00',
    unloading: 'street',
    access: 'normal',
    cases: 8,
    chilledCases: 0,
    contactName: 'D. Abeysekara',
    contactPhone: '+94771234601',
    accessNote: 'Use the signed street receiving area beside the outlet.',
    items: [{ id: '101-cartons', name: 'Garment cartons', planned: 8, chilled: false }]
  }]

}];


export const TRIP_ONE = TRIPS[0];
export const CURRENT_STOP = TRIP_ONE.stops[2];