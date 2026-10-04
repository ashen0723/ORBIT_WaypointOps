// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DriverProvider, useDriver } from '../contexts/DriverContext';
import { TripCheck } from '../pages/driver/TripCheck';
import { TRIPS } from '../data/driver';
import { validateDelivery, type DeliveryDraft, type DriverIntegration } from './driver';
import { SyncIndicator } from '../components/driver/SyncIndicator';
import { SessionProvider } from '../../dispatcher/contexts/SessionContext';
import { DriverShell } from '../components/driver/DriverShell';
import { Today } from '../pages/driver/Today';
import { TripComplete } from '../pages/driver/TripComplete';
import { DeliveryOutcome } from '../pages/driver/DeliveryOutcome';

afterEach(cleanup);
URL.createObjectURL = () => 'blob:preview';
URL.revokeObjectURL = () => undefined;
const attempt = { id: 'attempt', name: 'attempt.jpg', url: 'blob:preview', file: new File(['x'], 'attempt.jpg', { type: 'image/jpeg' }) };
const attachPhoto = () => fireEvent.change(document.querySelector('input[type=file]')!, { target: { files: [attempt.file] } });
const items = TRIPS[0].stops[0].items;
const full: DeliveryDraft = { outcome: 'full', quantities: Object.fromEntries(items.map(i => [i.id, i.planned])), recipient: 'Receiver', signature: '<svg/>', photos: [] };
describe('outcome rules', () => {
  it('accepts full without a reason or photo', () => expect(validateDelivery(items, full)).toBeNull());
  it('requires receiver/signature for successful delivery', () => expect(validateDelivery(items, { ...full, signature: undefined })).toMatch(/signature/));
  it.each(['Outlet closed', 'Receiver unavailable'])('allows failed %s without recipient/signature', reason => expect(validateDelivery(items, { outcome: 'failed', reason, quantities: Object.fromEntries(items.map(i => [i.id, 0])), photos: [attempt] })).toBeNull());
  it('requires photo evidence for failed attempts and damaged goods', () => {
    expect(validateDelivery(items, { outcome: 'failed', reason: 'Outlet closed', quantities: Object.fromEntries(items.map(i => [i.id, 0])), photos: [] })).toMatch(/photo/);
    expect(validateDelivery(items, { ...full, outcome: 'partial', reason: 'Damaged', quantities: { ...full.quantities, [items[0].id]: 1 } })).toMatch(/photo/);
  });
  it('rejects excessive, negative and fractional quantities', () => { for (const value of [items[0].planned + 1, -1, 0.5]) expect(validateDelivery(items, { ...full, quantities: { ...full.quantities, [items[0].id]: value } })).toMatch(/quantities/); });
  it('requires a meaningful partial result and reason', () => {
    expect(validateDelivery(items, { ...full, outcome: 'partial', reason: 'Short-dated' })).toMatch(/Partial/);
    expect(validateDelivery(items, { ...full, outcome: 'partial' })).toMatch(/reason/);
    expect(validateDelivery(items, { ...full, outcome: 'partial', reason: 'Short-dated', quantities: { ...full.quantities, [items[0].id]: 1 } })).toBeNull();
  });
  it('respects actual loaded quantity', () => expect(validateDelivery([{ ...items[0], loaded: 1 }], full)).toMatch(/available/));
});
let driver: ReturnType<typeof useDriver>;
function Probe() { driver = useDriver(); return <p>{driver.getStopRecord(TRIPS[0].id, 1).syncState}</p>; }
function connected(): DriverIntegration {
  return { getSnapshot: () => ({ trips: TRIPS, stopRecords: {}, departedTrips: {}, actions: [], lastSyncedAt: 'Never' }), subscribe: () => () => undefined, submit: async () => 'Saved on phone', retryAction: async () => undefined, acknowledgeConflict: async () => undefined };
}
describe('Driver flow', () => {
  it('shows loader flag and gates departure', () => {
    render(<DriverProvider><MemoryRouter initialEntries={['/trips/trip-1/check']}><Routes><Route path="/trips/:tripId/check" element={<TripCheck/>}/></Routes></MemoryRouter></DriverProvider>);
    expect(screen.getAllByText(TRIPS[0].loaderFlag!).length).toBeGreaterThan(0);
    const button = screen.getByRole('button', {name: /Depart/}) as HTMLButtonElement;
    expect(button.disabled).toBe(true); fireEvent.click(screen.getByRole('checkbox')); expect(button.disabled).toBe(false);
  });
  it('departure does not deliver any stop; outcome preserves data and rejects repeats', async () => {
    render(<DriverProvider><Probe/></DriverProvider>);
    await act(async () => { driver.acknowledgeLoaderFlags('trip-1', true); });
    await act(async () => { await driver.departTrip('trip-1'); });
    expect(driver.getStopRecord('trip-1', 1).status).toBe('Out for delivery');
    await act(async () => { await driver.recordArrival('trip-1', 1, 'now'); });
    const partial: DeliveryDraft = {...full, outcome: 'partial', reason: 'Short-dated', quantities: {...full.quantities, [items[0].id]: 1}};
    await act(async () => { await driver.completeDelivery('trip-1', 1, partial, 'now'); });
    expect(driver.getStopRecord('trip-1', 1).delivery).toEqual(partial);
    expect(driver.getStopRecord('trip-1', 1).status).toBe('Partially delivered');
    expect(driver.getStopRecord('trip-1', 1).syncState).toBe('Demo only');
    await expect(driver.completeDelivery('trip-1', 1, partial, 'now')).rejects.toThrow(/arrival/);
  });
  it('does not claim acceptance when integration fails', async () => {
    const integration = connected(); integration.submit = async () => { throw new Error('Server unavailable'); };
    render(<DriverProvider integration={integration}><Probe/></DriverProvider>);
    await act(async () => driver.acknowledgeLoaderFlags('trip-1', true));
    await act(async () => { await expect(driver.departTrip('trip-1')).rejects.toThrow('Server unavailable'); });
    expect(driver.departedTrips['trip-1']).toBeUndefined();
  });
  it('failed delivery form hides impossible POD fields', () => {
    const integration = connected(); integration.getSnapshot = () => ({trips: TRIPS, departedTrips: {'trip-1': true}, stopRecords: {'trip-1-1': {status: 'Arrived', photoCount: 0}}, actions: [], lastSyncedAt: 'Never'});
    render(<DriverProvider integration={integration}><MemoryRouter initialEntries={['/trips/trip-1/stops/1/delivery']}><Routes><Route path="/trips/:tripId/stops/:sequence/delivery" element={<DeliveryOutcome/>}/></Routes></MemoryRouter></DriverProvider>);
    fireEvent.click(screen.getByRole('radio', {name: 'Failed'})); fireEvent.click(screen.getByRole('button', {name: 'Receiver unavailable'}));
    expect(screen.queryByLabelText('Recipient name')).toBeNull();
    expect((screen.getByRole('button', {name: 'Complete delivery'}) as HTMLButtonElement).disabled).toBe(true);
    attachPhoto();
    expect((screen.getByRole('button', {name: 'Complete delivery'}) as HTMLButtonElement).disabled).toBe(false);
  });
  it.each(['Pending', 'Syncing', 'Synced', 'Saved on phone', 'Failed', 'Conflict'] as const)('renders exact queue state %s', state => { render(<SyncIndicator state={state}/>); expect(screen.getByText(state)).toBeTruthy(); });
});

