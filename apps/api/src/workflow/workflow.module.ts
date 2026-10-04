import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PlanningModule } from "../planning/planning.module";
import { ConnectedOrdersService } from "./orders.service";
import { ConnectedReceiptsService } from "./receipts.service";
import { FieldService } from "./field.service";
import { WorkflowController } from "./workflow.controller";
@Module({
  imports: [AuthModule, PlanningModule],
  controllers: [WorkflowController],
  providers: [ConnectedOrdersService, ConnectedReceiptsService, FieldService],
})
export class WorkflowModule {}
