/**
 * Idempotent seed: safe to run on every container start. Every write is an upsert keyed by a stable id or
 * unique email, so re-running never duplicates rows. IDs and accounts mirror the Designathon prototype
 * (apps/web/src/features/dispatcher/data) so the UI and the database agree until the official datasets
 * (outlets.csv, vehicles.csv, calendar.csv) are imported by the DB owner.
 */
import { config } from "dotenv";
import bcrypt from "bcrypt";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  Role,
  Brand,
  DockType,
  ParkingConstraint,
  VehicleType,
  VehicleTemp,
  TempRequirement,
  OrderStatus,
  TripStatus,
  StopStatus,
  LoadingRecordStatus,
  LoadingIssueType,
  LoadingIssueStatus,
  ReceiptStatus,
  SyncStatus,
} from "../src/generated/prisma/client";

config({ path: [".env", "../../.env"] });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const depots = [
  { id: "DEP-PLG", name: "Peliyagoda" },
  { id: "DEP-KDY", name: "Kandy" },
];

const outlets = [
  {
    id: "OUT-001",
    name: "FreshMart – Colombo 05",
    brand: Brand.FRESH,
    district: "Colombo",
    depotId: "DEP-PLG",
    dockType: DockType.REAR_DOCK,
    parkingConstraint: ParkingConstraint.NORMAL,
    windowOpenTime: "04:00",
    windowCloseTime: "10:00",
  },
  {
    id: "OUT-002",
    name: "FreshMart – Colombo 07",
    brand: Brand.FRESH,
    district: "Colombo",
    depotId: "DEP-PLG",
    dockType: DockType.REAR_DOCK,
    parkingConstraint: ParkingConstraint.NORMAL,
    windowOpenTime: "04:00",
    windowCloseTime: "10:00",
  },
  {
    // Demo: chilled FRESH outlet reachable only by van (refrigerated van required).
    id: "OUT-003",
    name: "FreshMart – Pettah Market",
    brand: Brand.FRESH,
    district: "Colombo",
    depotId: "DEP-PLG",
    dockType: DockType.STREET,
    parkingConstraint: ParkingConstraint.VAN_ONLY,
    windowOpenTime: "04:00",
    windowCloseTime: "10:00",
  },
  {
    id: "OUT-005",
    name: "City Style – Colombo 02",
    brand: Brand.STYLE,
    district: "Colombo",
    depotId: "DEP-PLG",
    scheduledWeekday: 1,
    dockType: DockType.STREET,
    parkingConstraint: ParkingConstraint.VAN_ONLY,
    windowOpenTime: "08:00",
    windowCloseTime: "14:00",
  },
  {
    id: "OUT-014",
    name: "Hill Fresh – Kandy City",
    brand: Brand.FRESH,
    district: "Kandy",
    depotId: "DEP-KDY",
    dockType: DockType.STREET,
    parkingConstraint: ParkingConstraint.NORMAL,
    windowOpenTime: "04:30",
    windowCloseTime: "09:00",
  },
];

