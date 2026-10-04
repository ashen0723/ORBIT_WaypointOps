import type { Brand, BusinessDate, Id, OrderView } from "./domain";
export interface DepotView {
  id: Id;
  name: string;
}
export interface OutletView {
  id: Id;
  name: string;
  brand: Brand;
  depotId: Id;
  district: string;
  parkingConstraint: string;
  windowOpenTime: string;
  windowCloseTime: string;
  scheduledWeekday: number | null;
}
export interface OperatingDateView {
  id: BusinessDate;
  date: BusinessDate;
}
/** Preview of the exact authorized balance, not the original order's totals on a retry. */
export interface PlanningLoadView {
  units: number;
  weightKg: number;
  volumeM3: number;
  lines: { orderLineId: Id; qty: number }[];
}
export interface DispatcherOrderView extends OrderView {
  outletName: string;
  depotId: Id;
  planningLoad: PlanningLoadView | null;
}
