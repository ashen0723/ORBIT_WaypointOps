import React, { ReactNode, createContext, useContext, useMemo, useState } from 'react';
import { LOAD_ORDERS } from '../data/loader';
import type { LoaderIssue, LoaderIssueTarget, LoaderIssueType } from '../types/loader';
import { useScreenInit } from '../useScreenInit.js';

interface LoaderContextValue {
  quantities: Record<string, number>;
  confirmedItemIds: string[];
  issues: Record<string, LoaderIssue>;
  reviewedPlanVehicleIds: string[];
  handedOffVehicleIds: string[];
  setLoadedQuantity: (itemId: string, value: number) => void;
  markItemLoaded: (itemId: string, expected: number) => void;
  reportIssue: (target: LoaderIssueTarget, type: LoaderIssueType, note: string, photoAttached: boolean) => void;
  acknowledgeDecision: (itemId: string) => void;
  acknowledgePlanUpdate: (vehicleId: string) => void;
  confirmHandoff: (vehicleId: string) => void;
  resetIssue: (itemId: string) => void;
}

const initialQuantities = Object.fromEntries(LOAD_ORDERS.flatMap((order) => order.items.map((item) => [item.id, item.loaded])));
const LoaderContext = createContext<LoaderContextValue | null>(null);

export function LoaderProvider({ children }: {children: ReactNode;}) {
  const screenInit = useScreenInit();
  const [quantities, setQuantities] = useState<Record<string, number>>(() => screenInit.quantities ?? initialQuantities);
  const [confirmedItemIds, setConfirmedItemIds] = useState<string[]>(() => screenInit.confirmedItemIds ?? []);
  const [issues, setIssues] = useState<Record<string, LoaderIssue>>(() => screenInit.issues ?? {});
  const [reviewedPlanVehicleIds, setReviewedPlanVehicleIds] = useState<string[]>(() => screenInit.reviewedPlanVehicleIds ?? []);
  const [handedOffVehicleIds, setHandedOffVehicleIds] = useState<string[]>(() => screenInit.handedOffVehicleIds ?? []);

  const value = useMemo<LoaderContextValue>(() => ({
    quantities,
    confirmedItemIds,
    issues,
    reviewedPlanVehicleIds,
    handedOffVehicleIds,
    setLoadedQuantity: (itemId, value) => {
      setQuantities((current) => ({ ...current, [itemId]: value }));
      setConfirmedItemIds((current) => current.filter((id) => id !== itemId));
    },
    markItemLoaded: (itemId, expected) => {
      setQuantities((current) => ({ ...current, [itemId]: expected }));
      setConfirmedItemIds((current) => current.includes(itemId) ? current : [...current, itemId]);
    },
    reportIssue: (target, type, note, photoAttached) => setIssues((current) => ({
      ...current,
      [target.itemId]: {
        ...target,
        reported: true,
        type,
        loaded: quantities[target.itemId] ?? 0,
        note,
        photoAttached,
        decisionReceived: false
      }
    })),
    acknowledgeDecision: (itemId) => setIssues((current) => {
      const issue = current[itemId];
      return issue ? { ...current, [itemId]: { ...issue, decisionReceived: true } } : current;
    }),
    acknowledgePlanUpdate: (vehicleId) => setReviewedPlanVehicleIds((current) => current.includes(vehicleId) ? current : [...current, vehicleId]),
    confirmHandoff: (vehicleId) => setHandedOffVehicleIds((current) => current.includes(vehicleId) ? current : [...current, vehicleId]),
    resetIssue: (itemId) => setIssues((current) => Object.fromEntries(Object.entries(current).filter(([id]) => id !== itemId)))
  }), [confirmedItemIds, handedOffVehicleIds, issues, quantities, reviewedPlanVehicleIds]);

  return <LoaderContext.Provider value={value}>{children}</LoaderContext.Provider>;
}

export function useLoader() {
  const context = useContext(LoaderContext);
  if (!context) throw new Error('useLoader must be used within a LoaderProvider');
  return context;
}