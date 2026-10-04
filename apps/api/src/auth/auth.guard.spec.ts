import { ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard, StoreManagerGuard } from './auth.guard';

describe('Store authentication guards', () => {
  const context = (request: unknown) => ({ switchToHttp: () => ({ getRequest: () => request }) }) as ExecutionContext;
  it('rejects missing and invalid tokens', async () => {
    const guard = new JwtAuthGuard({ verifyAsync: jest.fn().mockRejectedValue(new Error()) } as unknown as JwtService, {} as PrismaService);
    await expect(guard.canActivate(context({ headers: {} }))).rejects.toMatchObject({ response: { code: 'AUTH_REQUIRED' } });
    await expect(guard.canActivate(context({ headers: { authorization: 'Bearer forged' } }))).rejects.toMatchObject({ response: { code: 'INVALID_TOKEN' } });
  });
  it('rechecks current account status in the database', async () => {
    const guard = new JwtAuthGuard({ verifyAsync: jest.fn().mockResolvedValue({ sub: 'store' }) } as unknown as JwtService,
      { user: { findUnique: jest.fn().mockResolvedValue({ active: false }) } } as unknown as PrismaService);
    await expect(guard.canActivate(context({ headers: { authorization: 'Bearer valid' } }))).rejects.toMatchObject({ response: { code: 'INVALID_TOKEN' } });
  });
  it('blocks other roles and unassigned store accounts', () => {
    const guard = new StoreManagerGuard();
    expect(() => guard.canActivate(context({ user: { role: 'DRIVER' } }))).toThrow();
    expect(() => guard.canActivate(context({ user: { role: 'STORE_MANAGER', outletId: null } }))).toThrow();
    expect(guard.canActivate(context({ user: { role: 'STORE_MANAGER', outletId: 'OUT001' } }))).toBe(true);
  });
});
