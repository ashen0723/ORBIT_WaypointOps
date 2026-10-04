import type { Role } from '../types/dispatch';

export interface DemoAccount {
  id: string;
  name: string;
  email: string;
  role: Role;
  outletId?: string;
  depotId?: 'DEP-PLG' | 'DEP-KDY';
  driverId?: string;
  description: string;
}

/** Seeded demonstration accounts. All share the password in data/rules.ts › DEMO_PASSWORD. */
export const demoAccounts: DemoAccount[] = [
{ id: 'USR-DSP', name: 'Anjali Fernando', email: 'dispatcher@waypoint.lk', role: 'dispatcher', description: 'Plans trips for both depots' },
{ id: 'USR-LDR', name: 'Pradeep Kumara', email: 'loader@waypoint.lk', role: 'loader', depotId: 'DEP-PLG', description: 'Loads trips at Peliyagoda' },
{ id: 'USR-DRV', name: 'Nimal Silva', email: 'driver@waypoint.lk', role: 'driver', driverId: 'DRV-01', description: 'Drives TRK-021' },
{ id: 'USR-STR', name: 'Sanduni Perera', email: 'store@waypoint.lk', role: 'store_manager', outletId: 'OUT-001', description: 'Manages FreshMart – Colombo 05' },
{ id: 'USR-STR2', name: 'Kavindu Jayawardena', email: 'store2@waypoint.lk', role: 'store_manager', outletId: 'OUT-002', description: 'Second store, for permission checks' }];


export const ROLE_LABEL: Record<Role, string> = {
  dispatcher: 'Dispatcher',
  loader: 'Loader',
  driver: 'Driver',
  store_manager: 'Store Manager'
};