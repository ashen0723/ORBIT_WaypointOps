import { useDriver } from '../contexts/DriverContext';
export function useSyncQueue() {
  const { actions } = useDriver();
  const pending = actions.filter(action => action.state !== 'Synced');
  return { deliveries: pending.filter(a => a.kind === 'outcome' || a.kind === 'arrival').length, photos: 0, issues: pending.filter(a => a.kind === 'issue').length, total: pending.length };
}
