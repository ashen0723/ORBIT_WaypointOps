import { Injectable } from "@nestjs/common";
import type { Actor } from "../auth/auth.service";
import { fail } from "../common/api-error";
import { PlanningService } from "../planning/planning.service";
import { FieldService } from "../workflow/field.service";
import { UsersService } from "../users/users.service";
@Injectable()
export class TripsService {
  constructor(
    private readonly planning: PlanningService,
    private readonly field: FieldService,
    private readonly users: UsersService,
  ) {}
  async today(
    actor: Actor,
    id: string,
    query: Record<string, unknown>,
    now = new Date(),
  ) {
    if (actor.role !== "DRIVER" || actor.id !== id)
      fail(403, "FORBIDDEN", "Drivers can read only their own trips.");
    const profile = await this.users.getDriverProfile(actor, id);
    const date = new Date(now.getTime() + 330 * 60000)
      .toISOString()
      .slice(0, 10);
    const page = profile.vehicle
      ? await this.planning.listTrips(actor, {
          limit: query.limit,
          cursor: query.cursor,
          date,
        })
      : { items: [], nextCursor: null };
    return { driver: profile, date, ...page };
  }
  orderDelivery(actor: Actor, id: string) {
    return this.field.orderDeliveries(actor, id);
  }
  async progress(actor: Actor, id: string) {
    const trip = await this.planning.getTrip(actor, id);
    const completed = trip.stops.filter((s) =>
      ["DELIVERED", "PARTIAL", "FAILED"].includes(s.status),
    ).length;
    return {
      trip,
      totalStops: trip.stops.length,
      completedStops: completed,
      remainingStops: trip.stops.length - completed,
    };
  }
}
