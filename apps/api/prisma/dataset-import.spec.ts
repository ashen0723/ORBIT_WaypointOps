import { readFileSync } from "node:fs";
import {
  ImportDatabase,
  ImportError,
  Mapping,
  Row,
  dateValue,
  fields,
  prepareBatch,
  runImport,
  validateMapping,
} from "./dataset-import";

// These column names and rows are synthetic test data, not competition data.
function fixture() {
  const mapping: Mapping = {
    version: 1,
    datasets: {
      outlets: {
        csv: { delimiter: ",", encoding: "utf8" },
        fields: {},
        timeFormat: "HH:mm",
        depotIds: { mode: "identity" },
      },
      vehicles: {
        csv: { delimiter: ",", encoding: "utf8" },
        fields: {},
        fuelEfficiencyUnit: "kmPerL",
        depotIds: { mode: "identity" },
      },
      calendar: {
        csv: { delimiter: ",", encoding: "utf8" },
        fields: {},
        scope: "global",
        dateFormat: "YYYY-MM-DD",
      },
    },
  };
  for (const dataset of Object.keys(fields) as (keyof typeof fields)[]) {
    for (const field of fields[dataset])
      mapping.datasets[dataset].fields[field] = { column: field };
  }
  mapping.datasets.outlets.fields.brand.values = { fresh: "FRESH" };
  mapping.datasets.outlets.fields.dockType.values = { street: "STREET" };
  mapping.datasets.outlets.fields.parkingConstraint.values = {
    normal: "NORMAL",
  };
  mapping.datasets.outlets.fields.mallWindow.onBlank = null;
  mapping.datasets.outlets.fields.scheduledWeekday.onBlank = null;
  mapping.datasets.vehicles.fields.type.values = { truck: "TRUCK" };
  mapping.datasets.vehicles.fields.temp.values = { reefer: "REEFER" };
  mapping.datasets.vehicles.fields.available.values = { yes: true, no: false };
  mapping.datasets.calendar.fields.operating.values = { yes: true, no: false };
  const csv = {
    outlets:
      fields.outlets.join(",") +
      '\nSRC-001,"Synthetic, Outlet",fresh,Test,DEP-PLG,street,normal,,04:00,10:00,\n',
    vehicles:
      fields.vehicles.join(",") +
      "\nSRC-V01,truck,reefer,1000,18,diesel,6.25,250,DEP-PLG,yes\n",
    calendar: "date,operating\n2026-10-05,yes\n",
  };
  return { mapping, csv };
}
function memoryDb(existing: Record<string, Row> = {}) {
  const db: ImportDatabase = {
    depotIds: jest.fn(async () => ["DEP-PLG"]),
    find: jest.fn(
      async (_dataset, key) =>
        existing[key instanceof Date ? key.toISOString() : key] ?? null,
    ),
    create: jest.fn(async () => {}),
    lock: jest.fn(async () => {}),
    transaction: jest.fn(async (callback) => callback(db)),
  };
  return db;
}
function prepared() {
  const f = fixture();
  return prepareBatch(f.csv, validateMapping(f.mapping));
}

