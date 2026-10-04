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
      path.startsWith("/assets/") ||
      path === "/sw.js" ||
      /\.(jpg|png|webp)$/.test(path)
        ? path
        : "/index.html";
    try {
      const data = await readFile(join(webRoot, file));
      res.setHeader(
        "Content-Type",
        file.endsWith(".js")
          ? "application/javascript"
          : file.endsWith(".css")
            ? "text/css"
            : file.endsWith(".jpg")
              ? "image/jpeg"
              : file.endsWith(".png")
                ? "image/png"
                : file.endsWith(".webp")
                  ? "image/webp"
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
      await expect(
        page.getByRole("navigation", { name: "Main navigation" }),
      ).toBeVisible();
      await expect
        .poll(() =>
          page
            .locator("img")
            .evaluateAll((images) =>
              images.every((i) => i.complete && i.naturalWidth > 0),
            ),
        )
        .toBe(true);
      if (role === "store") {
        await page.screenshot({
          path: "/private/tmp/waypoint-landing-desktop.png",
          fullPage: true,
        });
        await page.setViewportSize({ width: 390, height: 844 });
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        );
        await page.screenshot({
          path: "/private/tmp/waypoint-landing-mobile.png",
          fullPage: true,
        });
        await page.setViewportSize({ width: 1280, height: 900 });
      }
      await page
        .getByRole("navigation", { name: "Main navigation" })
        .getByRole("link", { name: "Sign in", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: "Welcome back." }),
      ).toBeVisible();
      await expect
        .poll(() =>
          page
            .locator("img")
            .evaluateAll((images) =>
              images.every((i) => i.complete && i.naturalWidth > 0),
            ),
        )
        .toBe(true);
      await page.getByLabel("Email", { exact: true }).fill(`${role}@test`);
      if (role === "store") {
        await page
          .getByLabel("Password", { exact: true })
          .fill("wrong-password");
        await page
          .getByRole("button", { name: "Sign in", exact: true })
          .click();
        await expect(page.getByRole("alert")).toBeVisible();
        await page.getByRole("button", { name: "Show password" }).click();
        await expect(
          page.getByLabel("Password", { exact: true }),
        ).toHaveAttribute("type", "text");
        await page.getByRole("button", { name: "Hide password" }).click();
        await page.screenshot({
          path: "/private/tmp/waypoint-login-desktop.png",
          fullPage: true,
        });
      }
      await page.getByLabel("Password", { exact: true }).fill("test-password");
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      if (role === "driver")
        await expect(
          page.getByRole("heading", {
            name: "Today's trips",
            exact: true,
            level: 1,
          }),
        ).toBeVisible();
      else
        await expect(
          page.getByRole("button", {
            name: role === "dispatcher" ? "Sign out" : "Log out",
          }),
        ).toBeVisible();
      if (role === "loader") {
        await page.setViewportSize({ width: 1600, height: 900 });
        for (const [route, title] of [
          ["", "Loading Queue"],
          ["issues", "Loading Issues"],
          ["completed", "Completed Loads"],
          ["settings", "Settings"],
        ]) {
          await page.goto(`${url}/loader/${route}`);
          await expect(
            page.getByRole("heading", { name: title, exact: true }),
          ).toBeVisible();
          await expect(page.getByText("Refreshing loading work…")).toHaveCount(
            0,
          );
          await page.screenshot({
            path: `/private/tmp/waypoint-loader-${route || "queue"}-desktop.png`,
            fullPage: true,
          });
        }
        await page.setViewportSize({ width: 390, height: 844 });
        await page
          .getByRole("button", { name: "Open menu", exact: true })
          .click();
        await page
          .getByRole("link", { name: "Loading queue", exact: true })
          .click();
        await expect(
          page.getByRole("heading", { name: "Loading Queue", exact: true }),
        ).toBeVisible();
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        );
        await page.setViewportSize({ width: 1280, height: 900 });
      }
      if (role === "dispatcher")
        await page.locator(".dispatch-scope-filters summary").click();
      if (role !== "store" && role !== "driver")
        await page.getByLabel("Run date", { exact: true }).fill(day);
    }
    const store = pages.store;
    // Fixed-date order fixture for the cross-role workflow. Store UI creation and server-selected
    // scheduling are covered separately by store-browser.scenarios.cjs.
    const created = await store.evaluate(async (day) => {
      const session = JSON.parse(
        sessionStorage.getItem("waypoint.live.session"),
      );
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          clientActionId: crypto.randomUUID(),
          requestedDate: day,
          temp: "CHILLED",
          lines: [{ catalogItemId: "CAT", requestedQty: 3 }],
        }),
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    }, day);
    const order = await db.order.findUniqueOrThrow({
      where: { id: created.order.id },
      include: { lines: true },
    });
    const dispatcher = pages.dispatcher;
    await dispatcher
      .getByRole("link", { name: "Trip Planning", exact: true })
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
    // The mounted Loader surface saves actual issue evidence, not a preview flag.
    await loader
      .getByText("Report damaged or missing stock with photo", { exact: true })
      .click();
    const photoForm = loader.locator("form").filter({
      has: loader.getByRole("button", {
        name: "Report loading issue",
        exact: true,
      }),
    });
    await photoForm.getByLabel("Issue type").selectOption("DAMAGED");
    await photoForm.getByLabel("Available quantity").fill("2");
    await photoForm
      .getByLabel("Issue note")
      .fill("One carton damaged; replacement needed");
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aR9sAAAAASUVORK5CYII=",
      "base64",
    );
    await photoForm.getByLabel("Issue photo (optional)").setInputFiles({
      name: "damage.png",
      mimeType: "image/png",
      buffer: png,
    });
    await photoForm
      .getByRole("button", { name: "Report loading issue", exact: true })
      .click();
    await expect(
      loader.getByText("Issue history and evidence", { exact: true }),
    ).toBeVisible();
    await loader.getByRole("link", { name: "Issues", exact: true }).click();
    await expect(
      loader.getByRole("heading", { name: "Loading Issues", exact: true }),
    ).toBeVisible();
    await loader
      .getByText("Issue history and evidence", { exact: true })
      .click();
    await expect(
      loader.getByRole("img", { name: "Delivery evidence 1" }),
    ).toBeVisible();
    const issue = await db.loadingIssue.findFirstOrThrow({
      where: { orderLineId: order.lines[0].id },
      include: { loadingRecord: true },
    });
    assert.equal(issue.photoRefs.length, 1);
    assert.equal(
      Buffer.from(
        (
          await db.evidence.findUniqueOrThrow({
            where: { id: issue.photoRefs[0] },
          })
        ).bytes,
      ).compare(png),
      0,
    );
    await loader
      .getByText("Loading checks & shortfalls", { exact: true })
      .click();
    await loader
      .getByRole("button", { name: "Mark ready for departure" })
      .click();
    await expect(loader.getByRole("alert")).toContainText(
      "Acknowledge the current plan",
    );
    const dispatcherToken = await dispatcher.evaluate(
      () => JSON.parse(sessionStorage.getItem("waypoint.live.session")).token,
    );
    const loadingTrip = await db.trip.findUniqueOrThrow({
      where: { id: issue.loadingRecord.tripId },
    });
    const decision = await fetch(
      `${base}/api/loading/issues/${issue.id}/decision`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${dispatcherToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientActionId: "browser-loader-replacement",
          expectedVersion: issue.version,
          expectedPlanVersion: loadingTrip.planVersion,
          decision: {
            action: "REPLACEMENT_REQUIRED",
            reason: "Load an identical replacement",
          },
        }),
      },
    );
    assert.equal(decision.status, 200, await decision.text());
    await loader
      .getByRole("link", { name: "Loading queue", exact: true })
      .click();
    await loader.getByRole("button", { name: "Refresh", exact: true }).click();
    await expect(
      loader.getByRole("button", { name: "Refresh", exact: true }),
    ).toBeEnabled();
    await expect(
      loader.getByText("Loading checks & shortfalls", { exact: true }),
    ).toBeVisible();
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
      .getByRole("button", {
        name: "Acknowledge decision after checking goods",
      })
      .click();
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
    await loader
      .getByRole("link", { name: "Completed loads", exact: true })
      .click();
    await expect(
      loader.getByRole("heading", { name: "Completed Loads", exact: true }),
    ).toBeVisible();
    await loader.getByRole("link", { name: "Open trip", exact: true }).click();
    await loader
      .getByText("Stop sequence and loading list", { exact: true })
      .click();
    await loader.setViewportSize({ width: 390, height: 844 });
    await loader.screenshot({
      path: "/private/tmp/waypoint-loader-mobile.png",
      fullPage: true,
    });
    assert.ok(
      await loader.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    await loader.setViewportSize({ width: 1280, height: 900 });
    const driver = pages.driver;
    await driver
      .getByRole("button", { name: "Refresh route / sync", exact: true })
      .click();
    await driver.goto(`${url}/driver/trips/${loadingTrip.id}/check`);
    await driver
      .getByRole("button", { name: "Depart — start trip", exact: true })
      .click();
    await driver.goto(`${url}/driver/trips/${loadingTrip.id}/stops/1`);
    await driver
      .getByRole("button", { name: "I've arrived", exact: true })
      .click();
    await expect(
      driver.getByRole("button", { name: "Record delivery", exact: true }),
    ).toBeVisible();
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
    await driver
      .getByRole("button", { name: "Record delivery", exact: true })
      .click();
    await driver.getByLabel("Recipient name").fill("Browser receiver");
    const signature = driver.getByRole("img", {
      name: "Signature pad. Draw with your finger.",
    });
    const box = await signature.boundingBox();
    assert.ok(box);
    await driver.mouse.move(box.x + 25, box.y + 40);
    await driver.mouse.down();
    await driver.mouse.move(box.x + 120, box.y + 70, { steps: 8 });
    await driver.mouse.up();
    await driver
      .getByRole("button", { name: "Complete delivery", exact: true })
      .click();
    await expect(driver.getByText(/outcome · Saved on phone/)).toBeVisible();
    await driver.reload();
    await expect(driver.getByText(/outcome · Saved on phone/)).toBeVisible();
    assert.equal(
      await db.delivery.count({ where: { stop: { orderId: order.id } } }),
      0,
    );
    await driver.context().setOffline(false);
    await driver
      .getByRole("button", { name: "Refresh route / sync", exact: true })
      .click();
    await expect
      .poll(
        () => db.delivery.count({ where: { stop: { orderId: order.id } } }),
        { timeout: 15000 },
      )
      .toBe(1);
    await expect(
      driver.getByRole("region", { name: "Synchronization" }),
    ).toHaveCount(0);
    await driver.setViewportSize({ width: 390, height: 844 });
    assert.ok(
      await driver.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    await driver.screenshot({
      path: "/private/tmp/waypoint-driver-mobile.png",
      fullPage: true,
    });
    await driver.setViewportSize({ width: 1280, height: 900 });
    await store.goto(`${url}/store/orders/${order.id}/receipt`);
    await expect(
      store.getByRole("heading", { name: "Confirm Receipt", exact: true }),
    ).toBeVisible();
    await store
      .getByRole("button", { name: "Mark remaining as received OK" })
      .click();
    await store
      .getByRole("button", { name: "Confirm Receipt", exact: true })
      .click();
    await expect(
      store.getByRole("heading", { name: order.id, exact: true }),
    ).toBeVisible();
    await expect
      .poll(
        async () =>
          (await db.order.findUniqueOrThrow({ where: { id: order.id } }))
            .status,
      )
      .toBe("RECEIVED");
    assert.equal(
      await db.delivery.count({ where: { stop: { orderId: order.id } } }),
      1,
    );
    assert.equal(
      await db.evidence.count({
        where: { orderId: order.id, ownerId: "driver" },
      }),
      1,
    );
    assert.equal(
      await db.evidence.count({
        where: { orderId: order.id, ownerId: "loader" },
      }),
      1,
    );
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
