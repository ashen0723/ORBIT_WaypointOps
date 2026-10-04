import type { LoadingService } from './loading.service';
import { LoadingOperationsController } from './loading-operations.controller';

describe('LoadingOperationsController', () => {
  const startLoading = jest.fn();
  const updateLoadedQuantity = jest.fn();
  const reportIssue = jest.fn();
  const acknowledgeIssue = jest.fn();
  const controller = new LoadingOperationsController({
    startLoading,
    updateLoadedQuantity,
    reportIssue,
    acknowledgeIssue,
  } as unknown as LoadingService);

  beforeEach(() => {
    startLoading.mockReset();
    updateLoadedQuantity.mockReset();
    reportIssue.mockReset();
    acknowledgeIssue.mockReset();
  });

  it('starts loading as the authenticated Loader', async () => {
    startLoading.mockResolvedValue({ loadingRecordId: 'LOAD-1' });

    await expect(controller.startLoading('TRIP-1', {
      user: { id: 'USR-LDR', role: 'LOADER', depotId: 'DEP-PLG' },
    })).resolves.toEqual({ loadingRecordId: 'LOAD-1' });

    expect(startLoading).toHaveBeenCalledWith('TRIP-1', {
      id: 'USR-LDR', role: 'LOADER', depotId: 'DEP-PLG',
    });
  });

  it('updates a loaded quantity as the authenticated Loader', async () => {
    updateLoadedQuantity.mockResolvedValue({ orderLineId: 'LINE-1', loadedQty: 16 });

    await expect(controller.updateLoadedQuantity('LINE-1', { loadedQty: 16 }, {
      user: { id: 'USR-LDR', role: 'LOADER', depotId: 'DEP-PLG' },
    })).resolves.toEqual({ orderLineId: 'LINE-1', loadedQty: 16 });

    expect(updateLoadedQuantity).toHaveBeenCalledWith('LINE-1', 16, {
      id: 'USR-LDR', role: 'LOADER', depotId: 'DEP-PLG',
    });
  });

  it('reports a loading issue as the authenticated Loader', async () => {
    reportIssue.mockResolvedValue({ issueId: 'ISSUE-1' });
    const body = {
      orderLineId: 'LINE-1', type: 'MISSING' as const, availableQty: 16,
      note: 'Four cases unavailable', evidenceRef: 'uploads/issues/photo.jpg',
    };

    await expect(controller.reportIssue('TRIP-1', body, {
      user: { id: 'USR-LDR', role: 'LOADER', depotId: 'DEP-PLG' },
    })).resolves.toEqual({ issueId: 'ISSUE-1' });

    expect(reportIssue).toHaveBeenCalledWith('TRIP-1', body, {
      id: 'USR-LDR', role: 'LOADER', depotId: 'DEP-PLG',
    });
  });

  it('acknowledges a Dispatcher decision as the authenticated Loader', async () => {
    acknowledgeIssue.mockResolvedValue({ issueId: 'ISSUE-1', alreadyAcknowledged: false });

    await expect(controller.acknowledgeIssue('ISSUE-1', {
      user: { id: 'USR-LDR', role: 'LOADER', depotId: 'DEP-PLG' },
    })).resolves.toEqual({ issueId: 'ISSUE-1', alreadyAcknowledged: false });

    expect(acknowledgeIssue).toHaveBeenCalledWith('ISSUE-1', {
      id: 'USR-LDR', role: 'LOADER', depotId: 'DEP-PLG',
    });
  });
});
