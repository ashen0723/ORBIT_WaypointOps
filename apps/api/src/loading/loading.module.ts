import { Module } from '@nestjs/common';
import { LoadingController } from './loading.controller';
import { LoadingService } from './loading.service';
import { TripLoadingController } from './trip-loading.controller';
import { LoadingOperationsController } from './loading-operations.controller';

@Module({
  controllers: [LoadingController, TripLoadingController, LoadingOperationsController],
  providers: [LoadingService],
  exports: [LoadingService],
})
export class LoadingModule {}
