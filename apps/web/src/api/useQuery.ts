import { useCallback, useEffect, useRef, useState } from "react";
/** Abort stale filters/unmounted views. Refresh failures retain data and expose the error. */
export function useQuery<T>(
  key: string,
  load: (signal: AbortSignal) => Promise<T>,
  pollMs = 0,
) {
  const loader = useRef(load);
  loader.current = load;
  const [revision, setRevision] = useState(0),
    [state, setState] = useState<{
      key: string;
      data?: T;
      loading: boolean;
      error: unknown;
      updatedAt?: Date;
    }>({ key, loading: true, error: null });
  const refresh = useCallback(() => setRevision((n) => n + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    setState((old) => ({
      key,
      data: old.key === key ? old.data : undefined,
      updatedAt: old.key === key ? old.updatedAt : undefined,
      loading: true,
      error: null,
    }));
    void loader
      .current(controller.signal)
      .then((data) => {
        if (current)
          setState({
            key,
            data,
            loading: false,
            error: null,
            updatedAt: new Date(),
          });
      })
      .catch((error) => {
        if (current && !controller.signal.aborted)
          setState((old) => ({ ...old, key, loading: false, error }));
      });
    return () => {
      current = false;
      controller.abort();
    };
  }, [key, revision]);
  useEffect(() => {
    if (!pollMs) return;
    const id = window.setInterval(() => {
      if (document.visibilityState !== "hidden") refresh();
    }, pollMs);
    return () => clearInterval(id);
  }, [pollMs, refresh]);
  return {
    ...(state.key === key
      ? state
      : {
          key,
          data: undefined,
          loading: true,
          error: null,
          updatedAt: undefined,
        }),
    refresh,
  };
}
