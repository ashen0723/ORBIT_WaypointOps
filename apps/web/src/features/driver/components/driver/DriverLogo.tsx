import { WaypointLogo } from '../../../../components/shared/WaypointLogo';

export function DriverLogo({ compact = false }: { compact?: boolean }) {
  return <WaypointLogo compact={compact} size="lg" label="Waypoint Driver home" />;
}
