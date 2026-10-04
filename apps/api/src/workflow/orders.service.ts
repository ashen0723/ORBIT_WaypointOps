import { Injectable } from "@nestjs/common";
import type { Actor } from "../auth/auth.service";
import { PrismaService } from "../prisma/prisma.service";
import { PlanningService, orderInclude } from "../planning/planning.service";
import { fail } from "../common/api-error";
import { date, localInstant, weekStart } from "../planning/planning.input";
import { object, text, list, count, unique, page, paged } from "./input";
import { Prisma, type OrderStatus } from "../generated/prisma/client";
export function runCutoff(day: string): Date {
  const previous = new Date(day);
  previous.setUTCDate(previous.getUTCDate() - 1);
  return localInstant(previous.toISOString().slice(0, 10), "16:00");
}
@Injectable()
export class ConnectedOrdersService {
  constructor(
    private readonly db: PrismaService,
    private readonly planning: PlanningService,
  ) {}
  async orderAccess(tx: Prisma.TransactionClient, actor: Actor, id: string) {
    const order = await tx.order.findUnique({
      where: { id },
      include: { outlet: true, stops: { include: { trip: true } } },
    });
    if (!order) fail(404, "NOT_FOUND", "Order not found.");
    if (
      actor.role === "DISPATCHER" ||
      (actor.role === "STORE_MANAGER" && actor.outletId === order.outletId) ||
      (actor.role === "LOADER" &&
        actor.depotId === order.outlet.depotId &&
        order.stops.some((s) => s.trip.publishedAt)) ||
      (actor.role === "DRIVER" &&
        order.stops.some(
          (s) => s.trip.driverId === actor.id && s.trip.publishedAt,
        ))
    )
      return order;
    fail(403, "FORBIDDEN", "Order is outside this account’s scope.");
  }
  async catalog(actor: Actor, query: Record<string, unknown>) {
    const outlet = actor.outletId
      ? await this.db.outlet.findUnique({ where: { id: actor.outletId } })
      : null;
    if (!outlet) fail(403, "FORBIDDEN", "Store account needs an outlet.");
    const { limit, cursor } = page(query);
    return paged(
      await this.db.catalogItem.findMany({
        where: {
          brand: outlet.brand,
          active: true,
          ...(cursor ? { id: { gt: cursor } } : {}),
        },
        orderBy: { id: "asc" },
        take: limit + 1,
        select: {
          id: true,
          name: true,
          unit: true,
          temp: true,
          unitWeightKg: true,
          unitVolumeM3: true,
        },
      }),
      limit,
    );
  }
  async create(actor: Actor, input: unknown) {
    const receivedAt = new Date(),
      body = object(input),
      requestedDate = date(body.requestedDate),
      temp = text(body.temp, "temp");
    if (!["AMBIENT", "CHILLED", "FROZEN"].includes(temp))
      fail(400, "INVALID_INPUT", "Invalid temperature.");
    const lines = list(body.lines).map((l) => ({
      id: text(l.catalogItemId, "catalogItemId"),
      qty: count(l.requestedQty),
    }));
    unique(lines.map((l) => l.id));
    if (lines.some((l) => l.qty === 0))
      fail(400, "INVALID_INPUT", "Requested quantities must be positive.");
    return this.planning.mutate(actor, "CREATE_ORDER", "", body, async (tx) => {
      const outlet = actor.outletId
        ? await tx.outlet.findUnique({ where: { id: actor.outletId } })
        : null;
      if (!outlet || actor.role !== "STORE_MANAGER")
        fail(403, "FORBIDDEN", "A Store outlet is required.");
      if (
        outlet.brand === "STYLE" &&
        (!outlet.scheduledWeekday || outlet.scheduledWeekday > 6)
      )
        fail(
          422,
          "SCHEDULE_NOT_CONFIGURED",
          "Configure this outlet’s weekly delivery day.",
        );
      const catalog = await tx.catalogItem.findMany({
        where: {
          id: { in: lines.map((l) => l.id) },
          active: true,
          brand: outlet.brand,
          temp: temp as "AMBIENT",
        },
      });
      if (catalog.length !== lines.length)
        fail(
          422,
          "INVALID_CATALOG_SELECTION",
          "Choose items belonging to this brand and temperature.",
        );
      const days = await tx.operatingDay.findMany({
        where: { operating: true, date: { gte: new Date(requestedDate) } },
        orderBy: { date: "asc" },
        take: 366,
      });
      const run = days.find(
        (d) =>
          d.date.getUTCDay() !== 0 &&
          (outlet.brand !== "STYLE" ||
            d.date.getUTCDay() === outlet.scheduledWeekday) &&
          receivedAt < runCutoff(d.date.toISOString().slice(0, 10)),
      );
      if (!run)
        fail(
          422,
          "NO_ELIGIBLE_RUN",
          "No eligible future run exists in the operating calendar.",
        );
      let units = 0,
        weightKg = 0,
        volumeM3 = 0;
      const create = lines.map((l) => {
        const item = catalog.find((c) => c.id === l.id)!;
        if (
          ![item.unitWeightKg, item.unitVolumeM3].every(
            (v) => Number.isFinite(v) && v >= 0,
          )
        )
          fail(
            422,
            "REFERENCE_DATA_MISSING",
            "Catalog load factors are invalid.",
          );
        units += l.qty;
        weightKg += item.unitWeightKg * l.qty;
        volumeM3 += item.unitVolumeM3 * l.qty;
        return {
          item: item.name,
          unit: item.unit,
          requestedQty: l.qty,
          unitWeightKg: item.unitWeightKg,
          unitVolumeM3: item.unitVolumeM3,
        };
      });
      if (units > 2147483647 || !Number.isFinite(weightKg + volumeM3))
        fail(422, "QUANTITY_EXCEEDED", "Order totals exceed supported limits.");
      const order = await tx.order.create({
        data: {
          outletId: outlet.id,
          createdById: actor.id,
          requestedDate: new Date(requestedDate),
          plannedDate: run.date,
          temp: temp as "AMBIENT",
          units,
          weightKg,
          volumeM3,
          lines: { create },
        },
        include: orderInclude,
      });
      await this.planning.audit(tx, actor, "Order", order.id, "CREATED", {
        receivedAt,
        requestedDate,
        plannedDate: run.date,
      });
      return {
        order: this.planning.orderView(order),
        receivedAt: receivedAt.toISOString(),
        cutoffApplied: receivedAt >= runCutoff(requestedDate),
        schedulingMessage:
          run.date.toISOString().slice(0, 10) !== requestedDate
            ? `Scheduled for ${run.date.toISOString().slice(0, 10)} under the cutoff/calendar rules.`
            : null,
      };
    });
  }
  async get(actor: Actor, id: string) {
    await this.orderAccess(this.db, actor, id);
    return this.planning.orderView(
      await this.db.order.findUniqueOrThrow({
        where: { id },
        include: orderInclude,
      }),
    );
  }
  async orders(actor: Actor, query: Record<string, unknown>) {
    const { limit, cursor } = page(query),
      where: Prisma.OrderWhereInput = {};
    if (actor.role === "STORE_MANAGER") {
      if (!actor.outletId) fail(403, "FORBIDDEN", "Store outlet missing.");
      where.outletId = actor.outletId;
    } else if (actor.role !== "DISPATCHER")
      fail(403, "FORBIDDEN", "Role cannot list orders.");
    if (cursor) where.id = { gt: cursor };
    if (query.date) where.plannedDate = new Date(date(query.date));
    if (query.depotId)
      where.outlet = { depotId: text(query.depotId, "depotId") };
    if (query.status) {
      const status = text(query.status, "status");
      if (
        ![
          "CONFIRMED",
          "PLANNED",
          "LOADING",
          "READY",
          "IN_TRANSIT",
          "DELIVERED",
          "RECEIVED",
          "DEFERRED",
        ].includes(status)
      )
        fail(400, "INVALID_INPUT", "Invalid status.");
      where.status = status as OrderStatus;
    }
    const orders = await this.db.order.findMany({
      where,
      include: orderInclude,
      orderBy: { id: "asc" },
      take: limit + 1,
    });
    return paged(
      orders.map((o) => this.planning.orderView(o)),
      limit,
    );
  }
  async vehicles(query: Record<string, unknown>) {
    const day = date(query.date),
      depotId = text(query.depotId, "depotId"),
      { limit, cursor } = page(query);
    const vehicles = await this.db.vehicle.findMany({
      where: { depotId, ...(cursor ? { id: { gt: cursor } } : {}) },
      include: {
        drivers: { where: { active: true, role: "DRIVER" } },
        trips: { where: { releasedAt: null } },
      },
      orderBy: { id: "asc" },
      take: limit + 1,
    });
    const availability = await this.db.vehicleAvailability.findMany({
      where: { date: new Date(day) },
    });
    return paged(
      vehicles.map((v) => {
        const week = weekStart(day),
          weekTrips = v.trips.filter(
            (t) => t.fuelWeekStart?.getTime() === week.getTime(),
          );
        const committedFuelL = weekTrips.reduce(
            (n, t) => n + t.committedFuelL,
            0,
          ),
          reservedFuelL = weekTrips.reduce((n, t) => n + t.reservedFuelL, 0);
        return {
          id: v.id,
          depotId: v.depotId,
          driverId: v.drivers.length === 1 ? v.drivers[0].id : null,
          type: v.type,
          temp: v.temp,
          weightCapKg: v.weightCapKg,
          volumeCapM3: v.volumeCapM3,
          kmPerL: v.kmPerL,
          weeklyFuelQuotaL: v.weeklyFuelQuotaL,
          availableOnDate:
            v.available &&
            !availability.some((a) => a.vehicleId === v.id && !a.available),
          fuelWeekStart: week.toISOString().slice(0, 10),
          committedFuelL,
          reservedFuelL,
          remainingFuelL: v.weeklyFuelQuotaL - committedFuelL - reservedFuelL,
          allocatedTripCountOnDate: v.trips.filter(
            (t) => t.date.toISOString().slice(0, 10) === day,
          ).length,
        };
      }),
      limit,
    );
  }
  depots() {
    return this.db.depot
      .findMany({ select: { id: true, name: true }, orderBy: { id: "asc" } })
      .then((items) => ({ items, nextCursor: null }));
  }
}
