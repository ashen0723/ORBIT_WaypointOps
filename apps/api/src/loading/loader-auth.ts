import { ForbiddenException, UnauthorizedException } from '@nestjs/common';

export interface AuthenticatedLoaderRequest {
  user?: {
    id: string;
    role: string;
    depotId?: string | null;
  };
}

export interface LoaderIdentity {
  id: string;
  role: 'LOADER';
  depotId: string;
}

export function requireLoader(request: AuthenticatedLoaderRequest): LoaderIdentity {
  const user = request.user;

  if (!user) {
    throw new UnauthorizedException('Log in to access Loader work.');
  }

  if (user.role !== 'LOADER') {
    throw new ForbiddenException('Only Loader users may access Loader work.');
  }

  if (!user.depotId) {
    throw new ForbiddenException('This Loader account is not assigned to a depot.');
  }

  return { id: user.id, role: 'LOADER', depotId: user.depotId };
}
