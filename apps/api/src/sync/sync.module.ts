import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { WorkflowModule } from "../workflow/workflow.module";
import { SyncController } from "./sync.controller";
import { SyncService } from "./sync.service";
@Module({
  imports: [AuthModule, WorkflowModule],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}
