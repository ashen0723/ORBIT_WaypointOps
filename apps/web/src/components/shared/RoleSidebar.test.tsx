// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RoleSidebar } from './RoleSidebar';
import { menuNav as storeMenu, generalNav as storeGeneral } from '../../features/store-manager/data/navigation';
import { menuNav as driverMenu, generalNav as driverGeneral } from '../../features/driver/data/navigation';
import { menuNav as loaderMenu, generalNav as loaderGeneral } from '../../features/loader/data/navigation';

afterEach(cleanup);

it.each([
  ['store', storeMenu, storeGeneral],
  ['driver', driverMenu, driverGeneral],
  ['loader', loaderMenu, loaderGeneral],
] as const)('preserves %s navigation, active routes, footer and logout', (_, menuNav, generalNav) => {
  const logout = vi.fn();
  render(<MemoryRouter initialEntries={[menuNav[0].to]}>
    <RoleSidebar menuNav={menuNav} generalNav={generalNav} onSignOut={logout} footer={<p>Role footer</p>} />
  </MemoryRouter>);
  for (const item of [...menuNav, ...generalNav]) {
    expect(screen.getByRole('link', { name: item.label }).getAttribute('href')).toBe(item.to);
  }
  expect(screen.getByRole('link', { name: menuNav[0].label }).getAttribute('aria-current')).toBe('page');
  expect(screen.getByRole('link', { name: 'Waypoint home' }).querySelector('img')?.getAttribute('src')).toBe('/Blue_Simple_Delivery_Truck_Logo.png');
  expect(screen.getByText('Role footer')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
  expect(logout).toHaveBeenCalledOnce();
});
