import { Link } from 'react-router-dom';

interface WaypointMarkProps {
  size?: 'sm' | 'md' | 'lg';
}

const markSizes = { sm: 'h-9 w-9', md: 'h-10 w-10', lg: 'h-12 w-12' };

export function WaypointMark({ size = 'sm' }: WaypointMarkProps) {
  return <span className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-surface ${markSizes[size]}`}>
    <img src="/Blue_Simple_Delivery_Truck_Logo.png" alt=""
      className={`absolute max-w-none object-contain ${size === 'lg' ? 'h-[220%] w-[220%]' : 'h-[250%] w-[250%]'}`} />
  </span>;
}

interface WaypointLogoProps {
  collapsible?: boolean;
  compact?: boolean;
  subtitle?: string;
  to?: string;
  label?: string;
  size?: 'sm' | 'lg';
}

export function WaypointLogo({ collapsible = false, compact = false, subtitle, to = '/', label = 'Waypoint home', size = 'sm' }: WaypointLogoProps) {
  return <Link to={to} aria-label={label}
    className={`flex items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${compact ? 'justify-center' : size === 'lg' ? 'min-h-12 gap-3' : 'gap-2'}`}>
    <WaypointMark size={size} />
    {!compact && <span className={`${subtitle ? 'leading-none' : ''} ${collapsible ? 'md:sr-only lg:not-sr-only' : ''}`}>
      <span className={`block font-semibold tracking-tight text-ink ${size === 'lg' ? 'text-2xl' : 'text-xl'}`}>Waypoint</span>
      {subtitle && <span className="mt-0.5 block text-xs font-semibold text-forest">{subtitle}</span>}
    </span>}
  </Link>;
}
