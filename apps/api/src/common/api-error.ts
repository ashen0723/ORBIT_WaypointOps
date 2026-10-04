import { HttpException } from '@nestjs/common';
import type { ErrorDetail } from '@waypoint/contracts';

export function fail(status: number, code: string, message: string, details: ErrorDetail[] = []): never {
  throw new HttpException({ code, message, details }, status);
}
