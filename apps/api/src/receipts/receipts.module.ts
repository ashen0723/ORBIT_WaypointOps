import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { WorkflowModule } from "../workflow/workflow.module";
import { ReceiptsController } from "./receipts.controller";
@Module({
  imports: [AuthModule, WorkflowModule],
  controllers: [ReceiptsController],
})
export class ReceiptsModule {}
