import { Injectable } from "@nestjs/common";
import type { Actor } from "../auth/auth.service";
import { PrismaService } from "../prisma/prisma.service";
import { fail } from "../common/api-error";
import { date } from "../planning/planning.input";
import { eligibleRun } from "../workflow/orders.service";
export function colomboClock(now: Date) {
  const shifted = new Date(now.getTime() + 330 * 60000);
  return {
    date: shifted.toISOString().slice(0, 10),
    minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  };
}
@Injectable()
export class OrderPolicyService {
  constructor(private readonly prisma: PrismaService) {}
  async scheduling(
    actor: Actor,
    query: Record<string, unknown>,
    now = new Date(),
  ) {
    if (actor.role !== "STORE_MANAGER" || !actor.outletId)
      fail(403, "FORBIDDEN", "A Store outlet is required.");
    const outlet = await this.prisma.outlet.findUnique({
      where: { id: actor.outletId },
    });
    if (!outlet) fail(403, "FORBIDDEN", "Store outlet not found.");
    if (
      outlet.brand === "STYLE" &&
      (!outlet.scheduledWeekday || outlet.scheduledWeekday > 6)
    )
      fail(
        422,
        "SCHEDULE_NOT_CONFIGURED",
        "Configure this outlet’s weekly delivery day.",
      );
    const clock = colomboClock(now);
    const requestedDate =
      query.requestedDate === undefined
        ? clock.date
        : date(query.requestedDate);
    const days = await this.prisma.operatingDay.findMany({
      where: { operating: true, date: { gte: new Date(requestedDate) } },
      orderBy: { date: "asc" },
      take: 366,
    });
    const run = eligibleRun(days, outlet, now);
    if (!run)
      fail(
        422,
        "NO_ELIGIBLE_RUN",
        "No eligible future run exists in the operating calendar.",
      );
    const effectiveDate = run.date.toISOString().slice(0, 10);
    return {
      timezone: "Asia/Colombo",
      cutoff: "16:00",
      serverDate: clock.date,
      afterCutoff: clock.minutes >= 16 * 60,
      requestedDate,
      effectiveDate,
      rolledOver: effectiveDate !== requestedDate,
      scheduledWeekday: outlet.scheduledWeekday,
    };
  }
}
