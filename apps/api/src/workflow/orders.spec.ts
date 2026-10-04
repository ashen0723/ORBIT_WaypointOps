import { runCutoff } from "./orders.service";
describe("trusted Colombo cutoff", () => {
  it("closes the previous calendar day at exactly 16:00 Colombo", () => {
    const cutoff = runCutoff("2026-10-05");
    expect(cutoff.toISOString()).toBe("2026-10-04T10:30:00.000Z");
    expect(new Date("2026-10-04T10:29:59.999Z") < cutoff).toBe(true);
    expect(new Date("2026-10-04T10:30:00.000Z") < cutoff).toBe(false);
  });
  it("handles year boundaries without using the host timezone", () =>
    expect(runCutoff("2027-01-01").toISOString()).toBe(
      "2026-12-31T10:30:00.000Z",
    ));
});
