import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRightIcon } from 'lucide-react';

export type WorkflowStep = 'orders' | 'plan' | 'assign' | 'confirm' | 'loading' | 'monitor' | 'problems';

const STEPS: {key: WorkflowStep;label: string;to: string;}[] = [
{ key: 'orders', label: 'Orders', to: '/orders' },
{ key: 'plan', label: 'Plan Trip', to: '/planning' },
{ key: 'assign', label: 'Assign Vehicle', to: '/planning' },
{ key: 'confirm', label: 'Confirm', to: '/planning' },
{ key: 'loading', label: 'Loading', to: '/loading' },
{ key: 'monitor', label: 'Monitor Delivery', to: '/monitoring' },
{ key: 'problems', label: 'Handle Problems', to: '/monitoring' }];


const DEFER_PATH = ['Order', 'Cannot Allocate', 'Defer', 'Give Reason', 'Reschedule Later'];

interface WorkflowBarProps {
  active?: WorkflowStep[];
  variant?: 'main' | 'defer';
  className?: string;
}

export function WorkflowBar({ active = [], variant = 'main', className = '' }: WorkflowBarProps) {
  if (variant === 'defer') {
    return (
      <nav aria-label="Deferral steps" className={className}>
        <ol className="flex items-center gap-1 overflow-x-auto pb-1">
          {DEFER_PATH.map((label, i) =>
          <li key={label} className="flex shrink-0 items-center gap-1">
              {i > 0 && <ChevronRightIcon aria-hidden="true" className="h-3.5 w-3.5 text-muted" />}
              <span className="rounded-full bg-amber-pale px-3 py-1.5 text-xs font-semibold text-amber-ink">{label}</span>
            </li>
          )}
        </ol>
      </nav>);

  }

  return (
    <nav aria-label="Dispatcher workflow" className={className}>
      <ol className="flex items-center gap-1 overflow-x-auto pb-1">
        {STEPS.map((step, i) => {
          const isActive = active.includes(step.key);
          return (
            <li key={step.key} className="flex shrink-0 items-center gap-1">
              {i > 0 && <ChevronRightIcon aria-hidden="true" className="h-3.5 w-3.5 text-muted" />}
              <Link
                to={step.to}
                aria-current={isActive ? 'step' : undefined}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                isActive ? 'bg-forest text-white' : 'bg-surface text-subtle hover:text-ink'}`
                }>
                
                {step.label}
              </Link>
            </li>);

        })}
      </ol>
    </nav>);

}