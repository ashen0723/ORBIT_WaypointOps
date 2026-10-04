import React from 'react';
import { Link } from 'react-router-dom';

interface StatCardProps {
  label: string;
  value: number;
  hint: string;
  to: string;
  alert?: boolean;
}

export function StatCard({ label, value, hint, to, alert = false }: StatCardProps) {
  return (
    <Link
      to={to}
      className="flex min-h-[120px] flex-col rounded-card bg-surface p-4 shadow-card transition-shadow duration-150 hover:shadow-pop focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand md:p-5">
      
      <span className="flex items-center gap-2 text-sm font-medium text-subtle">
        {alert && <span aria-hidden="true" className="h-2 w-2 rounded-full bg-danger" />}
        {label}
      </span>
      <span className={`mt-auto pt-3 text-[32px] font-semibold leading-none tabular-nums ${alert ? 'text-danger-ink' : 'text-ink'}`}>{value}</span>
      <span className="mt-1.5 text-xs text-subtle">{hint}</span>
    </Link>);

}