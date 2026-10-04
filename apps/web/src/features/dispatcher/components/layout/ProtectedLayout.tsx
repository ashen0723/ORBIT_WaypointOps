import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSession } from '../../contexts/SessionContext';
import { SyncProvider } from '../../contexts/SyncContext';
import { DispatchProvider } from '../../contexts/DispatchContext';
import { AppShell } from './AppShell';

export function ProtectedLayout() {
  const { user } = useSession();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return (
    <SyncProvider key={user.id}>
      <DispatchProvider>
        <AppShell />
      </DispatchProvider>
    </SyncProvider>);

}