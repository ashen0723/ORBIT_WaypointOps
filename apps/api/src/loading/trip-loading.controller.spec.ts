import { TripLoadingController } from './trip-loading.controller';
import type { LoadingService } from './loading.service';

describe('TripLoadingController', () => {
  const getLoadingTrip = jest.fn();
  const markTripReady = jest.fn();
  const controller = new TripLoadingController({
    getLoadingTrip,
    markTripReady,
  } as unknown as LoadingService);

  beforeEach(() => {
    getLoadingTrip.mockReset();
    markTripReady.mockReset();
  });

  it('retrieves a trip within the authenticated Loader depot', async () => {
    getLoadingTrip.mockResolvedValue({ tripId: 'TRIP-1' });

    await expect(controller.getLoadingTrip('TRIP-1', {
      user: { id: 'USR-LDR', role: 'LOADER', depotId: 'DEP-PLG' },
    })).resolves.toEqual({ tripId: 'TRIP-1' });

    expect(getLoadingTrip).toHaveBeenCalledWith('TRIP-1', 'DEP-PLG');
  });

  it('marks a trip ready as the authenticated Loader', async () => {
    markTripReady.mockResolvedValue({ tripId: 'TRIP-1', tripStatus: 'READY' });

    await expect(controller.markReady('TRIP-1', {
      user: { id: 'USR-LDR', role: 'LOADER', depotId: 'DEP-PLG' },
    })).resolves.toEqual({ tripId: 'TRIP-1', tripStatus: 'READY' });

    expect(markTripReady).toHaveBeenCalledWith('TRIP-1', {
      id: 'USR-LDR', role: 'LOADER', depotId: 'DEP-PLG',
    });
  });
});
