import type { LoadingService } from './loading.service';
import { LoadingOperationsController } from './loading-operations.controller';

describe('LoadingOperationsController', () => {
  const startLoading = jest.fn();
  const controller = new LoadingOperationsController({ startLoading } as unknown as LoadingService);

  beforeEach(() => startLoading.mockReset());

  it('starts loading as the authenticated Loader', async () => {
    startLoading.mockResolvedValue({ loadingRecordId: 'LOAD-1' });

    await expect(controller.startLoading('TRIP-1', {
      user: { id: 'USR-LDR', role: 'LOADER', depotId: 'DEP-PLG' },
    })).resolves.toEqual({ loadingRecordId: 'LOAD-1' });

    expect(startLoading).toHaveBeenCalledWith('TRIP-1', {
      id: 'USR-LDR', role: 'LOADER', depotId: 'DEP-PLG',
    });
  });
});
