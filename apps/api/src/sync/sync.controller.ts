import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard, Roles, type AuthRequest } from "../auth/auth.guard";
import { FieldService } from "../workflow/field.service";
import { SyncService } from "./sync.service";
@Controller()
@UseGuards(AuthGuard)
@Roles("DRIVER")
export class SyncController {
  constructor(
    private readonly field: FieldService,
    private readonly actions: SyncService,
  ) {}
  @Post("sync/actions") @HttpCode(200) @Roles("DRIVER") sync(
    @Req() r: AuthRequest,
    @Body() b: unknown,
  ) {
    return this.field.sync(r.user, b);
  }
  @Get("sync/actions/:clientActionId")
  get(@Req() r: AuthRequest, @Param("clientActionId") id: string) {
    return this.actions.getAction(r.user, id);
  }
}
