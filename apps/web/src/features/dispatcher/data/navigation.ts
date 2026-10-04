import {
  ActivityIcon,
  CalendarClockIcon,
  ClipboardListIcon,
  FlaskConicalIcon,
  GaugeIcon,
  HistoryIcon,
  InboxIcon,
  LayoutGridIcon,
  LucideIcon,
  PackageCheckIcon,
  PlusCircleIcon,
  RouteIcon,
  TruckIcon } from
'lucide-react';
import type { Role } from '../types/dispatch';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

export const navByRole: Record<Role, NavItem[]> = {
  dispatcher: [
  { to: '/', label: 'Overview', icon: LayoutGridIcon, end: true },
  { to: '/orders', label: 'Orders', icon: InboxIcon },
  { to: '/planning', label: 'Trip Planning', icon: RouteIcon },
  { to: '/loading', label: 'Loading', icon: PackageCheckIcon },
  { to: '/monitoring', label: 'Delivery Monitoring', icon: ActivityIcon },
  { to: '/deferrals', label: 'Deferrals', icon: CalendarClockIcon },
  { to: '/vehicles', label: 'Vehicles', icon: TruckIcon },
  { to: '/forecast', label: 'Capacity Forecast', icon: GaugeIcon },
  { to: '/history', label: 'History', icon: HistoryIcon },
  { to: '/checks', label: 'System Checks', icon: FlaskConicalIcon }],

  loader: [{ to: '/loading', label: 'Trips to Load', icon: PackageCheckIcon }],
  driver: [{ to: '/driver', label: 'My Trips', icon: TruckIcon }],
  store_manager: [
  { to: '/store', label: 'My Orders', icon: ClipboardListIcon, end: true },
  { to: '/store/new', label: 'New Order', icon: PlusCircleIcon },
  { to: '/store/history', label: 'Order History', icon: HistoryIcon }]

};

export const HOME_BY_ROLE: Record<Role, string> = {
  dispatcher: '/',
  loader: '/loading',
  driver: '/driver',
  store_manager: '/store'
};