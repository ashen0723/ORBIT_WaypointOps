import { ClipboardCheckIcon, SettingsIcon, TriangleAlertIcon, TruckIcon } from 'lucide-react';

export const menuNav = [
{ to: '/loader', label: 'Loading', icon: TruckIcon, end: true },
{ to: '/loader/veh009/complete', label: 'Completed', icon: ClipboardCheckIcon, end: false },
{ to: '/loader/issues', label: 'Issues', icon: TriangleAlertIcon, end: false }];


export const generalNav = [{ to: '/settings', label: 'Settings', icon: SettingsIcon, end: true }];

export const mobileTabs = [
{ to: '/loader', label: 'Loading', icon: TruckIcon, end: true },
{ to: '/loader/veh009/complete', label: 'Completed', icon: ClipboardCheckIcon, end: false },
{ to: '/loader/issues', label: 'Issues', icon: TriangleAlertIcon, end: false }];