import { Controller, Get, Param, Post, Req } from '@nestjs/common';
import { LoadingService } from './loading.service';
import type { LoaderTripDetail, ReadyTripResult } from './loading.types';
import { requireLoader, type AuthenticatedLoaderRequest } from './loader-auth';

@Controller('trips')
export class TripLoadingController {
  constructor(private readonly loadingService: LoadingService) {}

  @Get(':tripId/loading')
  getLoadingTrip(
    @Param('tripId') tripId: string,
    @Req() request: AuthenticatedLoaderRequest,
  ): Promise<LoaderTripDetail> {
    const user = requireLoader(request);
    return this.loadingService.getLoadingTrip(tripId, user.depotId);
  }

  @Post(':tripId/ready')
  markReady(
    @Param('tripId') tripId: string,
    @Req() request: AuthenticatedLoaderRequest,
  ): Promise<ReadyTripResult> {
    const loader = requireLoader(request);
    return this.loadingService.markTripReady(tripId, loader);
  }
}
