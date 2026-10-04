import { TripsService } from "./trips.service";
import type { Actor } from "../auth/auth.service";
import type { PlanningService } from "../planning/planning.service";
import type { FieldService } from "../workflow/field.service";
import type { UsersService } from "../users/users.service";
const actor: Actor = {
  id: "driver",
  role: "DRIVER",
  vehicleId: "V",
  depotId: null,
  outletId: null,
};
function fixture(vehicle: unknown = { id: "V" }) {
  const planning = {
    listTrips: jest.fn().mockResolvedValue({ items: [], nextCursor: null }),
    getTrip: jest.fn(),
  };
  const users = {
    getDriverProfile: jest.fn().mockResolvedValue({ id: "driver", vehicle }),
  };
  return {
    planning,
    users,
    service: new TripsService(
      planning as unknown as PlanningService,
      {} as FieldService,
      users as unknown as UsersService,
    ),
  };
}
describe("Driver read projections", () => {
  it("uses Colombo today even across midnight, ignores a requested future date, preserves pagination", async () => {
    const { service, planning } = fixture();
    const result = await service.today(
      actor,
      "driver",
      { date: "2099-01-01", limit: "2", cursor: "T" },
      new Date("2026-10-04T20:00:00Z"),
    );
    expect(result.date).toBe("2026-10-05");
    expect(planning.listTrips).toHaveBeenCalledWith(actor, {
      date: "2026-10-05",
      limit: "2",
      cursor: "T",
    });
  });
  it("rejects another driver id before any lookup", async () => {
    const { service, users } = fixture();
    await expect(service.today(actor, "other", {})).rejects.toMatchObject({
      status: 403,
    });
    expect(users.getDriverProfile).not.toHaveBeenCalled();
  });
  it("returns an empty page when no vehicle is assigned", async () => {
    const { service, planning } = fixture(null);
    expect(
      await service.today({ ...actor, vehicleId: null }, "driver", {}),
    ).toMatchObject({ items: [], nextCursor: null });
    expect(planning.listTrips).not.toHaveBeenCalled();
  });
  it("counts terminal attempts without calling a failed stop delivered", async () => {
    const { service, planning } = fixture();
    planning.getTrip.mockResolvedValue({
      stops: ["DELIVERED", "PARTIAL", "FAILED", "PENDING"].map((status) => ({
        status,
      })),
    });
    expect(await service.progress(actor, "T")).toMatchObject({
      totalStops: 4,
      completedStops: 3,
      remainingStops: 1,
    });
  });
});
