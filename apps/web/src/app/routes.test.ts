import { describe, expect, it } from 'vitest';
import { resolveRoute } from './routes';

describe('resolveRoute', () => {
  it('sends a signed-out visitor at the root to login', () => {
    expect(resolveRoute(null, '/')).toEqual({ redirectTo: '/login', module: 'login' });
  });

  it('sends a signed-out visitor on a role path to login', () => {
    expect(resolveRoute(null, '/store/history')).toEqual({ redirectTo: '/login', module: 'login' });
  });

  it('keeps a signed-out visitor on login without redirecting', () => {
    expect(resolveRoute(null, '/login')).toEqual({ redirectTo: null, module: 'login' });
  });

  it('moves a signed-in user off the login page to their base path', () => {
    expect(resolveRoute('store_manager', '/login')).toEqual({ redirectTo: '/store', module: 'store_manager' });
  });

  it("redirects a user away from another role's path", () => {
    expect(resolveRoute('store_manager', '/dispatcher/orders')).toEqual({ redirectTo: '/store', module: 'store_manager' });
  });

  it('does not treat a path that merely starts with the base text as inside it', () => {
    expect(resolveRoute('store_manager', '/storefront')).toEqual({ redirectTo: '/store', module: 'store_manager' });
  });

  it('keeps a deep link inside the role base path', () => {
    expect(resolveRoute('driver', '/driver/trips/TRP-001/stops/2')).toEqual({ redirectTo: null, module: 'driver' });
  });

  it('keeps the exact base path', () => {
    expect(resolveRoute('loader', '/loader')).toEqual({ redirectTo: null, module: 'loader' });
  });

  it('sends a dispatcher at the root to the dispatcher base path', () => {
    expect(resolveRoute('dispatcher', '/')).toEqual({ redirectTo: '/dispatcher', module: 'dispatcher' });
  });
});
