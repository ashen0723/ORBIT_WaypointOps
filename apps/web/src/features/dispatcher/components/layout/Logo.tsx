import { Link } from 'react-router-dom';

const DELIVERY_LOGO = "/Blue_Simple_Delivery_Truck_Logo.png";

interface LogoProps {
  collapsible?: boolean;
  subtitle?: string;
  to?: string;
}

export function Logo({ collapsible = false, subtitle, to = '/' }: LogoProps) {
  return (
    <Link to={to} className="flex items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" aria-label="Waypoint home">
      <span className="relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden bg-surface">
        <img src={DELIVERY_LOGO} alt="" className="absolute h-[250%] w-[250%] max-w-none object-contain" />
      </span>
      <span className={`leading-none ${collapsible ? 'md:sr-only lg:not-sr-only' : ''}`}>
        <span className="block text-xl font-semibold tracking-tight text-ink">Waypoint</span>
        {subtitle && <span className="mt-0.5 block text-xs font-semibold text-forest">{subtitle}</span>}
      </span>
    </Link>);

}