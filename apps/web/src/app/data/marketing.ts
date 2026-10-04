import {
  BoxesIcon,
  RouteIcon,
  StoreIcon,
  TruckIcon,
  WarehouseIcon } from
'lucide-react';

export const workflowSteps = [
{ number: '01', title: 'Order', detail: 'Store submits request' },
{ number: '02', title: 'Plan', detail: 'Dispatcher allocates trip' },
{ number: '03', title: 'Load', detail: 'Warehouse prepares vehicle' },
{ number: '04', title: 'Deliver', detail: 'Driver completes route' },
{ number: '05', title: 'Confirm', detail: 'Store verifies receipt' }];


export const roleExperiences = [
{
  title: 'Store Manager',
  description: 'Order and receive with confidence.',
  detail: 'Clear cutoffs, live ETAs and fast receipt confirmation.',
  icon: StoreIcon,
  className: 'lg:col-span-2 lg:row-span-2 bg-forest text-white'
},
{
  title: 'Dispatcher',
  description: 'Turn demand into an executable plan.',
  detail: 'Shape routes and resolve changes before they slow the network.',
  icon: RouteIcon,
  className: 'bg-white text-ink'
},
{
  title: 'Loader',
  description: 'Prepare every trip accurately.',
  detail: 'Sequence loads, flag issues and hand off with certainty.',
  icon: BoxesIcon,
  className: 'bg-brand-pale text-ink'
},
{
  title: 'Driver',
  description: 'Complete every stop with clarity.',
  detail: 'One focused route, live updates and simple proof of delivery.',
  icon: TruckIcon,
  className: 'lg:col-span-2 bg-[#17231D] text-white'
}];


export const systemRoles = [
{ label: 'Store Manager', icon: StoreIcon },
{ label: 'Dispatcher', icon: RouteIcon },
{ label: 'Loader', icon: WarehouseIcon },
{ label: 'Driver', icon: TruckIcon }];


export const visibilityEvents = [
{ label: 'VEH014', value: 'In transit', meta: '4 stops · On time', tone: 'bg-brand-pale text-forest' },
{ label: 'OUT014', value: 'ETA 06:20', meta: 'Updated 2 min ago', tone: 'bg-white text-ink' },
{ label: 'Loading issue', value: 'Resolved', meta: 'Plan automatically updated', tone: 'bg-[#FFF5E5] text-[#704A0E]' }];


export const operationalStats = [
{ value: '120', label: 'Outlets' },
{ value: '60', label: 'Vehicles' },
{ value: '2', label: 'Distribution hubs' }];