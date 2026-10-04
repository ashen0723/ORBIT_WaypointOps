import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './auth.guard';
import { CurrentUser, RequestUser } from './request-user';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Post('login') @HttpCode(200)
  login(@Body() body: unknown) { return this.authService.login(body); }
  @Get('me') @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: RequestUser) { return this.authService.publicUser(user); }
}
