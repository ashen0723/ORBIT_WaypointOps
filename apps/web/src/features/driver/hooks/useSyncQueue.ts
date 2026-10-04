import { useDriver } from '../contexts/DriverContext';

export function useSyncQueue() {
  const { stopRecords, offlineIssueReports } = useDriver();
  const queued = Object.values(stopRecords).filter((record) => record.syncState === 'Saved on phone');
  const photos = queued.reduce((sum, record) => sum + record.photoCount, 0);
  return {
    deliveries: queued.length,
    photos,
    issues: offlineIssueReports,
    total: queued.length + photos + offlineIssueReports
  };
}