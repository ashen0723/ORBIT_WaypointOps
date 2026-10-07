import { WaypointLogo } from '../../../../components/shared/WaypointLogo';

export function Logo({ collapsible = false }: { collapsible?: boolean }) {
  return <WaypointLogo collapsible={collapsible} label="Waypoint loading queue" />;
}
