import { ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  async function controllerWith(queryRaw: jest.Mock) {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: { $queryRaw: queryRaw } }],
    }).compile();
    return moduleRef.get(HealthController);
  }

  it('reports ok when the database answers', async () => {
    const controller = await controllerWith(jest.fn().mockResolvedValue([{ '?column?': 1 }]));
    await expect(controller.check()).resolves.toEqual({ status: 'ok', db: 'up' });
  });

  it('returns 503 with a degraded body when the database is unreachable', async () => {
    const controller = await controllerWith(jest.fn().mockRejectedValue(new Error('connection refused')));
    const result = controller.check();
    await expect(result).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(result).rejects.toMatchObject({ response: { status: 'degraded', db: 'down' } });
  });
});
