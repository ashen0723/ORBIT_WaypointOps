// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import type { Role } from '@waypoint/contracts';
import { RoleRouter, type RoleModules } from './RoleRouter';

/** Stand-in for a role module: its own BrowserRouter under the given basename, like the real prototypes. */
function fakeModule(role: Role) {
  return function FakeModule({ basename }: { basename?: string }) {
    return (
      <BrowserRouter basename={basename}>
        <Routes>
          <Route index element={<p>{role}-home</p>} />
          <Route path="*" element={<p>{role}-other</p>} />
        </Routes>
      </BrowserRouter>
    );
  };
}

const modules: RoleModules = {
  dispatcher: fakeModule('dispatcher'),
  store_manager: fakeModule('store_manager'),
  loader: fakeModule('loader'),
  driver: fakeModule('driver'),
};

afterEach(() => cleanup());

describe('RoleRouter', () => {
  it('shows the signed-in role module after Back into another role path following a page load', async () => {
    // History left behind by a previous driver session in this tab, then the store session's page.
    window.history.replaceState(null, '', '/driver/trips/TRP-001');
    window.history.pushState(null, '', '/store');

    // Mounting with the session already present is what a page reload does.
    render(<RoleRouter role="store_manager" userId="USR-STR" modules={modules} login={<p>login</p>} />);
    expect(screen.getByText('store_manager-home')).toBeTruthy();

    // history.back() is asynchronous: wait for the popstate to be delivered, then let React flush.
    const popped = new Promise((resolve) => window.addEventListener('popstate', resolve, { once: true }));
    window.history.back();
    await popped;
    await act(async () => {});

    expect(window.location.pathname).toBe('/store');
    expect(screen.queryByText('store_manager-home')).toBeTruthy();
  });

  it('shows login when signed out on a role path', () => {
    window.history.replaceState(null, '', '/dispatcher/orders');
    render(<RoleRouter role={null} userId={null} modules={modules} login={<p>login</p>} />);
    expect(screen.getByText('login')).toBeTruthy();
    expect(window.location.pathname).toBe('/login');
  });
});
