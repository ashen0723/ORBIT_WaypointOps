import { createContext, useContext, useState, type ReactNode } from "react";
import type { DepotView } from "@waypoint/contracts";
import { useAuth } from "../../../app/providers/AuthProvider";
import { useQuery } from "../../../api/useQuery";
import { colomboDate, useDispatcherApi, type DispatcherApi } from "./api";
interface DispatchValue {
  api: DispatcherApi;
  date: string;
  depotId: string;
  setDate: (v: string) => void;
  setDepotId: (v: string) => void;
  depots: DepotView[];
  depotError: unknown;
  refreshDepots: () => void;
}
const Context = createContext<DispatchValue | null>(null);
export function DispatcherProvider({ children }: { children: ReactNode }) {
  const api = useDispatcherApi(),
    { user } = useAuth(),
    key = `waypoint.dispatcher.filters:${user!.id}`;
  const [filters, setFilters] = useState(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(key) ?? "null");
      if (
        saved &&
        typeof saved.date === "string" &&
        typeof saved.depotId === "string"
      )
        return saved as { date: string; depotId: string };
    } catch {}
    return { date: colomboDate(), depotId: "" };
  });
  const depots = useQuery("dispatcher-depots", (s) =>
    api.all<DepotView>("/depots", {}, s),
  );
  function update(values: Partial<typeof filters>) {
    setFilters((old) => {
      const next = { ...old, ...values };
      try {
        sessionStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* Filters remain usable when browser storage is unavailable. */
      }
      return next;
    });
  }
  return (
    <Context.Provider
      value={{
        api,
        date: filters.date,
        depotId: filters.depotId,
        setDate: (v) => update({ date: v }),
        setDepotId: (v) => update({ depotId: v }),
        depots: depots.data ?? [],
        depotError: depots.error,
        refreshDepots: depots.refresh,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useDispatcher() {
  const value = useContext(Context);
  if (!value) throw new Error("DispatcherProvider is required");
  return value;
}