describe('integration acceptance', () => {
  it('passes shared IDs and complete POD files to the service and blocks concurrent submission', async () => {
    const integration = connected();
    const stop = {...TRIPS[0].stops[0], id: 'shared-stop', orderId: 'shared-order'};
    let snapshot: ReturnType<DriverIntegration['getSnapshot']> = {trips: [{...TRIPS[0], stops: [stop]}], stopRecords: {'trip-1-1': {status: 'Arrived' as const, photoCount: 0}}, departedTrips: {'trip-1': true}, actions: [], lastSyncedAt: 'Never'};
    integration.getSnapshot = () => snapshot;
    let release!: (state: 'Saved on phone') => void;
    let received: unknown;
    integration.submit = action => { received = action; return new Promise(resolve => {release = resolve;}); };
    render(<DriverProvider integration={integration}><Probe/></DriverProvider>);
    const photo = {id: 'photo', name: 'evidence.jpg', url: 'blob:preview', file: new File(['evidence'], 'evidence.jpg', {type: 'image/jpeg'})};
    const draft = {...full, photos: [photo]};
    let pending!: Promise<unknown>;
    await act(async () => { pending = driver.completeDelivery('trip-1', 1, draft, 'now'); });
    await expect(driver.completeDelivery('trip-1', 1, draft, 'now')).rejects.toThrow(/processed/);
    expect(received).toEqual({kind: 'outcome', tripId: 'trip-1', sequence: 1, stopId: 'shared-stop', orderId: 'shared-order', delivery: draft, at: 'now'});
    // The adapter's snapshot now reports the stop resolved, which is what blocks a repeat in connected mode.
    snapshot = {...snapshot, stopRecords: {'trip-1-1': {status: 'Delivered', syncState: 'Saved on phone', photoCount: 1}}};
    await act(async () => {release('Saved on phone'); await pending;});
    await expect(driver.completeDelivery('trip-1', 1, draft, 'now')).rejects.toThrow(/arrival/);
  });
  it('uses queue subscription for pending, syncing, failed and conflict states on arbitrary IDs', async () => {
    const integration = connected();
    let listener!: () => void;
    let snapshot = {...integration.getSnapshot(), actions: [{id: 'action-42', tripId: 'shared-trip-93', sequence: 8, kind: 'outcome' as const, state: 'Pending' as import('../types/driver').SyncState, message: 'Waiting'}]};
    integration.getSnapshot = () => snapshot;
    integration.subscribe = callback => {listener = callback; return () => undefined;};
    render(<DriverProvider integration={integration}><Probe/></DriverProvider>);
    expect(driver.actions[0].state).toBe('Pending');
    for (const state of ['Syncing', 'Failed', 'Conflict', 'Synced'] as const) {
      await act(async () => {snapshot = {...snapshot, actions: [{...snapshot.actions[0], state}]}; listener();});
      expect(driver.actions[0].state).toBe(state);
      expect(driver.actions[0].tripId).toBe('shared-trip-93');
      expect(driver.conflictPending).toBe(state === 'Conflict');
    }
  });
});

