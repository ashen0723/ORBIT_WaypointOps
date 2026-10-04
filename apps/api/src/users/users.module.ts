import { Module } from "@nestjs/common";
import { UsersService } from "./users.service";

// Profile controller is registered by TripsModule to avoid Auth -> Users -> Auth.
@Module({
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
