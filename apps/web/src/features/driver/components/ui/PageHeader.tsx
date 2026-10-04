import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeftIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  backTo?: {to: string;label: string;};
  meta?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, backTo, meta, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {backTo &&
        <Link
          to={backTo.to}
          className="mb-2 inline-flex items-center gap-1 rounded text-sm font-medium text-subtle transition-colors duration-150 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
          
            <ChevronLeftIcon aria-hidden="true" className="h-4 w-4" />
            {backTo.label}
          </Link>
        }
        <h1 className="text-2xl font-semibold tracking-tight text-ink lg:text-[32px] lg:leading-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-subtle">{subtitle}</p>}
        {meta && <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>);

}