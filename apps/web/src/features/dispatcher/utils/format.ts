import type { Outlet } from '../types/dispatch';
import { to12h } from './time';

export function formatNumber(n: number): string {
  return (Math.round(n * 10) / 10).toLocaleString('en-US');
}

export function formatKg(n: number): string {
  return `${formatNumber(n)} kg`;
}

export function formatM3(n: number): string {
  return `${formatNumber(n)} m³`;
}

export function formatL(n: number): string {
  return `${formatNumber(n)} L`;
}

export function tripLabel(n: number): string {
  return `Trip ${String(n).padStart(3, '0')}`;
}

export function outletLabel(outlet: Outlet | undefined): string {
  return outlet ? `${outlet.name} – ${outlet.area}` : 'Unknown outlet';
}

export function formatWindow(start: string, end: string): string {
  return `${to12h(start)} – ${to12h(end)}`;
}

export function plural(n: number, word: string, pluralWord?: string): string {
  return `${n} ${n === 1 ? word : pluralWord ?? `${word}s`}`;
}