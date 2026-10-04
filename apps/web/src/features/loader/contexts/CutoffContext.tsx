import React, { createContext, ReactNode, useContext } from 'react';
import { useCountdown } from '../hooks/useCountdown';
const CutoffContext = createContext<number>(0);
interface CutoffProviderProps {
  initialSeconds: number;
  children: ReactNode;
}
export function CutoffProvider({
  initialSeconds,
  children
}: CutoffProviderProps) {
  const seconds = useCountdown(initialSeconds);
  return <CutoffContext.Provider value={seconds}>{children}</CutoffContext.Provider>;
}
export function useCutoffSeconds(): number {
  return useContext(CutoffContext);
}