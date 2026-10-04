import { OrderPolicyService, colomboClock } from './order-policy.service';
import { PrismaService } from '../prisma/prisma.service';

describe('Order cutoff and operating dates', () => {
  function policy() {
    const prisma = { operatingDay: {
      findMany: jest.fn().mockResolvedValue([{ date: new Date('2026-10-05') }, { date: new Date('2026-10-06') }]),
      findUnique: jest.fn().mockResolvedValue({ date: new Date('2026-10-05'), isOperating: true }),
    } };
    return { service: new OrderPolicyService(prisma as unknown as PrismaService), prisma };
  }
  it('uses Sri Lanka time rather than machine timezone', () => {
    expect(colomboClock(new Date('2026-10-03T20:00:00Z'))).toEqual({ date: '2026-10-04', minutes: 90 });
  });
  it('keeps Monday before the cutoff', async () => {
    const { service } = policy();
    await expect(service.scheduling('2026-10-05', new Date('2026-10-04T10:29:59Z'))).resolves.toMatchObject({ effectiveDate: '2026-10-05', rolledOver: false });
  });
  it('rolls Monday to Tuesday exactly at 16:00 Colombo', async () => {
    const { service } = policy();
    await expect(service.scheduling('2026-10-05', new Date('2026-10-04T10:30:00Z'))).resolves.toMatchObject({ effectiveDate: '2026-10-06', rolledOver: true });
  });
  it('does not pull a later requested date forward', async () => {
    const { service } = policy();
    await expect(service.scheduling('2026-10-10', new Date('2026-10-04T12:00:00Z'))).resolves.toMatchObject({ effectiveDate: '2026-10-10', rolledOver: false });
  });
  it('rejects non-operating dates', async () => {
    const { service, prisma } = policy();
    prisma.operatingDay.findUnique.mockResolvedValue({ date: new Date('2026-10-11'), isOperating: false });
    await expect(service.scheduling('2026-10-11', new Date('2026-10-04T09:00:00Z'))).rejects.toMatchObject({ response: { code: 'NON_OPERATING_DATE' } });
  });
  it('fails clearly when calendar coverage is insufficient', async () => {
    const { service, prisma } = policy();
    prisma.operatingDay.findMany.mockResolvedValue([]);
    await expect(service.scheduling(undefined, new Date('2026-10-04T09:00:00Z'))).rejects.toMatchObject({ response: { code: 'CALENDAR_UNAVAILABLE' } });
  });
});
