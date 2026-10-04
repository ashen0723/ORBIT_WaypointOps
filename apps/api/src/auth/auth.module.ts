import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { UsersModule } from "../users/users.module";
import { AuthGuard } from "./auth.guard";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { RolesGuard } from "./roles.guard";
import { jwtOptions } from "./jwt.config";
@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: jwtOptions,
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, JwtAuthGuard, RolesGuard],
  exports: [AuthService, AuthGuard, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
