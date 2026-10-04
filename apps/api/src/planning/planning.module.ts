import { DecisionsController } from './decisions.controller';
import { DecisionsService } from './decisions.service';
import { Module } from '@nestjs/common';
import { PlanningController, PlanningTripsController } from './planning.controller';
import { PlanningService } from './planning.service';
import { AuthModule } from '../auth/auth.module';
@Module({ imports: [AuthModule], controllers: [PlanningController, PlanningTripsController, DecisionsController], providers: [PlanningService, DecisionsService], exports: [PlanningService, DecisionsService] })
export class PlanningModule {}
