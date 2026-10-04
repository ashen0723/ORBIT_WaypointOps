// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthProvider';
import { transport } from '../../features/dispatcher/utils/network';
import type { Snapshot } from '../../features/dispatcher/types/dispatch';

let auth: ReturnType<typeof useAuth>;
function Probe() { auth = useAuth(); return <p>{auth.user?.role ?? 'signed out'}</p>; }
const user = { id: 'USR-DSP', email: 'dispatcher@waypoint.lk', name: 'Dispatcher', role: 'dispatcher' };
const jwt = `header.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.signature`;
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const fetchMock = vi.fn();

beforeEach(() => {
  sessionStorage.clear(); localStorage.clear();
  fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

async function signIn() {
  fetchMock.mockResolvedValueOnce(response({ token: jwt, user }));
  render(<AuthProvider><Probe /></AuthProvider>);
  let error: string | null = '';
  await act(async () => { error = await auth.login(' DISPATCHER@WAYPOINT.LK ', 'secret'); });
  expect(error).toBeNull();
}

describe('JWT auth and isolated mock business session', () => {
  it('logs in through the API, preserves roles and separates tokens', async () => {
    await signIn();
    expect(screen.getByText('dispatcher')).toBeTruthy();
    expect(sessionStorage.getItem('waypoint.auth.jwt')).toBe(jwt);
    expect(auth.jwtToken).toBe(jwt);
    expect(auth.token).not.toBe(jwt);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/auth/login');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ email: user.email, password: 'secret' });
    expect(localStorage.getItem('waypoint.server.db')).not.toContain(jwt);
    expect(sessionStorage.getItem('waypoint.auth.jwt')).not.toContain('secret');
    const result = await transport<Snapshot>({ op: 'snapshot' }, auth.token);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.user.role).toBe('dispatcher');
  });

  it('reports invalid credentials without storing a session', async () => {
    fetchMock.mockResolvedValue(response({ message: 'Email or password is incorrect' }, 401));
    render(<AuthProvider><Probe /></AuthProvider>);
    let error;
    await act(async () => { error = await auth.login('bad@example.com', 'wrong'); });
    expect(error).toBe('Email or password is incorrect.');
    expect(auth.user).toBeNull();
    expect(sessionStorage.getItem('waypoint.auth.jwt')).toBeNull();
  });

  it('reports network failure separately from credentials', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    render(<AuthProvider><Probe /></AuthProvider>);
    let error;
    await act(async () => { error = await auth.login(user.email, 'secret'); });
    expect(error).toContain('connection');
  });

  it('restores the current user with a Bearer JWT before rendering protected content', async () => {
    sessionStorage.setItem('waypoint.auth.jwt', jwt);
    fetchMock.mockResolvedValue(response({ ...user, role: 'loader', depotId: 'DEP-PLG' }));
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(screen.queryByText('loader')).toBeNull();
    await screen.findByText('loader');
    expect(fetchMock.mock.calls[0][0]).toBe('/api/auth/me');
    expect(fetchMock.mock.calls[0][1].headers.get('Authorization')).toBe(`Bearer ${jwt}`);
    expect(auth.user?.depotId).toBe('DEP-PLG');
  });

  it('clears invalid restored authentication', async () => {
    sessionStorage.setItem('waypoint.auth.jwt', jwt);
    fetchMock.mockResolvedValue(response({ message: 'Expired' }, 401));
    render(<AuthProvider><Probe /></AuthProvider>);
    await screen.findByText('signed out');
    expect(sessionStorage.getItem('waypoint.auth.jwt')).toBeNull();
  });

  it('retains the JWT and offers retry on restoration network failure', async () => {
    sessionStorage.setItem('waypoint.auth.jwt', jwt);
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    render(<AuthProvider><Probe /></AuthProvider>);
    await screen.findByRole('alert');
    expect(sessionStorage.getItem('waypoint.auth.jwt')).toBe(jwt);
    expect(screen.getByText('Retry')).toBeTruthy();
  });

  it('logs out locally and invalidates its mock session', async () => {
    await signIn();
    const oldToken = auth.token;
    await act(async () => { await auth.logout(); });
    expect(auth.user).toBeNull();
    expect(auth.jwtToken).toBeNull();
    expect(sessionStorage.getItem('waypoint.auth.jwt')).toBeNull();
    const result = await transport({ op: 'snapshot' }, oldToken);
    expect(result).toMatchObject({ ok: false, status: 401 });
  });

  it('uses the JWT for real API requests and expires on 401', async () => {
    await signIn();
    fetchMock.mockResolvedValueOnce(response({ ok: true }));
    await auth.request('/health');
    expect(fetchMock.mock.calls[1][1].headers.get('Authorization')).toBe(`Bearer ${jwt}`);
    fetchMock.mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }));
    await act(async () => { await expect(auth.request('/auth/me')).rejects.toMatchObject({ status: 401 }); });
    expect(auth.user).toBeNull();
  });

  it('preserves driver mock scope without making a mock login request', async () => {
    fetchMock.mockResolvedValue(response({ token: jwt, user: { ...user, id: 'USR-DRV', email: 'driver@waypoint.lk', role: 'driver', vehicleId: 'TRK-021' } }));
    render(<AuthProvider><Probe /></AuthProvider>);
    await act(async () => { await auth.login('driver@waypoint.lk', 'secret'); });
    expect(auth.user?.driverId).toBe('DRV-01');
    expect(auth.user?.vehicleId).toBe('TRK-021');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const result = await transport<Snapshot>({ op: 'snapshot' }, auth.token);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.trips.length).toBeGreaterThan(0);
  });


  it('retries restoration after a connection failure', async () => {
    sessionStorage.setItem('waypoint.auth.jwt', jwt);
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    render(<AuthProvider><Probe /></AuthProvider>);
    await screen.findByRole('alert');
    fetchMock.mockResolvedValueOnce(response(user));
    fireEvent.click(screen.getByText('Retry'));
    await screen.findByText('dispatcher');
    expect(auth.jwtToken).toBe(jwt);
  });

  it('does not revive a session when a pending API request finishes after logout', async () => {
    let resolve!: (value: Response) => void;
    fetchMock.mockImplementationOnce(() => new Promise<Response>(done => { resolve = done; }));
    render(<AuthProvider><Probe /></AuthProvider>);
    let pending!: Promise<string | null>;
    act(() => { pending = auth.login(user.email, 'secret'); });
    await act(async () => { await auth.logout(); });
    await act(async () => { resolve(response({ token: jwt, user })); await pending; });
    expect(auth.user).toBeNull();
    expect(sessionStorage.getItem('waypoint.auth.jwt')).toBeNull();
  });

  it('ends an expired JWT session even while business transport remains mocked', async () => {
    const expired = `header.${btoa(JSON.stringify({ exp: 1 }))}.signature`;
    fetchMock.mockResolvedValueOnce(response({ token: expired, user }));
    render(<AuthProvider><Probe /></AuthProvider>);
    await act(async () => { await auth.login(user.email, 'secret'); });
    await waitFor(() => expect(auth.user).toBeNull(), { timeout: 2000 });
    expect(sessionStorage.getItem('waypoint.auth.jwt')).toBeNull();
  });

  it('discards legacy mock authentication on startup', async () => {
    sessionStorage.setItem('waypoint.session', JSON.stringify({ token: 'mock', user }));
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(auth.user).toBeNull());
    expect(sessionStorage.getItem('waypoint.session')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
