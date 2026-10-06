/* Native PostgreSQL only. Creates and drops its own database; never seeds DATABASE_URL. */
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { spawn } = require("node:child_process");
const { mkdtemp, writeFile, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");
const { Client } = require("pg");
const { Test } = require("@nestjs/testing");
const { PrismaPg } = require("@prisma/adapter-pg");
require("reflect-metadata");
const apiDir = resolve(__dirname, "..");
function command(args, env) {
  return new Promise((done, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: apiDir,
      env: { ...process.env, ...env },
    });
    let output = "";
    child.stdout.on("data", (b) => (output += b));
    child.stderr.on("data", (b) => (output += b));
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? done(output) : reject(new Error(output)),
    );
  });
}
async function main() {
  if (!process.env.TEST_DATABASE_URL)
    throw new Error(
      "Set TEST_DATABASE_URL for a disposable PostgreSQL test server.",
    );
  const admin = new Client({ connectionString: process.env.TEST_DATABASE_URL });
  const name = "waypoint_seed_" + randomUUID().replaceAll("-", "");
  let created = false,
    db,
    app,
    temp;
  try {
    await admin.connect();
    await admin.query(`CREATE DATABASE "${name}"`);
    created = true;
    const url = new URL(process.env.TEST_DATABASE_URL);
    url.pathname = "/" + name;
    url.search = "";
    const env = {
      DATABASE_URL: url.toString(),
      SEED_DEMO_PASSWORD: "seed-test-password",
    };
    await command(
      [require.resolve("prisma/build/index.js"), "migrate", "deploy"],
      env,
    );
    const tsx = require.resolve("tsx/cli");
    await command([tsx, "prisma/seed.ts"], env);
    const { PrismaClient } = require("../dist/generated/prisma/client");
    db = new PrismaClient({
      adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
    });
    const models = [
      "order",
      "orderLine",
      "trip",
      "tripStop",
      "tripStopLine",
      "delivery",
      "receipt",
      "receiptLine",
      "loadingIssue",
      "orderDeferral",
      "evidence",
      "syncAction",
    ];
    async function counts() {
      return Promise.all(models.map((m) => db[m].count()));
    }
    const before = await counts();
    // A rerun must not reset work already performed by the team.
    await db.loadingIssue.update({
      where: { id: "ISSUE-WF-SHORT" },
      data: { note: "Preserve operator note" },
    });
    await command([tsx, "prisma/seed.ts"], env);
    assert.deepEqual(await counts(), before);
    assert.equal(
      (await db.loadingIssue.findUnique({ where: { id: "ISSUE-WF-SHORT" } }))
        .note,
      "Preserve operator note",
    );
    assert.equal(
      (await db.outlet.findUnique({ where: { id: "OUT-005" } }))
        .scheduledWeekday,
      1,
    );
    process.env.DATABASE_URL = env.DATABASE_URL;
    process.env.JWT_SECRET = "seed-test-secret-at-least-32-characters";
    const { AppModule } = require("../dist/app.module");
    const { PrismaService } = require("../dist/prisma/prisma.service");
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(db)
      .compile();
    app = module.createNestApplication({ logger: ["error"] });
    app.setGlobalPrefix("api");
    await app.listen(0, "127.0.0.1");
    const base = await app.getUrl();
    async function request(path, token, body, expected = 200) {
      const r = await fetch(base + "/api" + path, {
        method: body ? "POST" : "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: "Bearer " + token } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const result = await r.json();
      assert.equal(r.status, expected, JSON.stringify(result));
      return result;
    }
    const dispatcher = (
      await request("/auth/login", null, {
        email: "dispatcher@waypoint.lk",
        password: env.SEED_DEMO_PASSWORD,
      })
    ).token;
    const loader = (
      await request("/auth/login", null, {
        email: "loader@waypoint.lk",
        password: env.SEED_DEMO_PASSWORD,
      })
    ).token;
    const store = (
      await request("/auth/login", null, {
        email: "store@waypoint.lk",
        password: env.SEED_DEMO_PASSWORD,
      })
    ).token;
    const delivery = await request("/deliveries/DELIVERY-WF-HAPPY", dispatcher);
    assert.equal(delivery.recorded.lines[0].deliveredQty, 10);
    const evidence = await fetch(
      base + "/api/evidence/" + delivery.recorded.proof.signatureRef,
      { headers: { Authorization: "Bearer " + dispatcher } },
    );
    assert.equal(evidence.status, 200);
    assert.equal(evidence.headers.get("content-type"), "image/png");
    assert.equal(
      (await request("/deliveries/DELIVERY-WF-HAPPY/receipt", store)).status,
      "CONFIRMED",
    );
    assert.equal(
      (await request("/deliveries/DELIVERY-WF-HAPPY/recovery", dispatcher))
        .lines[0].qty,
      0,
    );
    const loading = await request("/trips/TRIP-WF-PLANNED/loading", loader);
    assert.equal(loading.issues[0].orderLineId, "LINE-WF-SHORT");
    assert.equal((await db.loadingIssue.findUnique({where:{id:"ISSUE-WF-SHORT"}})).stopId,"STOP-WF-SHORT");
    await request(
      "/trips/TRIP-WF-PLANNED/ready",
      loader,
      { clientActionId: randomUUID(), expectedPlanVersion: 1 },
      409,
    );
    assert.equal(
      (await request("/orders/ORD-WF-DEFERRED/deferrals", dispatcher)).items
        .length,
      1,
    );
    assert.ok((await request("/trips/TRIP-WF-HAPPY", dispatcher)).publishedAt);
    // Exercise the actual importer CLI and Prisma adapter, not just the in-memory unit adapter.
    temp = await mkdtemp(join(tmpdir(), "waypoint-import-"));
    const { fields } = require("tsx/cjs/api").require(
      "../prisma/dataset-import.ts",
      __filename,
    );
    // The seed now includes a rolling calendar. Pick an unseeded date so
    // the importer test keeps asserting three creations regardless of today's date.
    const lastOperatingDay = await db.operatingDay.findFirstOrThrow({ orderBy: { date: "desc" } });
    const importDate = new Date(lastOperatingDay.date);
    importDate.setUTCDate(importDate.getUTCDate() + 7);
    const rows = {
      outlets: {
        id: "SRC-STYLE",
        name: "Synthetic Style",
        brand: "STYLE",
        district: "Test",
        depotId: "DEP-PLG",
        dockType: "STREET",
        parkingConstraint: "VAN_ONLY",
        mallWindow: null,
        windowOpenTime: "08:00",
        windowCloseTime: "14:00",
        scheduledWeekday: 3,
      },
      vehicles: {
        id: "SRC-V",
        type: "VAN",
        temp: "AMBIENT",
        weightCapKg: 100,
        volumeCapM3: 2,
        fuelType: "diesel",
        kmPerL: 10,
        weeklyFuelQuotaL: 100,
        depotId: "DEP-PLG",
        available: true,
      },
      calendar: { date: importDate.toISOString().slice(0, 10), operating: true },
    };
    const mapping = { version: 1, datasets: {} };
    for (const dataset of Object.keys(rows)) {
      const row = rows[dataset],
        m = { csv: { delimiter: ",", encoding: "utf8" }, fields: {} };
      for (const field of fields[dataset]) {
        m.fields[field] = { column: field };
        if (row[field] === null) m.fields[field].onBlank = null;
        if (
          [
            "brand",
            "dockType",
            "parkingConstraint",
            "type",
            "temp",
            "available",
            "operating",
          ].includes(field)
        )
          m.fields[field].values = { [String(row[field])]: row[field] };
      }
      if (dataset === "calendar") {
        m.scope = "global";
        m.dateFormat = "YYYY-MM-DD";
      } else {
        m.depotIds = { mode: "identity" };
        if (dataset === "outlets") m.timeFormat = "HH:mm";
        else m.fuelEfficiencyUnit = "kmPerL";
      }
      mapping.datasets[dataset] = m;
      await writeFile(
        join(temp, dataset + ".csv"),
        fields[dataset].join(",") +
          "\n" +
          fields[dataset].map((f) => row[f] ?? "").join(",") +
          "\n",
      );
    }
    await writeFile(join(temp, "mapping.json"), JSON.stringify(mapping));
    const args = [
      tsx,
      "prisma/import-datasets.ts",
      "--mapping",
      join(temp, "mapping.json"),
      ...["outlets", "vehicles", "calendar"].flatMap((d) => [
        "--" + d,
        join(temp, d + ".csv"),
      ]),
    ];
    assert.match(await command([...args, "--dry-run"], env), /"create":3/);
    assert.equal(await db.outlet.count({ where: { id: "SRC-STYLE" } }), 0);
    assert.match(await command([...args, "--apply"], env), /"create":3/);
    assert.match(await command([...args, "--apply"], env), /"unchanged":3/);
    assert.equal(
      (await db.outlet.findUnique({ where: { id: "SRC-STYLE" } }))
        .scheduledWeekday,
      3,
    );
    console.log(
      "PASS: fresh migration deploy, seed twice without reset/duplicates, live delivery/evidence/receipt/recovery, Loader shortfall gate, deferral history, actual importer dry-run/apply/replay and STYLE weekday.",
    );
  } finally {
    if (app) await app.close();
    if (db) await db.$disconnect();
    if (temp) await rm(temp, { recursive: true, force: true });
    if (created) await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
    await admin.end();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
