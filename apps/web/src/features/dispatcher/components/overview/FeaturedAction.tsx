import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon } from 'lucide-react';
import { buttonStyles } from '../ui/Button';
import type { ActionItem } from '../../hooks/useActionItems';
import { TONE_ICON } from '../../utils/status';

export function FeaturedAction({ item }: {item: ActionItem;}) {
  const Icon = item.icon;
  return (
    <article className="flex h-full flex-col rounded-card bg-surface p-6 shadow-card md:p-8">
      <div className="flex items-center gap-3">
        <span className={`grid h-12 w-12 place-items-center rounded-full ${TONE_ICON[item.tone]}`}>
          <Icon aria-hidden="true" className="h-6 w-6" />
        </span>
        <span className="text-sm font-semibold text-forest">Start here</span>
      </div>
      <h3 className="mt-5 text-2xl font-semibold leading-tight tracking-tight text-ink md:text-[28px]">{item.title}</h3>
      <p className="mt-2 text-subtle">{item.next}</p>
      <div className="mt-auto pt-8">
        <Link to={item.to} className={buttonStyles('primary', 'lg')}>
          {item.cta}
          <ArrowRightIcon aria-hidden="true" className="h-5 w-5" />
        </Link>
      </div>
    </article>);

}