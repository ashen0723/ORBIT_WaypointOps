import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { AuthGuard, Roles, type AuthRequest } from "../auth/auth.guard";
import { OutletsService } from "./outlets.service";
@Controller("outlets")
@UseGuards(AuthGuard)
export class OutletsController {
  constructor(private readonly outlets: OutletsService) {}
  @Get("me")
  @Roles("STORE_MANAGER")
  me(@Req() r: AuthRequest) {
    return this.outlets.me(r.user);
  }
}
