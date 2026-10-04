import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { LoadingController } from './loading.controller';
import type { LoadingService } from './loading.service';

describe('LoadingController', () => {
  const listPublishedTrips = jest.fn();
  const controller = new LoadingController({ listPublishedTrips } as unknown as LoadingService);

  beforeEach(() => listPublishedTrips.mockReset());

  it('lists trips for the authenticated Loader depot', async () => {
    listPublishedTrips.mockResolvedValue([{ tripId: 'TRIP-1' }]);

    await expect(controller.listTrips({
      user: { id: 'USR-LDR', role: 'LOADER', depotId: 'DEP-PLG' },
    })).resolves.toEqual([{ tripId: 'TRIP-1' }]);

    expect(listPublishedTrips).toHaveBeenCalledWith('DEP-PLG');
  });

  it('rejects an unauthenticated request', () => {
    expect(() => controller.listTrips({})).toThrow(UnauthorizedException);
  });

  it('rejects a non-Loader role', () => {
    expect(() => controller.listTrips({
      user: { id: 'USR-DSP', role: 'DISPATCHER', depotId: 'DEP-PLG' },
    })).toThrow(ForbiddenException);
  });

  it('rejects a Loader without a depot', () => {
    expect(() => controller.listTrips({
      user: { id: 'USR-LDR', role: 'LOADER', depotId: null },
    })).toThrow(ForbiddenException);
  });
});
