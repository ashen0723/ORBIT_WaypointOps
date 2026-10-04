import {
    ClipboardCheckIcon,
    SettingsIcon,
    TriangleAlertIcon,
    TruckIcon,
} from 'lucide-react';

export const menuNav = [
    {
        to: '/',
        label: 'Loading',
        icon: TruckIcon,
        end: true,
    },
    {
        to: '/completed',
        label: 'Completed',
        icon: ClipboardCheckIcon,
        end: true,
    },
    {
        to: '/issues',
        label: 'Issues',
        icon: TriangleAlertIcon,
        end: true,
    },
];

export const generalNav = [
    {
        to: '/settings',
        label: 'Settings',
        icon: SettingsIcon,
        end: true,
    },
];

export const mobileTabs = [
    {
        to: '/',
        label: 'Loading',
        icon: TruckIcon,
        end: true,
    },
    {
        to: '/completed',
        label: 'Completed',
        icon: ClipboardCheckIcon,
        end: true,
    },
    {
        to: '/issues',
        label: 'Issues',
        icon: TriangleAlertIcon,
        end: true,
    },
];