describe("Dataset importer (synthetic data only)", () => {
  it("validates explicit mapping and converts outlet including a quoted comma", () => {
    const batch = prepared();
    expect(batch.problems).toEqual([]);
    expect(batch.rows.outlets[0]).toEqual({
      id: "SRC-001",
      name: "Synthetic, Outlet",
      brand: "FRESH",
      district: "Test",
      depotId: "DEP-PLG",
      dockType: "STREET",
      parkingConstraint: "NORMAL",
      mallWindow: null,
      windowOpenTime: "04:00",
      windowCloseTime: "10:00",
      scheduledWeekday: null,
    });
  });
  it("requires a valid weekly delivery day for STYLE outlets", () => {
    const f = fixture();
    f.mapping.datasets.outlets.fields.brand.values = { fresh: "STYLE" };
    expect(
      prepareBatch(f.csv, validateMapping(f.mapping)).problems,
    ).toContainEqual(
      expect.objectContaining({ code: "SCHEDULE_NOT_CONFIGURED" }),
    );
    f.csv.outlets = f.csv.outlets.replace("10:00,\n", "10:00,3\n");
    const batch = prepareBatch(f.csv, f.mapping);
    expect(batch.problems).toEqual([]);
    expect(batch.rows.outlets[0].scheduledWeekday).toBe(3);
    for (const value of ["0", "7", "1.5", "NaN"]) {
      const csv = {
        ...f.csv,
        outlets: f.csv.outlets.replace("10:00,3", "10:00," + value),
      };
      expect(prepareBatch(csv, f.mapping).problems).toContainEqual(
        expect.objectContaining({ code: "INVALID_WEEKDAY" }),
      );
    }
  });
  it("converts a valid vehicle", () => {
    expect(prepared().rows.vehicles[0]).toEqual({
      id: "SRC-V01",
      type: "TRUCK",
      temp: "REEFER",
      weightCapKg: 1000,
      volumeCapM3: 18,
      fuelType: "diesel",
      kmPerL: 6.25,
      weeklyFuelQuotaL: 250,
      depotId: "DEP-PLG",
      available: true,
    });
  });
  it("converts a global operating date at UTC midnight", () => {
    expect(prepared().rows.calendar[0]).toEqual({
      date: new Date("2026-10-05T00:00:00.000Z"),
      operating: true,
    });
    expect(dateValue("05/10/2026", "DD/MM/YYYY").toISOString()).toBe(
      "2026-10-05T00:00:00.000Z",
    );
  });
  it("converts fuel units only when explicitly configured", () => {
    const f = fixture();
    f.mapping.datasets.vehicles.fuelEfficiencyUnit = "LPer100Km";
    f.csv.vehicles = f.csv.vehicles.replace("6.25", "16");
    expect(prepareBatch(f.csv, f.mapping).rows.vehicles[0].kmPerL).toBe(6.25);
  });
  it("does not convert destination defaults as source fuel units", () => {
    const f = fixture();
    f.mapping.datasets.vehicles.fuelEfficiencyUnit = "LPer100Km";
    f.mapping.datasets.vehicles.fields.kmPerL = { default: 6.25 };
    f.mapping.datasets.vehicles.ignoreColumns = ["kmPerL"];
    expect(
      prepareBatch(f.csv, validateMapping(f.mapping)).rows.vehicles[0].kmPerL,
    ).toBe(6.25);
  });
  it.each(["outlets", "vehicles", "calendar"] as const)(
    "rejects duplicate %s keys",
    (dataset) => {
      const f = fixture();
      f.csv[dataset] += f.csv[dataset].split("\n")[1] + "\n";
      expect(prepareBatch(f.csv, f.mapping).problems).toContainEqual(
        expect.objectContaining({ dataset, code: "DUPLICATE_KEY" }),
      );
    },
  );
  it.each([
    ["outlets", "fresh", "unknown", "UNMAPPED_VALUE"],
    ["vehicles", "yes", "TRUE", "UNMAPPED_VALUE"],
    ["calendar", "yes", "maybe", "UNMAPPED_VALUE"],
    ["vehicles", "1000", "0", "INVALID_NUMBER"],
    ["vehicles", "1000", "-1", "INVALID_NUMBER"],
    ["vehicles", "1000", "NaN", "INVALID_NUMBER"],
    ["vehicles", "1000", "Infinity", "INVALID_NUMBER"],
    ["vehicles", "1000", "1e999", "INVALID_NUMBER"],
    ["vehicles", "18", "0", "INVALID_NUMBER"],
    ["vehicles", "6.25", "0", "INVALID_NUMBER"],
    ["vehicles", "250", "-1", "INVALID_NUMBER"],
    ["outlets", "04:00", "25:00", "INVALID_TIME"],
    ["outlets", "04:00", "10:00", "INVALID_WINDOW"],
    ["calendar", "2026-10-05", "2026-02-30", "INVALID_DATE"],
    ["outlets", "SRC-001", " SRC-001", "INVALID_ID"],
    ["outlets", "SRC-001", "SRC-001 ", "INVALID_ID"],
    ["outlets", "SRC-001", "OUT-001", "RESERVED_DEMO_ID"],
    ["vehicles", "SRC-V01", "TRK-021", "RESERVED_DEMO_ID"],
  ])("rejects invalid %s value (%s -> %s)", (dataset, from, to, code) => {
    const f = fixture();
    const kind = dataset as keyof typeof f.csv;
    f.csv[kind] = f.csv[kind].replace(from, to);
    expect(prepareBatch(f.csv, f.mapping).problems).toContainEqual(
      expect.objectContaining({ code }),
    );
  });
  it("preserves official-style IDs exactly without aliasing", () => {
    const f = fixture();
    f.csv.outlets = f.csv.outlets.replace("SRC-001", "OUT001");
    f.csv.vehicles = f.csv.vehicles.replace("SRC-V01", "VEH001");
    const batch = prepareBatch(f.csv, f.mapping);
    expect(batch.rows.outlets[0].id).toBe("OUT001");
    expect(batch.rows.vehicles[0].id).toBe("VEH001");
  });
  it("rejects an unknown depot before any writes", async () => {
    const f = fixture();
    f.csv.outlets = f.csv.outlets.replace("DEP-PLG", "UNKNOWN");
    const db = memoryDb();
    await expect(
      runImport(prepareBatch(f.csv, f.mapping), db, true),
    ).rejects.toMatchObject({ summary: { invalid: 1 } });
    expect(db.create).not.toHaveBeenCalled();
    expect(db.transaction).not.toHaveBeenCalled();
  });
  it("allows only explicit depot aliases", () => {
    const f = fixture();
    f.mapping.datasets.outlets.depotIds = {
      mode: "map",
      values: { sourceDepot: "DEP-PLG" },
    };
    f.csv.outlets = f.csv.outlets.replace("DEP-PLG", "sourceDepot");
    expect(
      prepareBatch(f.csv, validateMapping(f.mapping)).rows.outlets[0].depotId,
    ).toBe("DEP-PLG");
  });
  it("rejects missing mapped headers, duplicate/empty headers and malformed CSV", () => {
    const f = fixture();
    f.csv.calendar = "day,operating\n2026-10-05,yes\n";
    expect(prepareBatch(f.csv, f.mapping).problems[0].code).toBe(
      "MISSING_MAPPED_HEADER",
    );
    for (const csv of ["date,date\nx,y\n", "date,\nx,y\n"]) {
      f.csv.calendar = csv;
      expect(prepareBatch(f.csv, f.mapping).problems[0].code).toBe(
        "INVALID_HEADERS",
      );
    }
    f.csv.calendar = "date,operating\n2026-10-05,yes,extra\n";
    expect(prepareBatch(f.csv, f.mapping).problems[0].code).toBe("INVALID_CSV");
  });
  it("rejects depot-specific or unmapped calendar columns", () => {
    const f = fixture();
    f.csv.calendar = "date,operating,depot\n2026-10-05,yes,DEP-PLG\n";
    expect(prepareBatch(f.csv, f.mapping).problems[0].code).toBe(
      "UNMAPPED_HEADER",
    );
    f.mapping.datasets.calendar.ignoreColumns = ["depot"];
    expect(() => validateMapping(f.mapping)).toThrow("global");
  });
  it("rejects unknown, missing, ambiguous and placeholder mapping configuration", () => {
    const f = fixture();
    delete f.mapping.datasets.vehicles.fields.temp;
    expect(() => validateMapping(f.mapping)).toThrow("mapping required");
    const g = fixture();
    g.mapping.datasets.outlets.fields.id.default = "repair";
    expect(() => validateMapping(g.mapping)).toThrow("exactly one");
    const h = fixture();
    h.mapping.datasets.outlets.fields.brand.values = { fresh: "UNKNOWN" };
    expect(() => validateMapping(h.mapping)).toThrow("destination");
    expect(() =>
      validateMapping({ ...fixture().mapping, guessed: true }),
    ).toThrow("Unknown");
    const example = JSON.parse(
      readFileSync(__dirname + "/import-mapping.example.json", "utf8"),
    );
    expect(() => validateMapping(example)).toThrow("placeholder");
  });
  it("supports explicit defaults and optional blank handling", () => {
    const f = fixture();
    f.mapping.datasets.outlets.fields.mallWindow = { default: null };
    f.mapping.datasets.vehicles.fields.available = { default: false };
    // Unused source columns must be explicitly ignored.
    f.mapping.datasets.outlets.ignoreColumns = ["mallWindow"];
    f.mapping.datasets.vehicles.ignoreColumns = ["available"];
    const batch = prepareBatch(f.csv, validateMapping(f.mapping));
    expect(batch.problems).toEqual([]);
    expect(batch.rows.vehicles[0].available).toBe(false);
  });
  it("dry-run reports create counts and makes zero writes/transactions/locks", async () => {
    const db = memoryDb();
    expect(await runImport(prepared(), db)).toEqual({
      create: 3,
      unchanged: 0,
      conflict: 0,
      invalid: 0,
    });
    expect(db.create).not.toHaveBeenCalled();
    expect(db.transaction).not.toHaveBeenCalled();
    expect(db.lock).not.toHaveBeenCalled();
  });
  it("identical existing rows are unchanged including database timestamps", async () => {
    const batch = prepared();
    const db = memoryDb({
      "SRC-001": { ...batch.rows.outlets[0], createdAt: new Date() },
      "SRC-V01": batch.rows.vehicles[0],
      "2026-10-05T00:00:00.000Z": batch.rows.calendar[0],
    });
    expect(await runImport(batch, db)).toEqual({
      create: 0,
      unchanged: 3,
      conflict: 0,
      invalid: 0,
    });
    await runImport(batch, db, true);
    expect(db.create).not.toHaveBeenCalled();
  });
  it("differing existing rows cause conflict without writes", async () => {
    const batch = prepared();
    const db = memoryDb({
      "SRC-001": { ...batch.rows.outlets[0], name: "Different" },
    });
    await expect(runImport(batch, db)).rejects.toMatchObject({
      summary: { create: 2, unchanged: 0, conflict: 1, invalid: 0 },
    });
    expect(db.create).not.toHaveBeenCalled();
  });
  it("rechecks conflicts under transaction lock before creating any rows", async () => {
    const db = memoryDb();
    const batch = prepared();
    (db.find as jest.Mock).mockImplementation(async (dataset: string) =>
      dataset === "outlets" && (db.lock as jest.Mock).mock.calls.length
        ? { ...batch.rows.outlets[0], name: "Concurrent change" }
        : null,
    );
    await expect(runImport(batch, db, true)).rejects.toBeInstanceOf(
      ImportError,
    );
    expect(db.lock).toHaveBeenCalledTimes(1);
    expect(db.create).not.toHaveBeenCalled();
  });
  it("creates the validated batch only inside apply transaction", async () => {
    const db = memoryDb();
    expect(await runImport(prepared(), db, true)).toMatchObject({ create: 3 });
    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(db.lock).toHaveBeenCalledTimes(1);
    expect(db.create).toHaveBeenCalledTimes(3);
  });
});
