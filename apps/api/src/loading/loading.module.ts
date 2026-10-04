import { Module } from '@nestjs/common';
import { LoadingController } from './loading.controller';
import { LoadingService } from './loading.service';
import { TripLoadingController } from './trip-loading.controller';

@Module({
  controllers: [LoadingController, TripLoadingController],
  providers: [LoadingService],
  exports: [LoadingService],
})
export class LoadingModule {}
