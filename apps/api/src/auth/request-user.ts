import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Role } from '../generated/prisma/client';

export interface RequestUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  outletId: string | null;
  depotId: string | null;
  vehicleId: string | null;
}
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): RequestUser => ctx.switchToHttp().getRequest().user);
