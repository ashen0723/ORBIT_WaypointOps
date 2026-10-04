import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type { Role } from '../../types/dispatch';
import { useDispatch } from '../../contexts/DispatchContext';
import { HOME_BY_ROLE } from '../../data/navigation';

/** UI routing guard. The real enforcement is server-side; this just keeps people on their own screens. */
export function RequireRole({ roles, children }: {roles: Role[];children: ReactNode;}) {
  const { user } = useDispatch();
  if (!roles.includes(user.role)) return <Navigate to={HOME_BY_ROLE[user.role]} replace />;
  return <>{children}</>;
}