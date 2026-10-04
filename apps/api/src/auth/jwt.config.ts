import { ConfigService } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';

export function jwtOptions(config: ConfigService): JwtModuleOptions {
  const secret = config.get<string>('JWT_SECRET');
  if (!secret?.trim()) throw new Error('JWT_SECRET must be configured');
  const expiresIn = config.get<string>('JWT_EXPIRES_IN') ?? '12h';
  // Accept positive durations in the documented format, or positive integer seconds.
  if (!/^[1-9]\d*(?:ms|s|m|h|d|w|y)?$/.test(expiresIn)) {
    throw new Error('JWT_EXPIRES_IN must be a positive duration such as 15m or 12h');
  }
  return {
    secret,
    signOptions: {
      algorithm: 'HS256',
      expiresIn: /^\d+$/.test(expiresIn)
        ? Number(expiresIn)
        : expiresIn as NonNullable<JwtModuleOptions['signOptions']>['expiresIn'],
    },
    verifyOptions: { algorithms: ['HS256'] },
  };
}
