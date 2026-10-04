import {
  Controller,
  ForbiddenException,
  Get,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { LoadingService } from './loading.service';
import type { LoaderTripSummary } from './loading.types';

interface AuthenticatedLoaderRequest {
  user?: {
    id: string;
    role: string;
    depotId?: string | null;
  };
}

@Controller('loader')
export class LoadingController {
  constructor(private readonly loadingService: LoadingService) {}

  @Get('trips')
  listTrips(@Req() request: AuthenticatedLoaderRequest): Promise<LoaderTripSummary[]> {
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Log in to view Loader trips.');
    }

    if (user.role !== 'LOADER') {
      throw new ForbiddenException('Only Loader users may view the loading queue.');
    }

    if (!user.depotId) {
      throw new ForbiddenException('This Loader account is not assigned to a depot.');
    }

    return this.loadingService.listPublishedTrips(user.depotId);
  }
}
