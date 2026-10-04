import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthGuard, type AuthRequest } from "./auth.guard";
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post("login")
  @HttpCode(200)
  login(@Body() body: unknown) {
    return this.auth.login(body);
  }
  @Get("me")
  @UseGuards(AuthGuard)
  me(@Req() request: AuthRequest) {
    return this.auth.view(request.user);
  }
}
