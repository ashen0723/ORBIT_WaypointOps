import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, StoreManagerGuard } from '../auth/auth.guard';
import { CurrentUser, RequestUser } from '../auth/request-user';
import { OutletsService } from './outlets.service';
@Controller('outlets')
@UseGuards(JwtAuthGuard, StoreManagerGuard)
export class OutletsController {
  constructor(private readonly outlets: OutletsService) {}
  @Get('me') me(@CurrentUser() user: RequestUser) { return this.outlets.me(user); }
}
