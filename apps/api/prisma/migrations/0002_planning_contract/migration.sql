BEGIN;
-- AlterEnum
ALTER TYPE "TempRequirement" ADD VALUE 'FROZEN';

-- DropIndex
DROP INDEX "Trip_vehicleId_date_tripNo_key";

-- DropIndex
DROP INDEX "TripStop_orderId_key";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "recoveryPending" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "OrderLine" ADD COLUMN     "cancelledQty" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "committedFuelL" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "driverId" TEXT,
ADD COLUMN     "fuelWeekStart" DATE,
ADD COLUMN     "loaderAcknowledgedPlanVersion" INTEGER,
ADD COLUMN     "planVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "plannedDepartureAt" TIMESTAMP(3),
ADD COLUMN     "plannedReturnAt" TIMESTAMP(3),
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "releasedAt" TIMESTAMP(3),
ADD COLUMN     "reservedFuelL" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "TripStop" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "plannedArrivalAt" TIMESTAMP(3),
ADD COLUMN     "reschedule" JSONB;

-- AlterTable
ALTER TABLE "Delivery" ADD COLUMN     "requiresDispatcherReview" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "PlanDraft" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "plan" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "allocatedTripId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripStopLine" (
    "id" TEXT NOT NULL,
    "stopId" TEXT NOT NULL,
    "orderLineId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "plannedQty" INTEGER NOT NULL,
    "cancelledQty" INTEGER NOT NULL DEFAULT 0,
    "loadedQty" INTEGER,
    "deliveredQty" INTEGER,
    "returnedQty" INTEGER,
    "pendingUnload" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TripStopLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuantityCancellation" (
    "id" TEXT NOT NULL,
    "orderLineId" TEXT NOT NULL,
    "loadingIssueId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuantityCancellation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceiptLine" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "orderLineId" TEXT NOT NULL,
    "acceptedQty" INTEGER NOT NULL,
    "damagedQty" INTEGER NOT NULL,
    "missingQty" INTEGER NOT NULL,
    "note" TEXT,
    "photoRefs" TEXT[],

    CONSTRAINT "ReceiptLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecoveryDecision" (
    "id" TEXT NOT NULL,
    "sourceDeliveryId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "decision" JSONB NOT NULL,
    "decidedById" TEXT NOT NULL,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retryStopId" TEXT,

    CONSTRAINT "RecoveryDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldConflict" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "userId" TEXT NOT NULL,
    "clientActionId" TEXT NOT NULL,
    "action" JSONB NOT NULL,
    "currentPlanVersion" INTEGER NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolution" JSONB,

    CONSTRAINT "FieldConflict_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MutationRecord" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "clientActionId" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MutationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperatingDay" (
    "date" DATE NOT NULL,
    "operating" BOOLEAN NOT NULL,

    CONSTRAINT "OperatingDay_pkey" PRIMARY KEY ("date")
);

-- CreateTable
CREATE TABLE "TravelLeg" (
    "id" TEXT NOT NULL,
    "fromKey" TEXT NOT NULL,
    "toKey" TEXT NOT NULL,
    "distanceKm" DOUBLE PRECISION NOT NULL,
    "durationMin" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,

    CONSTRAINT "TravelLeg_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutletHandling" (
    "outletId" TEXT NOT NULL,
    "serviceMin" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,

    CONSTRAINT "OutletHandling_pkey" PRIMARY KEY ("outletId")
);

-- CreateTable
CREATE TABLE "VehicleAvailability" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "available" BOOLEAN NOT NULL,

    CONSTRAINT "VehicleAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlanDraft_allocatedTripId_key" ON "PlanDraft"("allocatedTripId");

-- CreateIndex
CREATE UNIQUE INDEX "TripStopLine_stopId_orderLineId_key" ON "TripStopLine"("stopId", "orderLineId");

-- CreateIndex
CREATE UNIQUE INDEX "QuantityCancellation_loadingIssueId_key" ON "QuantityCancellation"("loadingIssueId");

-- CreateIndex
CREATE UNIQUE INDEX "ReceiptLine_receiptId_orderLineId_key" ON "ReceiptLine"("receiptId", "orderLineId");

-- CreateIndex
CREATE UNIQUE INDEX "RecoveryDecision_retryStopId_key" ON "RecoveryDecision"("retryStopId");

-- CreateIndex
CREATE UNIQUE INDEX "FieldConflict_userId_clientActionId_key" ON "FieldConflict"("userId", "clientActionId");

-- CreateIndex
CREATE UNIQUE INDEX "MutationRecord_actorId_clientActionId_key" ON "MutationRecord"("actorId", "clientActionId");

-- CreateIndex
CREATE UNIQUE INDEX "TravelLeg_fromKey_toKey_key" ON "TravelLeg"("fromKey", "toKey");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleAvailability_vehicleId_date_key" ON "VehicleAvailability"("vehicleId", "date");

-- CreateIndex
CREATE INDEX "Trip_vehicleId_date_tripNo_idx" ON "Trip"("vehicleId", "date", "tripNo");

-- CreateIndex
CREATE INDEX "Trip_vehicleId_fuelWeekStart_idx" ON "Trip"("vehicleId", "fuelWeekStart");

-- AddForeignKey
ALTER TABLE "TripStopLine" ADD CONSTRAINT "TripStopLine_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "TripStop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripStopLine" ADD CONSTRAINT "TripStopLine_orderLineId_fkey" FOREIGN KEY ("orderLineId") REFERENCES "OrderLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuantityCancellation" ADD CONSTRAINT "QuantityCancellation_orderLineId_fkey" FOREIGN KEY ("orderLineId") REFERENCES "OrderLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptLine" ADD CONSTRAINT "ReceiptLine_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptLine" ADD CONSTRAINT "ReceiptLine_orderLineId_fkey" FOREIGN KEY ("orderLineId") REFERENCES "OrderLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecoveryDecision" ADD CONSTRAINT "RecoveryDecision_sourceDeliveryId_fkey" FOREIGN KEY ("sourceDeliveryId") REFERENCES "Delivery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Archive historical terminal attempts; new uniqueness applies only to active work.
UPDATE "TripStop" SET "active" = false WHERE "status" IN ('DELIVERED', 'PARTIAL', 'FAILED', 'RESCHEDULED');
CREATE UNIQUE INDEX "TripStop_one_active_order" ON "TripStop" ("orderId") WHERE "active";
CREATE UNIQUE INDEX "Trip_active_vehicle_slot" ON "Trip" ("vehicleId", "date", "tripNo") WHERE "releasedAt" IS NULL;
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_slot_range" CHECK ("tripNo" IN (1, 2));
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_fuel_nonnegative" CHECK ("reservedFuelL" >= 0 AND "committedFuelL" >= 0);
ALTER TABLE "TripStopLine" ADD CONSTRAINT "Attempt_quantities" CHECK (
 "plannedQty" >= 0 AND "cancelledQty" >= 0 AND "cancelledQty" <= "plannedQty"
 AND ("loadedQty" IS NULL OR ("loadedQty" >= 0 AND "loadedQty" <= "plannedQty" - "cancelledQty"))
 AND ("deliveredQty" IS NULL OR "deliveredQty" >= 0)
 AND ("returnedQty" IS NULL OR "returnedQty" >= 0));
ALTER TABLE "ReceiptLine" ADD CONSTRAINT "Receipt_quantities" CHECK ("acceptedQty" >= 0 AND "damagedQty" >= 0 AND "missingQty" >= 0);
ALTER TABLE "QuantityCancellation" ADD CONSTRAINT "Cancellation_positive" CHECK ("qty" > 0);
ALTER TABLE "TravelLeg" ADD CONSTRAINT "Travel_nonnegative" CHECK ("distanceKm" >= 0 AND "durationMin" >= 0);
ALTER TABLE "OutletHandling" ADD CONSTRAINT "Handling_nonnegative" CHECK ("serviceMin" >= 0);
-- Preserve existing line facts when upgrading an existing prototype database.
INSERT INTO "TripStopLine" ("id", "stopId", "orderLineId", "plannedQty", "loadedQty", "deliveredQty")
SELECT 'legacy-' || s."id" || '-' || l."id", s."id", l."id", l."requestedQty", l."loadedQty", l."deliveredQty"
FROM "TripStop" s JOIN "OrderLine" l ON l."orderId" = s."orderId";
COMMIT;
