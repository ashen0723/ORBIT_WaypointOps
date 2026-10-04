import { Module } from '@nestjs/common';
import { PlanningController, PlanningTripsController } from './planning.controller';
import { PlanningService } from './planning.service';
import { AuthModule } from '../auth/auth.module';
@Module({ imports: [AuthModule], controllers: [PlanningController, PlanningTripsController], providers: [PlanningService], exports: [PlanningService] })
export class PlanningModule {}
