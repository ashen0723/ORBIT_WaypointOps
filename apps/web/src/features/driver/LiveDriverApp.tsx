import { useEffect, useMemo } from 'react';
import { useAuth } from '../../app/providers/AuthProvider';
import { DriverApp } from './DriverApp';
import { LiveDriverIntegration } from './integration/live';

/** The Driver role module: the Day-5 Driver UI connected to the API and the durable offline outbox. */
export function LiveDriverApp({ basename }: { basename?: string }) {
  const { user, token, expire } = useAuth();
  const integration = useMemo(
    () => (user && token ? new LiveDriverIntegration({ user, token, onUnauthorized: () => expire(token) }) : undefined),
    // A new adapter per signed-in account/token; `expire` is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.id, token],
  );
  useEffect(() => integration?.start(), [integration]);
  if (!integration) return null;
  return <DriverApp basename={basename} integration={integration} />;
}
