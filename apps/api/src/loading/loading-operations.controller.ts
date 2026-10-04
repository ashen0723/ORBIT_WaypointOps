import { Body, Controller, Param, Patch, Post, Req } from '@nestjs/common';
import { LoadingService } from './loading.service';
import type {
  LoadedQuantityResult,
  LoadingStartResult,
  UpdateLoadedQuantityBody,
} from './loading.types';
import { requireLoader, type AuthenticatedLoaderRequest } from './loader-auth';

@Controller('loading')
export class LoadingOperationsController {
  constructor(private readonly loadingService: LoadingService) {}

  @Post(':tripId/start')
  startLoading(
    @Param('tripId') tripId: string,
    @Req() request: AuthenticatedLoaderRequest,
  ): Promise<LoadingStartResult> {
    const loader = requireLoader(request);
    return this.loadingService.startLoading(tripId, loader);
  }

  @Patch('lines/:lineId')
  updateLoadedQuantity(
    @Param('lineId') lineId: string,
    @Body() body: UpdateLoadedQuantityBody,
    @Req() request: AuthenticatedLoaderRequest,
  ): Promise<LoadedQuantityResult> {
    const loader = requireLoader(request);
    return this.loadingService.updateLoadedQuantity(lineId, body?.loadedQty, loader);
  }
}
