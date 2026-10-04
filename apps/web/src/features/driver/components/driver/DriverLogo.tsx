import { Link } from 'react-router-dom';

const DELIVERY_LOGO = "/Blue_Simple_Delivery_Truck_Logo.png";

export function DriverLogo({ compact = false }: {compact?: boolean;}) {
  return (
    <Link
      to="/"
      aria-label="Waypoint Driver home"
      className={`flex min-h-12 items-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${compact ? 'justify-center' : 'gap-3'}`}>
      
      <span className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden bg-surface">
        <img src={DELIVERY_LOGO} alt="" className="absolute h-[220%] w-[220%] max-w-none object-contain" />
      </span>
      {!compact && <span className="text-2xl font-semibold tracking-tight text-ink">Waypoint</span>}
    </Link>);

}