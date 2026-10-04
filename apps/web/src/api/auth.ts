import { apiFetch } from './client';
import type { Role } from '../features/dispatcher/types/dispatch';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  outletId?: string;
  depotId?: string;
  vehicleId?: string;
}
export interface AuthSession { token: string; user: AuthUser }

export const login = (email: string, password: string) => apiFetch<AuthSession>('/auth/login', {
  method: 'POST', body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
});
export const currentUser = (token: string) => apiFetch<AuthUser>('/auth/me', { token });