it('keeps the accepted outcome confirmation visible when the context resolves the stop', async () => {
  render(<DriverProvider><Probe/><MemoryRouter initialEntries={['/trips/trip-1/stops/1/delivery']}><Routes><Route path="/trips/:tripId/stops/:sequence/delivery" element={<DeliveryOutcome/>}/></Routes></MemoryRouter></DriverProvider>);
  await act(async () => driver.acknowledgeLoaderFlags('trip-1', true));
  await act(async () => {await driver.departTrip('trip-1');});
  await act(async () => {await driver.recordArrival('trip-1', 1, 'now');});
  fireEvent.click(screen.getByRole('radio', {name: 'Failed'}));
  fireEvent.click(screen.getByRole('button', {name: 'Outlet closed'}));
  attachPhoto();
  await act(async () => fireEvent.click(screen.getByRole('button', {name: 'Complete delivery'})));
  expect(screen.getByRole('button', {name: 'Continue route'})).toBeTruthy();
});


it('renders the core route and visible retry/review controls for arbitrary conflicted actions', async () => {
  const integration = connected();
  integration.getSnapshot = () => ({trips: [], stopRecords: {}, departedTrips: {}, lastSyncedAt: 'Never', actions: [{id: 'conflict-93', tripId: 'shared-trip', sequence: 8, kind: 'outcome', state: 'Conflict', message: 'Stop reassigned'}]});
  integration.retryAction = vi.fn(async () => undefined);
  integration.acknowledgeConflict = vi.fn(async () => undefined);
  render(<SessionProvider><DriverProvider integration={integration}><MemoryRouter><Routes><Route element={<DriverShell/>}><Route index element={<Today/>}/></Route></Routes></MemoryRouter></DriverProvider></SessionProvider>);
  expect(screen.getByText(/shared-trip · Stop 8/)).toBeTruthy();
  expect(screen.getByText('No assigned released trips are available.')).toBeTruthy();
  expect(screen.getByText('Stop reassigned')).toBeTruthy();
  await act(async () => fireEvent.click(screen.getByRole('button', {name: 'Retry action'})));
  expect(integration.retryAction).toHaveBeenCalledWith('conflict-93');
  await act(async () => fireEvent.click(screen.getByRole('button', {name: 'Acknowledge review'})));
  expect(integration.acknowledgeConflict).toHaveBeenCalledWith('conflict-93');
});

it('summary distinguishes full, partial and failed stops', () => {
  const integration = connected();
  integration.getSnapshot = () => ({trips: [{...TRIPS[0], stops: TRIPS[0].stops.slice(0,3)}], departedTrips: {'trip-1': true}, actions: [], lastSyncedAt: 'Never', stopRecords: {'trip-1-1': {status: 'Delivered', photoCount: 0}, 'trip-1-2': {status: 'Partially delivered', photoCount: 0}, 'trip-1-3': {status: 'Failed', photoCount: 0}}});
  render(<DriverProvider integration={integration}><MemoryRouter initialEntries={['/trips/trip-1/complete']}><Routes><Route path="/trips/:tripId/complete" element={<TripComplete/>}/></Routes></MemoryRouter></DriverProvider>);
  for (const label of ['Delivered', 'Partial', 'Failed']) expect(screen.getByText(label).parentElement?.textContent).toBe(`1${label}`);
  expect(screen.queryByText('Synced')).toBeNull();
});