const vehicles = [
  {
    id: "TRK-021",
    type: VehicleType.TRUCK,
    temp: VehicleTemp.REEFER,
    weightCapKg: 1000,
    volumeCapM3: 18,
    fuelType: "diesel",
    kmPerL: 6.25,
    weeklyFuelQuotaL: 250,
    depotId: "DEP-PLG",
  },
  {
    id: "TRK-030",
    type: VehicleType.TRUCK,
    temp: VehicleTemp.AMBIENT,
    weightCapKg: 2000,
    volumeCapM3: 26,
    fuelType: "diesel",
    kmPerL: 100 / 15,
    weeklyFuelQuotaL: 280,
    depotId: "DEP-PLG",
    available: true,
  },
  {
    id: "VAN-012",
    type: VehicleType.VAN,
    temp: VehicleTemp.REEFER,
    weightCapKg: 600,
    volumeCapM3: 8,
    fuelType: "diesel",
    kmPerL: 100 / 11,
    weeklyFuelQuotaL: 150,
    depotId: "DEP-PLG",
    available: true,
  },
  {
    // Demo: second refrigerated van so a van that becomes unavailable can be replaced.
    id: "VAN-015",
    type: VehicleType.VAN,
    temp: VehicleTemp.REEFER,
    weightCapKg: 600,
    volumeCapM3: 8,
    fuelType: "diesel",
    kmPerL: 100 / 11,
    weeklyFuelQuotaL: 150,
    depotId: "DEP-PLG",
    available: true,
  },
  {
    id: "TRK-041",
    type: VehicleType.TRUCK,
    temp: VehicleTemp.REEFER,
    weightCapKg: 1000,
    volumeCapM3: 18,
    fuelType: "diesel",
    kmPerL: 100 / 18,
    weeklyFuelQuotaL: 260,
    depotId: "DEP-KDY",
    available: true,
  },
  {
    id: "TRK-024",
    type: VehicleType.TRUCK,
    temp: VehicleTemp.AMBIENT,
    weightCapKg: 1800,
    volumeCapM3: 24,
    fuelType: "diesel",
    kmPerL: 100 / 15,
    weeklyFuelQuotaL: 260,
    depotId: "DEP-PLG",
    available: false,
  },
];

// Fixed Monday keeps allocation fixtures deterministic; these are not rolling production orders.
const allocationDate = new Date("2026-10-05T00:00:00.000Z");
const orders = [
  {
    id: "ORD-DEMO-CHILLED",
    outletId: "OUT-001",
    temp: TempRequirement.CHILLED,
    units: 20,
    weightKg: 160,
    volumeM3: 2.4,
  },
  {
    id: "ORD-DEMO-AMBIENT",
    outletId: "OUT-002",
    temp: TempRequirement.AMBIENT,
    units: 15,
    weightKg: 90,
    volumeM3: 1.6,
  },
  {
    id: "ORD-DEMO-VAN",
    outletId: "OUT-005",
    temp: TempRequirement.CHILLED,
    units: 18,
    weightKg: 220,
    volumeM3: 3.5,
  },
  {
    id: "ORD-DEMO-WEIGHT",
    outletId: "OUT-001",
    temp: TempRequirement.CHILLED,
    units: 100,
    weightKg: 1001,
    volumeM3: 2,
  },
  {
    id: "ORD-DEMO-VOLUME",
    outletId: "OUT-001",
    temp: TempRequirement.CHILLED,
    units: 100,
    weightKg: 100,
    volumeM3: 18.1,
  },
];

const users = [
  {
    id: "USR-DSP",
    email: "dispatcher@waypoint.lk",
    name: "Anjali Fernando",
    role: Role.DISPATCHER,
  },
  {
    id: "USR-LDR",
    email: "loader@waypoint.lk",
    name: "Pradeep Kumara",
    role: Role.LOADER,
    depotId: "DEP-PLG",
  },
  {
    id: "USR-DRV",
    email: "driver@waypoint.lk",
    name: "Nimal Silva",
    role: Role.DRIVER,
    depotId: "DEP-PLG",
    vehicleId: "TRK-021",
  },
  {
    // Allocation requires exactly one active driver per vehicle.
    id: "USR-DRV2",
    email: "driver2@waypoint.lk",
    name: "Kasun Bandara",
    role: Role.DRIVER,
    depotId: "DEP-PLG",
    vehicleId: "VAN-012",
  },
  {
    id: "USR-DRV3",
    email: "driver3@waypoint.lk",
    name: "Ruwan Dissanayake",
    role: Role.DRIVER,
    depotId: "DEP-PLG",
    vehicleId: "VAN-015",
  },
  {
    id: "USR-STR",
    email: "store@waypoint.lk",
    name: "Sanduni Perera",
    role: Role.STORE_MANAGER,
    outletId: "OUT-001",
  },
  {
    id: "USR-STR2",
    email: "store2@waypoint.lk",
    name: "Kavindu Jayawardena",
    role: Role.STORE_MANAGER,
    outletId: "OUT-002",
  },
  {
    id: "USR-STR3",
    email: "store3@waypoint.lk",
    name: "Dilani Wickramasinghe",
    role: Role.STORE_MANAGER,
    outletId: "OUT-003",
  },
];

