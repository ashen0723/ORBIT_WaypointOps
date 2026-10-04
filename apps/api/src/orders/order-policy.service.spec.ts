import { OrderPolicyService, colomboClock } from "./order-policy.service";
import { PrismaService } from "../prisma/prisma.service";
import type { Actor } from "../auth/auth.service";
const actor: Actor = {
  id: "store",
  role: "STORE_MANAGER",
  outletId: "outlet",
  depotId: null,
  vehicleId: null,
};
function fixture(brand = "FRESH", scheduledWeekday: number | null = null) {
  const db = {
    outlet: {
      findUnique: jest.fn().mockResolvedValue({ brand, scheduledWeekday }),
    },
    operatingDay: {
      findMany: jest
        .fn()
        .mockResolvedValue(
          ["2026-10-05", "2026-10-06", "2026-10-12"].map((d) => ({
            date: new Date(d),
          })),
        ),
    },
  };
  return {
    db,
    service: new OrderPolicyService(db as unknown as PrismaService),
  };
}
describe("Store policy matches order creation", () => {
  it("uses Colombo across the UTC date boundary", () => {
    expect(colomboClock(new Date("2026-10-03T20:00:00Z"))).toEqual({
      date: "2026-10-04",
      minutes: 90,
    });
  });
  it("closes Monday at exactly 16:00 on Sunday", async () => {
    const { service, db } = fixture();
    await expect(
      service.scheduling(
        actor,
        { requestedDate: "2026-10-05" },
        new Date("2026-10-04T10:29:59.999Z"),
      ),
    ).resolves.toMatchObject({
      effectiveDate: "2026-10-05",
      rolledOver: false,
    });
    await expect(
      service.scheduling(
        actor,
        { requestedDate: "2026-10-05" },
        new Date("2026-10-04T10:30:00Z"),
      ),
    ).resolves.toMatchObject({ effectiveDate: "2026-10-06", rolledOver: true });
    expect(db.operatingDay.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { operating: true, date: { gte: new Date("2026-10-05") } },
      }),
    );
  });
  it("does not skip Monday just because Friday cutoff passed", async () => {
    await expect(
      fixture().service.scheduling(actor, {}, new Date("2026-10-02T12:00:00Z")),
    ).resolves.toMatchObject({ effectiveDate: "2026-10-05" });
  });
  it("rolls STYLE to its next weekly run", async () => {
    await expect(
      fixture("STYLE", 1).service.scheduling(
        actor,
        {},
        new Date("2026-10-04T10:30:00Z"),
      ),
    ).resolves.toMatchObject({ effectiveDate: "2026-10-12" });
  });
  it("rejects missing STYLE schedule, missing calendar and invalid dates", async () => {
    await expect(
      fixture("STYLE").service.scheduling(actor, {}),
    ).rejects.toMatchObject({ response: { code: "SCHEDULE_NOT_CONFIGURED" } });
    const { service, db } = fixture();
    db.operatingDay.findMany.mockResolvedValue([]);
    await expect(service.scheduling(actor, {})).rejects.toMatchObject({
      response: { code: "NO_ELIGIBLE_RUN" },
    });
    await expect(
      service.scheduling(actor, { requestedDate: "2026-02-30" }),
    ).rejects.toMatchObject({ status: 400 });
  });
  it("requires an assigned Store account", async () => {
    await expect(
      fixture().service.scheduling({ ...actor, outletId: null }, {}),
    ).rejects.toMatchObject({ status: 403 });
  });
});
