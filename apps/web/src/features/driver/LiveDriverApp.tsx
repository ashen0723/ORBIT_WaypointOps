import { useEffect, useMemo, useState } from 'react';
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
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!integration) return;
    setReady(false);
    const stop = integration.start();
    let active = true;
    void integration.ready.finally(() => { if (active) setReady(true); });
    return () => { active = false; stop(); };
  }, [integration]);
  if (!integration) return null;
  // Deep links and refreshes (including offline) must not redirect before the cached route is loaded.
  if (!ready) return <p role="status" style={{ padding: 24, fontFamily: 'Inter, sans-serif' }}>Loading your route…</p>;
  return <DriverApp basename={basename} integration={integration} />;
}
