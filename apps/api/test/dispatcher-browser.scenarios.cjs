const { expect } = require("@playwright/test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
module.exports = async ({ db, base, url, pages, day }) => {
  const p = pages.dispatcher;
  await p.getByRole("link", { name: "Operations Status", exact: true }).click();
  await expect(
    p
      .getByRole("row")
      .filter({ hasText: "LIVE-V" })
      .getByText("Completed", { exact: true }),
  ).toBeVisible();
  await p.getByRole("link").filter({ hasText: "LIVE-V · trip 1" }).click();
  await expect(
    p.getByRole("heading", { name: "Trip View", exact: true }),
  ).toBeVisible();
  await expect(
    p.getByRole("cell", { name: "3 / 3 / 0", exact: true }),
  ).toBeVisible();
  // The UI receives actual Driver progress rather than prototype state.
  const start = new Date(day);
  start.setUTCDate(start.getUTCDate() + 14);
  while (start.getUTCDay() === 0) start.setUTCDate(start.getUTCDate() + 1);
  const date = start.toISOString().slice(0, 10),
    next = [];
  for (let i = 0; i < 10; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    const value = d.toISOString().slice(0, 10);
    await db.operatingDay.upsert({
      where: { date: d },
      update: { operating: d.getUTCDay() !== 0 },
      create: { date: d, operating: d.getUTCDay() !== 0 },
    });
    if (i > 0 && d.getUTCDay() !== 0) next.push(value);
  }
  await db.vehicle.create({
    data: {
      id: "BLOCKED-V",
      depotId: "D",
      type: "TRUCK",
      temp: "AMBIENT",
      weightCapKg: 1,
      volumeCapM3: 0.1,
      weeklyFuelQuotaL: 0.1,
      fuelType: "diesel",
      kmPerL: 10,
    },
  });
  await db.user.create({
    data: {
      id: "blocked-driver",
      name: "Fixture Driver",
      email: "blocked@test",
      role: "DRIVER",
      vehicleId: "BLOCKED-V",
      passwordHash: (
        await db.user.findUniqueOrThrow({ where: { id: "driver" } })
      ).passwordHash,
    },
  });
  const storeToken = await pages.store.evaluate(
    () => JSON.parse(sessionStorage.getItem("waypoint.live.session")).token,
  );
  async function create(qty) {
    const r = await fetch(`${base}/api/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${storeToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clientActionId: randomUUID(),
        requestedDate: date,
        temp: "CHILLED",
        lines: [{ catalogItemId: "CAT", requestedQty: qty }],
      }),
    });
    assert.equal(r.status, 201);
    return (await r.json()).order;
  }
  const a = await create(4),
    b = await create(5),
    deferred = await create(1);
  await p.getByLabel("Run date", { exact: true }).fill(date);
  await p.getByLabel("Depot", { exact: true }).selectOption("D");
  await p.getByRole("link", { name: "Orders Queue", exact: true }).click();
  await p.getByLabel("Search orders").fill(a.id);
  await expect(
    p.getByRole("table", { name: "Orders queue" }).locator("tbody tr"),
  ).toHaveCount(1);
  await p.getByRole("button", { name: "Details", exact: true }).click();
  const details = p.getByRole("dialog", { name: "Order details", exact: true });
  await expect(
    details.getByRole("table", { name: "Order quantities" }),
  ).toContainText("Chilled carton");
  await p.keyboard.press("Escape");
  await expect(details).toHaveCount(0);
  await expect(
    p.getByRole("button", { name: "Details", exact: true }),
  ).toBeFocused();
  await p.getByRole("link", { name: "Vehicle List", exact: true }).click();
  await p.getByLabel("Search vehicles").fill("BLOCKED-V");
  await expect(p.getByRole("table").locator("tbody tr")).toHaveCount(1);
  await p
    .getByRole("link", { name: "Planning Workspace", exact: true })
    .click();
  await p.getByRole("button", { name: "New plan", exact: true }).click();
  await p.getByRole("button", { name: "Continue", exact: true }).click();
  await p.getByLabel("Planning depot", { exact: true }).selectOption("D");
  await p.getByLabel("Vehicle", { exact: true }).selectOption("BLOCKED-V");
  await p.getByLabel("Departure time").fill("11:00");
  await p
    .getByRole("button", { name: `Add order ${a.id}`, exact: true })
    .click();
  await p
    .getByRole("button", { name: `Add order ${b.id}`, exact: true })
    .click();
  await p.getByRole("button", { name: "Move stop 2 up", exact: true }).click();
  await expect(p.locator(".dispatch-stop").first()).toContainText(b.id);
  await p
    .getByRole("button", { name: `Remove order ${a.id}`, exact: true })
    .click();
  await expect(p.locator(".dispatch-stop")).toHaveCount(1);
  await p
    .getByRole("button", { name: `Add order ${a.id}`, exact: true })
    .click();
  await db.outlet.update({
    where: { id: "A" },
    data: { parkingConstraint: "VAN_ONLY" },
  });
  const countBefore = await db.trip.count();
  await p.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(
    p.getByText("Draft saved on the server. It holds no reservations.", {
      exact: true,
    }),
  ).toBeVisible();
  const draft = await db.planDraft.findFirstOrThrow({
    where: { allocatedTripId: null },
    orderBy: { updatedAt: "desc" },
  });
  assert.deepEqual(draft.plan.orderIds, [b.id, a.id]);
  await p.getByRole("button", { name: "Validate plan", exact: true }).click();
  const validation = p.getByRole("alert", {
    name: "Planning validation reasons",
  });
  for (const reason of [
    "weight exceeded",
    "volume exceeded",
    "reefer required",
    "van required",
    "window conflict",
    "fuel quota exceeded",
  ])
    await expect(validation).toContainText(reason);
  await expect(
    p.getByRole("button", { name: "Allocate trip", exact: true }),
  ).toBeDisabled();
  assert.equal(await db.trip.count(), countBefore);
  await p.reload();
  await expect(p.locator(".dispatch-stop")).toHaveCount(2);
  await expect(p.locator(".dispatch-stop").first()).toContainText(b.id);
  await expect(p.getByText(new RegExp(`Draft ${draft.id}`))).toBeVisible();
  await expect(
    p.getByRole("button", { name: "Allocate trip", exact: true }),
  ).toBeDisabled();
  await db.outlet.update({
    where: { id: "A" },
    data: { parkingConstraint: "NORMAL" },
  });
  await p.getByLabel("Vehicle", { exact: true }).selectOption("LIVE-V");
  await p.getByLabel("Departure time").fill("05:00");
  await p.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(
    p.getByText("Draft saved on the server. It holds no reservations.", {
      exact: true,
    }),
  ).toBeVisible();
  await p.getByRole("button", { name: "Validate plan", exact: true }).click();
  await expect(
    p.getByText("All planning checks passed.", { exact: true }),
  ).toBeVisible();
  // Commit on the server, then lose the response. Reload must recover the allocated draft rather than duplicate it.
  await p.route("**/api/planning/allocate", async (route) => {
    const response = await route.fetch();
    assert.equal(response.status(), 201);
    await route.abort("failed");
  });
  await p.getByRole("button", { name: "Allocate trip", exact: true }).click();
  await expect(p.getByRole("alert")).toContainText(/fetch|network/i);
  assert.equal(await db.trip.count(), countBefore + 1);
  await p.unroute("**/api/planning/allocate");
  await p.reload();
  await expect(
    p.getByRole("button", { name: "Publish trip", exact: true }),
  ).toBeVisible();
  await expect(
    p.getByRole("button", { name: "Allocate trip", exact: true }),
  ).toBeDisabled();
  assert.equal(await db.trip.count(), countBefore + 1);
  await p.getByRole("button", { name: "Publish trip", exact: true }).click();
  await expect(
    p.getByText("Trip published to the loading team.", { exact: true }),
  ).toBeVisible();
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.screenshot({
    path: "/private/tmp/waypoint-dispatcher-planning.png",
    fullPage: false,
    animations: "disabled",
  });
  await p.getByRole("link", { name: "Orders Queue", exact: true }).click();
  await p.getByLabel("Search orders").fill(deferred.id);
  await p.getByRole("button", { name: "Defer", exact: true }).click();
  const modal = p.getByRole("dialog", { name: "Defer Outlet", exact: true });
  await modal.getByLabel("Next valid delivery date").selectOption(next[0]);
  await modal
    .getByLabel("Deferral reason")
    .fill("Outlet requested the next operating run");
  await modal
    .getByRole("button", { name: "Confirm deferral", exact: true })
    .click();
  await expect(modal).toHaveCount(0);
  await p.getByRole("link", { name: "Deferred Orders", exact: true }).click();
  await p.getByLabel("Search orders").fill(deferred.id);
  await expect(p.getByRole("table", { name: "Deferred orders" })).toContainText(
    "Outlet requested the next operating run",
  );
  await p.getByRole("button", { name: "Details", exact: true }).click();
  await expect(p.getByRole("dialog", { name: "Order details" })).toContainText(
    `${date} → ${next[0]}`,
  );
  await p.keyboard.press("Escape");
  await p.getByRole("link", { name: "Dashboard", exact: true }).click();
  await expect(
    p.getByRole("heading", { name: "Dispatcher Dashboard" }),
  ).toBeVisible();
  await p.setViewportSize({ width: 390, height: 844 });
  await expect(
    p.getByRole("navigation", { name: "Dispatcher navigation" }),
  ).toBeVisible();
  assert.equal(
    await p.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
    false,
  );
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.screenshot({
    path: "/private/tmp/waypoint-dispatcher-mobile.png",
    fullPage: false,
    animations: "disabled",
  });
  await p.setViewportSize({ width: 1280, height: 900 });
  // Empty and failed reads are visibly different, with no mock rows substituted.
  await p.route("**/api/dispatcher/orders?**", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        code: "UNAVAILABLE",
        message: "Test service unavailable",
        details: [],
      }),
    }),
  );
  await p.getByRole("link", { name: "Orders Queue", exact: true }).click();
  await expect(p.getByRole("alert")).toContainText("Test service unavailable");
  await p.unroute("**/api/dispatcher/orders?**");
  await p.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(p.getByRole("alert")).toHaveCount(0);
  await p.getByLabel("Search orders").fill("not-an-order");
  await expect(p.getByRole("heading", { name: "No results" })).toBeVisible();
  // Role navigation cannot mount the Dispatcher tree for the Store account.
  await pages.store.goto(`${url}/dispatcher/planning`);
  await expect(
    pages.store.getByRole("heading", { name: "Orders & receipts" }),
  ).toBeVisible();
  console.log(
    "PASS: Dispatcher seven-screen routing, actual filters/detail/modal focus, add/remove/reorder, six backend validation reasons, retained draft across reload, lost allocation response recovery, explicit publication, eligible-date deferral/history, Driver monitoring, mobile layout and real error/empty states.",
  );
};
