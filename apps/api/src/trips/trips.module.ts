import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PlanningModule } from "../planning/planning.module";
import { WorkflowModule } from "../workflow/workflow.module";
import { UsersModule } from "../users/users.module";
import { UsersController } from "../users/users.controller";
import { TripsController } from "./trips.controller";
import { TripsService } from "./trips.service";
@Module({
  imports: [AuthModule, PlanningModule, WorkflowModule, UsersModule],
  controllers: [TripsController, UsersController],
  providers: [TripsService],
})
export class TripsModule {}
