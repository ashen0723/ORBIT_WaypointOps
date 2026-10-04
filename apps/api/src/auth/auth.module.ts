import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard, StoreManagerGuard } from './auth.guard';

@Global()
@Module({
  imports: [JwtModule.registerAsync({ useFactory: () => {
    const secret = process.env.JWT_SECRET;
    if (!secret || (process.env.NODE_ENV === 'production' && (secret.length < 32 || secret === 'replace-with-a-long-random-value'))) {
      throw new Error('Set JWT_SECRET in the root .env (at least 32 characters in production).');
    }
    return { secret };
  } })],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, StoreManagerGuard],
  exports: [AuthService, JwtAuthGuard, StoreManagerGuard, JwtModule],
})
export class AuthModule {}
