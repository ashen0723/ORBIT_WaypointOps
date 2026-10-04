import { Injectable, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export function colomboClock(now: Date) {
  const shifted = new Date(now.getTime() + 330 * 60000);
  return { date: shifted.toISOString().slice(0, 10), minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes() };
}
@Injectable()
export class OrderPolicyService {
  constructor(private readonly prisma: PrismaService) {}
  async scheduling(requestedDate?: string, now = new Date()) {
    const clock = colomboClock(now);
    const days = await this.prisma.operatingDay.findMany({
      where: { date: { gt: new Date(`${clock.date}T00:00:00Z`) }, isOperating: true },
      orderBy: { date: 'asc' }, take: 2,
    });
    const afterCutoff = clock.minutes >= 16 * 60;
    if (days.length < (afterCutoff ? 2 : 1)) {
      throw new ServiceUnavailableException({ code: 'CALENDAR_UNAVAILABLE', message: 'The operating calendar needs more dates. Ask the administrator to import it.' });
    }
    const earliest = days[afterCutoff ? 1 : 0].date.toISOString().slice(0, 10);
    if (!requestedDate) return { timezone: 'Asia/Colombo', cutoff: '16:00', serverDate: clock.date, afterCutoff, earliestDeliveryDate: earliest };
    if (requestedDate <= clock.date) throw new UnprocessableEntityException({ code: 'INVALID_DELIVERY_DATE', message: 'Choose a future delivery date.' });
    const day = await this.prisma.operatingDay.findUnique({ where: { date: new Date(`${requestedDate}T00:00:00Z`) } });
    if (!day) throw new UnprocessableEntityException({ code: 'DATE_OUTSIDE_CALENDAR', message: 'The requested date is outside the loaded operating calendar.' });
    if (!day.isOperating) throw new UnprocessableEntityException({ code: 'NON_OPERATING_DATE', message: 'Choose an operating delivery date.' });
    const effectiveDate = requestedDate < earliest ? earliest : requestedDate;
    return { timezone: 'Asia/Colombo', cutoff: '16:00', serverDate: clock.date, afterCutoff, earliestDeliveryDate: earliest,
      originalRequestedDate: requestedDate, effectiveDate, rolledOver: effectiveDate !== requestedDate };
  }
}
