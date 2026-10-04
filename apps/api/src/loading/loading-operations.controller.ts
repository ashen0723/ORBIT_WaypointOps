import { Controller, Param, Post, Req } from '@nestjs/common';
import { LoadingService } from './loading.service';
import type { LoadingStartResult } from './loading.types';
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
}
