import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PlanningModule } from "../planning/planning.module";
import { LoadingController } from "./loading.controller";
@Module({
  imports: [AuthModule, PlanningModule],
  controllers: [LoadingController],
})
export class LoadingModule {}
