import { Controller, Get, Param } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // GET /users/driver/:userId/profile
  @Get('driver/:userId/profile')
  getDriverProfile(@Param('userId') userId: string) {
    return this.usersService.getDriverProfile(userId);
  }
}