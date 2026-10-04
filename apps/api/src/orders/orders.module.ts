import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { WorkflowModule } from "../workflow/workflow.module";
import { OrdersController } from "./orders.controller";
import { OrderPolicyService } from "./order-policy.service";
@Module({
  imports: [AuthModule, WorkflowModule],
  controllers: [OrdersController],
  providers: [OrderPolicyService],
})
export class OrdersModule {}
