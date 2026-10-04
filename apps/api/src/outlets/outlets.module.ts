import { AuthModule } from "../auth/auth.module";
import { Module } from "@nestjs/common";
import { OutletsController } from "./outlets.controller";
import { OutletsService } from "./outlets.service";

@Module({
  imports: [AuthModule],
  controllers: [OutletsController],
  providers: [OutletsService],
  exports: [OutletsService],
})
export class OutletsModule {}
