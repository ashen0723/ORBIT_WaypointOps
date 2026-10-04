import {
  Controller,
  Get,
  Req,
} from '@nestjs/common';
import { LoadingService } from './loading.service';
import type { LoaderTripSummary } from './loading.types';
import { requireLoader, type AuthenticatedLoaderRequest } from './loader-auth';

@Controller('loader')
export class LoadingController {
  constructor(private readonly loadingService: LoadingService) {}

  @Get('trips')
  listTrips(@Req() request: AuthenticatedLoaderRequest): Promise<LoaderTripSummary[]> {
    const user = requireLoader(request);
    return this.loadingService.listPublishedTrips(user.depotId);
  }
}
