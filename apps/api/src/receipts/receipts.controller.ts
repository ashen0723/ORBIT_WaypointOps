import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard, Roles, type AuthRequest } from "../auth/auth.guard";
import { ConnectedReceiptsService } from "../workflow/receipts.service";
@Controller("deliveries")
@UseGuards(AuthGuard)
export class ReceiptsController {
  constructor(private readonly receipts: ConnectedReceiptsService) {}
  @Get(":id/receipt")
  get(@Req() r: AuthRequest, @Param("id") id: string) {
    return this.receipts.get(r.user, id);
  }
  @Post(":id/confirm")
  @Roles("STORE_MANAGER")
  confirm(@Req() r: AuthRequest, @Param("id") id: string, @Body() b: unknown) {
    return this.receipts.confirm(r.user, id, b);
  }
}
