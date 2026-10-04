import { createContext, ReactNode, useContext } from 'react';
import { useOrders } from './OrdersContext';
import { useCountdown } from '../hooks/useCountdown';

const CutoffContext = createContext<number>(0);

interface CutoffProviderProps {
  initialSeconds: number;
  children: ReactNode;
}

export function CutoffProvider({ initialSeconds, children }: CutoffProviderProps) {
  const { store, live } = useOrders();
  const seconds = useCountdown(live ? Math.max(0, Math.floor((Date.parse(store?.cutoffAt ?? '') - Date.now()) / 1000) || 0) : initialSeconds);
  return <CutoffContext.Provider value={seconds}>{children}</CutoffContext.Provider>;
}

export function useCutoffSeconds(): number {
  return useContext(CutoffContext);
}