// Fictional base catalog so Store Managers can order on a fresh Docker database.
const catalog = [
  { id: "CAT-FRESH-MILK", brand: Brand.FRESH, name: "Fresh milk 1L (12 pack)", unit: "crate", temp: TempRequirement.CHILLED, unitWeightKg: 12.5, unitVolumeM3: 0.02 },
  { id: "CAT-FRESH-YOGURT", brand: Brand.FRESH, name: "Set yoghurt 80g (48 pack)", unit: "crate", temp: TempRequirement.CHILLED, unitWeightKg: 4.5, unitVolumeM3: 0.015 },
  { id: "CAT-FRESH-CHICKEN", brand: Brand.FRESH, name: "Chicken breast 1kg (10 pack)", unit: "case", temp: TempRequirement.CHILLED, unitWeightKg: 10.5, unitVolumeM3: 0.018 },
  { id: "CAT-FRESH-RICE", brand: Brand.FRESH, name: "Samba rice 5kg (4 pack)", unit: "case", temp: TempRequirement.AMBIENT, unitWeightKg: 20.4, unitVolumeM3: 0.03 },
  { id: "CAT-FRESH-BREAD", brand: Brand.FRESH, name: "Sandwich bread (20 loaves)", unit: "crate", temp: TempRequirement.AMBIENT, unitWeightKg: 9, unitVolumeM3: 0.06 },
  { id: "CAT-STYLE-SHIRTS", brand: Brand.STYLE, name: "Cotton shirts (24 pack)", unit: "carton", temp: TempRequirement.AMBIENT, unitWeightKg: 7, unitVolumeM3: 0.05 },
  { id: "CAT-TECH-PHONES", brand: Brand.TECH, name: "Smartphones (10 pack)", unit: "carton", temp: TempRequirement.AMBIENT, unitWeightKg: 3, unitVolumeM3: 0.02 },
];

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(
    process.env.SEED_DEMO_PASSWORD ?? "waypoint-demo",
    10,
  );

  for (const d of depots) {
    await prisma.depot.upsert({ where: { id: d.id }, update: {}, create: d });
  }
  for (const o of outlets) {
    const { id } = o;
    await prisma.outlet.upsert({ where: { id }, update: {}, create: o });
  }
  for (const v of vehicles) {
    const { id } = v;
    await prisma.vehicle.upsert({ where: { id }, update: {}, create: v });
  }
  for (const u of users) {
    const { email } = u;
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: { ...u, passwordHash },
    });
  }

  for (const item of catalog) {
    await prisma.catalogItem.upsert({ where: { id: item.id }, update: {}, create: item });
  }

  // Email-based upsert may find an account whose ID differs from the demo ID.
  const creator = await prisma.user.findUniqueOrThrow({
    where: { email: "dispatcher@waypoint.lk" },
  });
  for (const order of orders) {
    const { id } = order;
    await prisma.order.upsert({
      where: { id },
      update: {},
      create: {
        ...order,
        createdById: creator.id,
        requestedDate: allocationDate,
        plannedDate: allocationDate,
        status: OrderStatus.CONFIRMED,
      },
    });
  }

  await prisma.$transaction(async (tx) => {
    for (const order of orders) {
      await tx.orderLine.upsert({
        where: { id: `LINE-${order.id}` },
        update: {},
        create: {
          id: `LINE-${order.id}`,
          orderId: order.id,
          item: "Demo cases",
          unit: "cases",
          requestedQty: order.units,
          unitWeightKg: order.weightKg / order.units,
          unitVolumeM3: order.volumeM3 / order.units,
        },
      });
    }

    const store = await tx.user.findUniqueOrThrow({
      where: { email: "store@waypoint.lk" },
    });
    const store2 = await tx.user.findUniqueOrThrow({
      where: { email: "store2@waypoint.lk" },
    });
    const driver = await tx.user.findUniqueOrThrow({
      where: { email: "driver@waypoint.lk" },
    });
    const loader = await tx.user.findUniqueOrThrow({
      where: { email: "loader@waypoint.lk" },
    });
    const workflowDate = new Date("2026-10-06T00:00:00.000Z");
    const at = (time: string) => new Date(`2026-10-06T${time}+05:30`);

    const happyAt = (time: string) => new Date(`2026-10-05T${time}+05:30`);
    const source = "Fictional shared workflow fixture";
    for (const outletId of ["OUT-001", "OUT-002", "OUT-003"]) {
      await tx.outletHandling.upsert({
        where: { outletId },
        update: {},
        create: { outletId, serviceMin: 15, source },
      });
      for (const [fromKey, toKey] of [
        [`depot:DEP-PLG`, `outlet:${outletId}`],
        [`outlet:${outletId}`, `depot:DEP-PLG`],
      ]) {
        await tx.travelLeg.upsert({
          where: { fromKey_toKey: { fromKey, toKey } },
          update: {},
          create: { fromKey, toKey, distanceKm: 20, durationMin: 30, source },
        });
      }
    }
    const signatureId = "EVIDENCE-WF-HAPPY-SIGNATURE";
    // A tiny synthetic image makes the authenticated evidence route testable; not real proof of delivery.
    const image = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1f8AAAAASUVORK5CYII=",
      "base64",
    );
    const delivered = {
      outcome: "DELIVERED",
      lines: [
        { orderLineId: "LINE-WF-HAPPY", deliveredQty: 10, returnedQty: 0 },
      ],
      proof: {
        recipientName: store.name,
        signatureRef: signatureId,
        photoRefs: [],
      },
      damageReported: false,
    };
    await tx.evidence.upsert({
      where: { id: signatureId },
      update: {},
      create: {
        id: signatureId,
        ownerId: driver.id,
        orderId: "ORD-WF-HAPPY",
        tripId: "TRIP-WF-HAPPY",
        mediaType: "image/png",
        sizeBytes: image.length,
        bytes: image,
      },
    });

    // A separate completed happy path keeps the allocation queue untouched.
    await tx.order.upsert({
      where: { id: "ORD-WF-HAPPY" },
      update: {},
      create: {
        id: "ORD-WF-HAPPY",
        outletId: "OUT-001",
        createdById: store.id,
        requestedDate: allocationDate,
        plannedDate: allocationDate,
        temp: TempRequirement.CHILLED,
        units: 10,
        weightKg: 80,
        volumeM3: 1.2,
        status: OrderStatus.RECEIVED,
      },
    });
    await tx.orderLine.upsert({
      where: { id: "LINE-WF-HAPPY" },
      update: {},
      create: {
        id: "LINE-WF-HAPPY",
        orderId: "ORD-WF-HAPPY",
        loadedQty: 10,
        deliveredQty: 10,
        item: "Chilled demo cases",
        unit: "cases",
        requestedQty: 10,
        unitWeightKg: 8,
        unitVolumeM3: 0.12,
      },
    });
    await tx.trip.upsert({
      where: { id: "TRIP-WF-HAPPY" },
      update: {},
      create: {
        id: "TRIP-WF-HAPPY",
        vehicleId: "TRK-021",
        driverId: driver.id,
        depotId: "DEP-PLG",
        date: allocationDate,
        tripNo: 1,
        status: TripStatus.COMPLETED,
        plannedDeparture: "04:00",
        totalWeightKg: 80,
        totalVolumeM3: 1.2,
        distanceKm: 40,
        publishedAt: happyAt("03:00:00"),
        loaderAcknowledgedPlanVersion: 1,
        plannedDepartureAt: happyAt("04:00:00"),
        plannedReturnAt: happyAt("05:15:00"),
        departedAt: happyAt("04:00:00"),
        departedPlanVersion: 1,
        fuelWeekStart: allocationDate,
        committedFuelL: 6.4,
      },
    });
    await tx.tripStop.upsert({
      where: { id: "STOP-WF-HAPPY" },
      update: {},
      create: {
        id: "STOP-WF-HAPPY",
        tripId: "TRIP-WF-HAPPY",
        orderId: "ORD-WF-HAPPY",
        sequence: 1,
        plannedArrivalAt: happyAt("04:30:00"),
        etaTime: "04:30",
        status: StopStatus.DELIVERED,
        active: false,
        arrivedAt: new Date("2026-10-05T04:30:00+05:30"),
      },
    });
    await tx.tripStopLine.upsert({
      where: { id: "ATTEMPT-WF-HAPPY" },
      update: {},
      create: {
        id: "ATTEMPT-WF-HAPPY",
        stopId: "STOP-WF-HAPPY",
        orderLineId: "LINE-WF-HAPPY",
        plannedQty: 10,
        cancelledQty: 0,
        loadedQty: 10,
        deliveredQty: 10,
        returnedQty: 0,
      },
    });
    await tx.loadingRecord.upsert({
      where: { id: "LOAD-WF-HAPPY" },
      update: {},
      create: {
        id: "LOAD-WF-HAPPY",
        tripId: "TRIP-WF-HAPPY",
        checkedById: loader.id,
        status: LoadingRecordStatus.COMPLETED,
        startedAt: new Date("2026-10-05T03:30:00+05:30"),
        completedAt: new Date("2026-10-05T03:55:00+05:30"),
      },
    });
    await tx.delivery.upsert({
      where: { id: "DELIVERY-WF-HAPPY" },
      update: {},
      create: {
        id: "DELIVERY-WF-HAPPY",
        stopId: "STOP-WF-HAPPY",
        outcome: StopStatus.DELIVERED,
        arrivedAt: new Date("2026-10-05T04:30:00+05:30"),
        completedAt: new Date("2026-10-05T04:45:00+05:30"),
        clientActionId: "ACTION-WF-DELIVER-HAPPY",
        recorded: delivered,
        capturedAt: happyAt("04:45:00"),
      },
    });
    await tx.proofOfDelivery.upsert({
      where: { id: "POD-WF-HAPPY" },
      update: {},
      create: {
        id: "POD-WF-HAPPY",
        deliveryId: "DELIVERY-WF-HAPPY",
        recipientName: store.name,
        signatureRef: signatureId,
        capturedAt: new Date("2026-10-05T04:45:00+05:30"),
      },
    });
    await tx.receipt.upsert({
      where: { id: "RECEIPT-WF-HAPPY" },
      update: {},
      create: {
        id: "RECEIPT-WF-HAPPY",
        deliveryId: "DELIVERY-WF-HAPPY",
        confirmedById: store.id,
        status: ReceiptStatus.CONFIRMED,
        confirmedAt: new Date("2026-10-05T05:00:00+05:30"),
      },
    });
    await tx.receiptLine.upsert({
      where: { id: "RECEIPT-LINE-WF-HAPPY" },
      update: {},
      create: {
        id: "RECEIPT-LINE-WF-HAPPY",
        receiptId: "RECEIPT-WF-HAPPY",
        orderLineId: "LINE-WF-HAPPY",
        acceptedQty: 10,
        damagedQty: 0,
        missingQty: 0,
        photoRefs: [],
      },
    });

    // A second, still-planned trip has an open loading shortfall, so cannot be ready.
    await tx.order.upsert({
      where: { id: "ORD-WF-SHORT" },
      update: {},
      create: {
        id: "ORD-WF-SHORT",
        outletId: "OUT-001",
        createdById: store.id,
        requestedDate: workflowDate,
        plannedDate: workflowDate,
        temp: TempRequirement.CHILLED,
        units: 10,
        weightKg: 80,
        volumeM3: 1.2,
        status: OrderStatus.LOADING,
      },
    });
    await tx.orderLine.upsert({
      where: { id: "LINE-WF-SHORT" },
      update: {},
      create: {
        id: "LINE-WF-SHORT",
        orderId: "ORD-WF-SHORT",
        item: "Chilled demo cases",
        unit: "cases",
        requestedQty: 10,
        unitWeightKg: 8,
        unitVolumeM3: 0.12,
      },
    });
    await tx.trip.upsert({
      where: { id: "TRIP-WF-PLANNED" },
      update: {},
      create: {
        id: "TRIP-WF-PLANNED",
        vehicleId: "TRK-021",
        driverId: driver.id,
        depotId: "DEP-PLG",
        date: workflowDate,
        tripNo: 1,
        status: TripStatus.LOADING,
        plannedDeparture: "04:00",
        totalWeightKg: 80,
        totalVolumeM3: 1.2,
        distanceKm: 40,
        publishedAt: at("03:00:00"),
        plannedDepartureAt: at("04:00:00"),
        plannedReturnAt: at("05:15:00"),
        fuelWeekStart: allocationDate,
        reservedFuelL: 6.4,
      },
    });
    await tx.tripStop.upsert({
      where: { id: "STOP-WF-SHORT" },
      update: {},
      create: {
        id: "STOP-WF-SHORT",
        tripId: "TRIP-WF-PLANNED",
        orderId: "ORD-WF-SHORT",
        sequence: 1,
        status: StopStatus.PLANNED,
        active: true,
        etaTime: "04:30",
        plannedArrivalAt: at("04:30:00"),
      },
    });
    await tx.tripStopLine.upsert({
      where: { id: "ATTEMPT-WF-SHORT" },
      update: {},
      create: {
        id: "ATTEMPT-WF-SHORT",
        stopId: "STOP-WF-SHORT",
        orderLineId: "LINE-WF-SHORT",
        plannedQty: 10,
        cancelledQty: 0,
        loadedQty: 8,
        deliveredQty: null,
        returnedQty: null,
      },
    });
    await tx.loadingRecord.upsert({
      where: { id: "LOAD-WF-SHORT" },
      update: {},
      create: {
        id: "LOAD-WF-SHORT",
        tripId: "TRIP-WF-PLANNED",
        checkedById: loader.id,
        status: LoadingRecordStatus.IN_PROGRESS,
        startedAt: at("03:30:00"),
      },
    });
    await tx.loadingIssue.upsert({
      where: { id: "ISSUE-WF-SHORT" },
      update: {},
      create: {
        id: "ISSUE-WF-SHORT",
        loadingRecordId: "LOAD-WF-SHORT",
        orderLineId: "LINE-WF-SHORT",
        type: LoadingIssueType.MISSING,
        expectedQty: 10,
        availableQty: 8,
        stopId: "STOP-WF-SHORT",
        reportedPlanVersion: 1,
        photoRefs: [],
        note: "Two cases unavailable; awaiting dispatcher decision",
        status: LoadingIssueStatus.OPEN,
      },
    });
    await tx.order.upsert({
      where: { id: "ORD-WF-DEFERRED" },
      update: {},
      create: {
        id: "ORD-WF-DEFERRED",
        outletId: "OUT-002",
        createdById: store2.id,
        requestedDate: allocationDate,
        plannedDate: workflowDate,
        deferredToDate: workflowDate,
        temp: TempRequirement.AMBIENT,
        units: 5,
        weightKg: 40,
        volumeM3: 0.6,
        status: OrderStatus.DEFERRED,
        deferReason: "capacity",
        deferralCount: 1,
      },
    });
    await tx.orderLine.upsert({
      where: { id: "LINE-WF-DEFERRED" },
      update: {},
      create: {
        id: "LINE-WF-DEFERRED",
        orderId: "ORD-WF-DEFERRED",
        item: "Ambient demo cases",
        unit: "cases",
        requestedQty: 5,
        unitWeightKg: 8,
        unitVolumeM3: 0.12,
      },
    });
    await tx.orderDeferral.upsert({
      where: { id: "DEFERRAL-WF-DEFERRED" },
      update: {},
      create: {
        id: "DEFERRAL-WF-DEFERRED",
        orderId: "ORD-WF-DEFERRED",
        fromDate: allocationDate,
        toDate: workflowDate,
        reason: "capacity",
        actorId: creator.id,
        recordedAt: new Date("2026-10-04T17:00:00+05:30"),
      },
    });
    await tx.auditEvent.upsert({
      where: { id: "AUDIT-WF-DEFERRED" },
      update: {},
      create: {
        id: "AUDIT-WF-DEFERRED",
        actorId: creator.id,
        entityType: "Order",
        entityId: "ORD-WF-DEFERRED",
        action: "DEFER",
        reason: "capacity",
        createdAt: new Date("2026-10-04T17:00:00+05:30"),
        payload: { fromDate: "2026-10-05", toDate: "2026-10-06" },
      },
    });
    await tx.syncAction.upsert({
      where: { clientActionId: "ACTION-WF-DELIVER-HAPPY" },
      update: {},
      create: {
        id: "SYNC-WF-HAPPY",
        clientActionId: "ACTION-WF-DELIVER-HAPPY",
        userId: driver.id,
        actionType: "DELIVER",
        entityId: "STOP-WF-HAPPY",
        status: SyncStatus.SYNCED,
        retryCount: 0,
        createdAt: new Date("2026-10-05T04:45:00+05:30"),
        syncedAt: new Date("2026-10-05T04:46:00+05:30"),
        payload: { deliveryId: "DELIVERY-WF-HAPPY", deliveredQty: 10 },
      },
    });
    for (const [date, operating] of [
      ["2026-10-05", true],
      ["2026-10-06", true],
      ["2026-10-11", false],
    ] as const) {
      await tx.operatingDay.upsert({
        where: { date: new Date(`${date}T00:00:00Z`) },
        update: {},
        create: { date: new Date(`${date}T00:00:00Z`), operating },
      });
    }
  });

  // Rolling operating calendar (Mon–Sat) from today, so a fresh stack can plan on any demo day.
  const today = new Date(new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10));
  for (let i = -1; i < 90; i++) {
    const day = new Date(today);
    day.setUTCDate(day.getUTCDate() + i);
    await prisma.operatingDay.upsert({
      where: { date: day },
      update: {},
      create: { date: day, operating: day.getUTCDay() !== 0 },
    });
  }
  // Fictional legs between the Peliyagoda outlets so multi-stop plans can be timed.
  const source = "Fictional shared workflow fixture";
  for (const [a, b, distanceKm, durationMin] of [
    ["OUT-001", "OUT-002", 5, 10],
    ["OUT-001", "OUT-003", 6, 12],
    ["OUT-002", "OUT-003", 7, 14],
  ] as const) {
    for (const [fromKey, toKey] of [[`outlet:${a}`, `outlet:${b}`], [`outlet:${b}`, `outlet:${a}`]]) {
      await prisma.travelLeg.upsert({
        where: { fromKey_toKey: { fromKey, toKey } },
        update: {},
        create: { fromKey, toKey, distanceKm, durationMin, source },
      });
    }
  }

  console.log(
    "Shared workflow fixtures seeded (happy path, loading shortfall, deferral, sync and global calendar).",
  );
  console.log(
    `Seeded ${depots.length} depots, ${outlets.length} outlets, ${vehicles.length} vehicles, ${users.length} users, ${orders.length} allocation orders.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
