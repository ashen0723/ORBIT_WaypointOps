import { Link } from "react-router-dom";
const DELIVERY_LOGO = "/Blue_Simple_Delivery_Truck_Logo.png";
export function Logo({ collapsible = false }: { collapsible?: boolean }) {
  return (
    <Link
      to="/"
      className="flex items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      aria-label="Waypoint loading queue"
    >
      <span className="relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden bg-surface">
        <img
          src={DELIVERY_LOGO}
          alt=""
          className="absolute h-[250%] w-[250%] max-w-none object-contain"
        />
      </span>
      <span
        className={`text-xl font-semibold tracking-tight text-ink ${collapsible ? "md:sr-only lg:not-sr-only" : ""}`}
      >
        Waypoint
      </span>
    </Link>
  );
}
