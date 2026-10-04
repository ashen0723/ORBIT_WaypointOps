import { Link } from 'react-router-dom';
import { WaypointsIcon } from 'lucide-react';

interface BrandMarkProps {
  light?: boolean;
  compact?: boolean;
}

export function BrandMark({ light = false, compact = false }: BrandMarkProps) {
  return (
    <Link
      to="/"
      aria-label="Waypoint home"
      className="group inline-flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint focus-visible:ring-offset-2 focus-visible:ring-offset-transparent">

      <span className={`grid h-10 w-10 place-items-center rounded-[13px] border ${light ? 'border-white/15 bg-white/10 text-brand-mint' : 'border-forest/10 bg-forest text-white'} transition-transform duration-150 group-hover:-translate-y-0.5`}>
        <WaypointsIcon aria-hidden="true" className="h-5 w-5" strokeWidth={2.2} />
      </span>
      <span className="leading-none">
        <span className={`block text-[15px] font-bold tracking-[0.18em] ${light ? 'text-white' : 'text-ink'}`}>WAYPOINT</span>
        {!compact && <span className={`mt-1.5 block text-[9px] font-semibold uppercase tracking-[0.24em] ${light ? 'text-white/55' : 'text-subtle'}`}>Operations Platform</span>}
      </span>
    </Link>);

}
