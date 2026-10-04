import { useDriver } from '../../contexts/DriverContext';
import { Link } from 'react-router-dom';

export function DriverProfileSummary({ compact = false }: {compact?: boolean;}) {
  const { identity: DRIVER } = useDriver();
  return (
    <Link
      to="/profile"
      aria-label={`Open ${DRIVER.name}'s profile`}
      className={`flex min-h-12 items-center gap-3 rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${compact ? 'justify-center' : 'pr-2'}`}>
      
      <img src={DRIVER.avatar} alt="" className="h-12 w-12 shrink-0 rounded-full bg-amber-pale object-cover" />
      {!compact &&
      <span className="min-w-0 text-left">
          <span className="block truncate text-[15px] font-semibold leading-5 text-ink">{DRIVER.name}</span>
          <span className="mt-0.5 block truncate text-xs text-subtle">{DRIVER.email}</span>
        </span>
      }
    </Link>);

}