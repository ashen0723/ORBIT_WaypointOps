import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { WorkflowModule } from "../workflow/workflow.module";
import { DeliveryController } from "./delivery.controller";
@Module({
  imports: [AuthModule, WorkflowModule],
  controllers: [DeliveryController],
})
export class DeliveryModule {}
