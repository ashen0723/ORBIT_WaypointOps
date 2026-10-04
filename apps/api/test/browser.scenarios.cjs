const { chromium, expect } = require("@playwright/test");
const http = require("node:http");
const { readFile } = require("node:fs/promises");
const { join } = require("node:path");
const assert = require("node:assert/strict");
module.exports = async ({ db, base }) => {
  const webRoot = join(__dirname, "../../web/dist");
  const server = http.createServer(async (req, res) => {
    if (req.url.startsWith("/api/")) {
      const upstream = http.request(
        new URL(req.url, base),
        { method: req.method, headers: req.headers },
        (r) => {
          res.writeHead(r.statusCode, r.headers);
          r.pipe(res);
        },
      );
      upstream.on("error", () => {
        res.statusCode = 502;
        res.end();
      });
      req.pipe(upstream);
      return;
    }
    const path = req.url.split("?")[0];
    const file =
      path.startsWith("/assets/") || path === "/sw.js" ? path : "/index.html";
    try {
      const data = await readFile(join(webRoot, file));
      res.setHeader(
        "Content-Type",
        file.endsWith(".js")
          ? "application/javascript"
          : file.endsWith(".css")
            ? "text/css"
            : "text/html",
      );
      res.end(data);
    } catch {
      res.statusCode = 404;
      res.end();
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  let browser;
  try {
    browser = await chromium.launch({
      ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
        ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
        : { channel: "chrome" }),
      headless: true,
    });
    const url = `http://127.0.0.1:${server.address().port}`;
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + 35);
    while (date.getUTCDay() === 0) date.setUTCDate(date.getUTCDate() + 1);
    const day = date.toISOString().slice(0, 10);
    await db.operatingDay.upsert({
      where: { date: new Date(day) },
      update: { operating: true },
      create: { date: new Date(day), operating: true },
    });
    const pages = {};
    const errors = [];
    global.__waypointTestPages = pages;
    for (const role of ["store", "dispatcher", "loader", "driver"]) {
      const context = await browser.newContext();
      const page = await context.newPage();
      pages[role] = page;
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(url);
      await page.getByLabel("Email", { exact: true }).fill(`${role}@test`);
      await page.getByLabel("Password", { exact: true }).fill("test-password");
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await expect(
        page.getByRole("button", { name: "Sign out" }),
      ).toBeVisible();
      if (role !== "store")
        await page.getByLabel("Run date", { exact: true }).fill(day);
    }
    const store = pages.store;
    await store.getByLabel("Requested delivery date").fill(day);
    await store.getByLabel("Item", { exact: true }).selectOption("CAT");
    await store.getByLabel("Quantity", { exact: true }).fill("3");
    await store.getByRole("button", { name: "Place order" }).click();
    await expect(
      store.getByText("requested 3, cancelled 0, accepted 0", { exact: false }),
    ).toBeVisible();
    const order = await db.order.findFirstOrThrow({
      where: { plannedDate: new Date(day), units: 3 },
      include: { lines: true },
    });
    const dispatcher = pages.dispatcher;
    await dispatcher
      .getByRole("link", { name: "Planning Workspace", exact: true })
      .click();
    await dispatcher
      .getByLabel("Planning depot", { exact: true })
      .selectOption("D");
    await dispatcher
      .getByLabel("Vehicle", { exact: true })
      .selectOption("LIVE-V");
    await dispatcher
      .getByRole("button", { name: `Add order ${order.id}`, exact: true })
      .click();
    await dispatcher
      .getByRole("button", { name: "Save draft", exact: true })
      .click();
    await expect(
      dispatcher.getByText(
        "Draft saved on the server. It holds no reservations.",
        { exact: true },
      ),
    ).toBeVisible();
    await dispatcher
      .getByRole("button", { name: "Validate plan", exact: true })
      .click();
    await expect(
      dispatcher.getByText("All planning checks passed.", { exact: true }),
    ).toBeVisible();
    await dispatcher
      .getByRole("button", { name: "Allocate trip", exact: true })
      .click();
    await dispatcher
      .getByRole("button", { name: "Publish trip", exact: true })
      .click();
    await expect(
      dispatcher.getByText("Trip published to the loading team.", {
        exact: true,
      }),
    ).toBeVisible();
    const loader = pages.loader;
    const checkPanel = loader.locator("details").filter({
      has: loader
        .locator("summary")
        .filter({ hasText: /^Loading checks & shortfalls$/ }),
    });
    const committed = () => expect(checkPanel).not.toHaveAttribute("open", "");
    await loader.getByRole("button", { name: "Refresh", exact: true }).click();
    await loader
      .getByText("Loading checks & shortfalls", { exact: true })
      .click();
    await loader
      .getByRole("button", { name: "Start loading", exact: true })
      .click();
    await committed();
    // A committed version remounts the card; reopen its collapsed check panel.
    await loader
      .getByText("Loading checks & shortfalls", { exact: true })
      .click();
    await loader.getByRole("button", { name: "Save checked quantity" }).click();
    await committed();
    await loader
      .getByText("Loading checks & shortfalls", { exact: true })
      .click();
    await loader
      .getByRole("button", { name: "Acknowledge current plan" })
      .click();
    await committed();
    await loader
      .getByText("Loading checks & shortfalls", { exact: true })
      .click();
    await loader
      .getByRole("button", { name: "Mark ready for departure" })
      .click();
    await expect(
      loader.getByRole("heading", { name: /Trip 1 · READY/ }),
    ).toBeVisible();
    const driver = pages.driver;
    await driver.getByRole("button", { name: "Refresh", exact: true }).click();
    await driver.getByRole("button", { name: "Depart", exact: true }).click();
    await expect(driver.getByText(/Trip 1 · IN_TRANSIT/)).toBeVisible();
    await driver.evaluate(async () => {
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller)
        await new Promise((r) =>
          navigator.serviceWorker.addEventListener("controllerchange", r, {
            once: true,
          }),
        );
    });
    await driver.context().setOffline(true);
    await driver.getByText("Record delivery outcome", { exact: true }).click();
    await driver.getByLabel("Recipient name").fill("Browser receiver");
    await driver.getByLabel("Receiver signature image").setInputFiles({
      name: "signature.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1f8AAAAASUVORK5CYII=",
        "base64",
      ),
    });
    await driver
      .getByRole("button", { name: "Save delivery evidence" })
      .click();
    await expect(
      driver.getByText("OUTCOME · PENDING_SYNC", { exact: false }),
    ).toBeVisible();
    await driver.reload();
    await expect(
      driver.getByText("OUTCOME · PENDING_SYNC", { exact: false }),
    ).toBeVisible();
    assert.equal(
      await db.delivery.count({ where: { stop: { orderId: order.id } } }),
      0,
    );
    await driver.context().setOffline(false);
    await driver.getByRole("button", { name: "Sync pending actions" }).click();
    await expect(
      driver.getByText("OUTCOME · SYNCED", { exact: false }),
    ).toBeVisible({ timeout: 15000 });
    await store.getByRole("button", { name: "Refresh", exact: true }).click();
    const card = store
      .locator("section")
      .filter({ has: store.getByText(`Order ${order.id}`, { exact: true }) });
    await card
      .getByText("DELIVERED · Receipt pending", { exact: true })
      .click();
    await card
      .getByRole("button", { name: "Confirm received quantities" })
      .click();
    await expect(
      card.getByRole("heading", { name: "A · RECEIVED", exact: true }),
    ).toBeVisible();
    assert.equal(
      await db.delivery.count({ where: { stop: { orderId: order.id } } }),
      1,
    );
    assert.equal(await db.evidence.count({ where: { orderId: order.id } }), 1);
    assert.deepEqual(errors, []);
    await require("./dispatcher-browser.scenarios.cjs")({
      db,
      base,
      url,
      pages,
      day,
    });
    assert.deepEqual(errors, []);
    await driver.screenshot({
      path: "/private/tmp/waypoint-driver-e2e.png",
      fullPage: true,
    });
    console.log(
      "PASS: Chromium four-role UI, real API, IndexedDB image persistence, offline reload, reconnect replay, single delivery/proof, final receipt.",
    );
  } catch (error) {
    for (const [role, page] of Object.entries(
      global.__waypointTestPages ?? {},
    )) {
      console.error(
        role,
        (await page.locator("body").innerText()).slice(0, 6000),
      );
      await page.screenshot({
        path: `/private/tmp/waypoint-${role}-failure.png`,
        fullPage: true,
      });
    }
    throw error;
  } finally {
    if (browser) await browser.close();
    await new Promise((r) => server.close(r));
  }
};
