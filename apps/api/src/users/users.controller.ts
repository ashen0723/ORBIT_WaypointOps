import { Controller, Get, Param, Req, UseGuards } from "@nestjs/common";
import { AuthGuard, Roles, type AuthRequest } from "../auth/auth.guard";
import { UsersService } from "./users.service";
@Controller("users")
@UseGuards(AuthGuard)
@Roles("DRIVER")
export class UsersController {
  constructor(private readonly users: UsersService) {}
  @Get("driver/:userId/profile")
  profile(@Req() r: AuthRequest, @Param("userId") id: string) {
    return this.users.getDriverProfile(r.user, id);
  }
}
