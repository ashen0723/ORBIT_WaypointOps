import { ArrowUpRightIcon } from 'lucide-react';
import { roleExperiences } from '../../data/marketing';

export function RoleGrid() {
  return (
    <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2">
      {roleExperiences.map(({ title, description, detail, icon: Icon, className }) =>
      <article key={title} className={`group flex min-h-[240px] flex-col overflow-hidden rounded-[24px] border border-forest/10 p-6 shadow-card transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-pop ${className}`}>
          <div className="flex items-start justify-between">
            <span className="grid h-11 w-11 place-items-center rounded-2xl border border-current/10 bg-current/5"><Icon aria-hidden="true" className="h-5 w-5" /></span>
            <ArrowUpRightIcon aria-hidden="true" className="h-4 w-4 opacity-40 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
          <div className="mt-auto pt-10">
            <p className="text-xs font-bold uppercase tracking-[0.14em] opacity-60">{title}</p>
            <h3 className="mt-3 max-w-[300px] text-2xl font-semibold leading-tight tracking-[-0.03em]">{description}</h3>
            <p className="mt-3 max-w-[360px] text-sm leading-6 opacity-65">{detail}</p>
          </div>
        </article>
      )}
    </div>);

}
