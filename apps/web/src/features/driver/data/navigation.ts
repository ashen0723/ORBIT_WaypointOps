import {
  ClipboardListIcon,
  HistoryIcon,
  HomeIcon,
  LayoutDashboardIcon,
  PackagePlusIcon,
  SettingsIcon,
  UserIcon } from
'lucide-react';

export const menuNav = [
{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboardIcon, end: false },
{ to: '/', label: 'My Orders', icon: HomeIcon, end: true },
{ to: '/place-order', label: 'Place Order', icon: PackagePlusIcon, end: false },
{ to: '/history', label: 'Order History', icon: HistoryIcon, end: false }];


export const generalNav = [{ to: '/settings', label: 'Settings', icon: SettingsIcon, end: false }];

export const mobileTabs = [
{ to: '/', label: 'My Orders', icon: HomeIcon, end: true },
{ to: '/place-order', label: 'Place Order', icon: PackagePlusIcon, end: false },
{ to: '/history', label: 'Orders', icon: ClipboardListIcon, end: false },
{ to: '/settings', label: 'Profile', icon: UserIcon, end: false }];