import { Link } from 'react-router-dom';
import { ArrowRightIcon } from 'lucide-react';
import { buttonStyles } from '../../../../components/shared/ui';
import type { ActionItem } from '../overview-model';
const TONE_ICON = { danger: 'bg-danger-pale text-danger-ink', amber: 'bg-amber-pale text-amber-ink', brand: 'bg-brand-pale text-forest' };

export function ActionRow({ item }: {item: ActionItem;}) {
  const Icon = item.icon;
  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 md:p-5">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${TONE_ICON[item.tone]}`}>
          <Icon aria-hidden="true" className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-ink">{item.title}</p>
          <p className="mt-0.5 text-sm text-subtle">{item.next}</p>
        </div>
      </div>
      <Link to={item.to} className={`${buttonStyles('secondary', 'md')} shrink-0 sm:w-auto`}>
        {item.cta}
        <ArrowRightIcon aria-hidden="true" className="h-4 w-4" />
      </Link>
    </li>);

}