import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, CircleCheckIcon } from 'lucide-react';
import { useActionItems } from '../../hooks/useActionItems';

export function NextUpCard() {
  const [first] = useActionItems();

  if (!first) {
    return (
      <div className="flex items-center gap-2 rounded-card bg-brand-pale p-4 text-sm font-semibold text-forest">
        <CircleCheckIcon aria-hidden="true" className="h-5 w-5" />
        All caught up
      </div>);

  }

  const Icon = first.icon;
  return (
    <div className="rounded-card bg-forest p-4 text-white">
      <span className="grid h-9 w-9 place-items-center rounded-full bg-white/10 ring-1 ring-white/30">
        <Icon aria-hidden="true" className="h-4 w-4" />
      </span>
      <p className="mt-4 text-xs text-white/75">Do this next</p>
      <p className="mt-0.5 font-semibold leading-snug">{first.title}</p>
      <Link
        to={first.to}
        className="mt-4 flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-surface text-sm font-semibold text-forest transition-colors duration-150 hover:bg-brand-pale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
        
        {first.cta}
        <ArrowRightIcon aria-hidden="true" className="h-4 w-4" />
      </Link>
    </div>);

}