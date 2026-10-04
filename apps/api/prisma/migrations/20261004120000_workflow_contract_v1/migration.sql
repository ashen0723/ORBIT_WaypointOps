BEGIN;

-- DropForeignKey
ALTER TABLE "TripStop" DROP CONSTRAINT "TripStop_tripId_fkey";

-- DropForeignKey
ALTER TABLE "LoadingRecord" DROP CONSTRAINT "LoadingRecord_tripId_fkey";

-- DropForeignKey
ALTER TABLE "ProofOfDelivery" DROP CONSTRAINT "ProofOfDelivery_deliveryId_fkey";

-- DropIndex
DROP INDEX "TripStop_orderId_key";

-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "driverId" TEXT;

-- AlterTable
ALTER TABLE "TripStop" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "TripStopLine" (
    "id" TEXT NOT NULL,
    "tripStopId" TEXT NOT NULL,
    "orderLineId" TEXT NOT NULL,
    "plannedQty" INTEGER NOT NULL,
    "cancelledQty" INTEGER NOT NULL DEFAULT 0,
    "loadedQty" INTEGER,
    "deliveredQty" INTEGER,
    "returnedQty" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TripStopLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceiptLine" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "orderLineId" TEXT NOT NULL,
    "acceptedQty" INTEGER NOT NULL,
    "damagedQty" INTEGER NOT NULL,
    "missingQty" INTEGER NOT NULL,

    CONSTRAINT "ReceiptLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperatingDay" (
    "date" DATE NOT NULL,
    "operating" BOOLEAN NOT NULL,

    CONSTRAINT "OperatingDay_pkey" PRIMARY KEY ("date")
);

-- CreateIndex
CREATE UNIQUE INDEX "TripStopLine_tripStopId_orderLineId_key" ON "TripStopLine"("tripStopId", "orderLineId");

-- CreateIndex
CREATE UNIQUE INDEX "ReceiptLine_receiptId_orderLineId_key" ON "ReceiptLine"("receiptId", "orderLineId");

-- CreateIndex
CREATE INDEX "TripStop_orderId_idx" ON "TripStop"("orderId");

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripStop" ADD CONSTRAINT "TripStop_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadingRecord" ADD CONSTRAINT "LoadingRecord_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProofOfDelivery" ADD CONSTRAINT "ProofOfDelivery_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripStopLine" ADD CONSTRAINT "TripStopLine_tripStopId_fkey" FOREIGN KEY ("tripStopId") REFERENCES "TripStop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripStopLine" ADD CONSTRAINT "TripStopLine_orderLineId_fkey" FOREIGN KEY ("orderLineId") REFERENCES "OrderLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptLine" ADD CONSTRAINT "ReceiptLine_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptLine" ADD CONSTRAINT "ReceiptLine_orderLineId_fkey" FOREIGN KEY ("orderLineId") REFERENCES "OrderLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Legacy terminal attempts must not block a new assignment.
UPDATE "TripStop" SET "isActive" = false
WHERE "status" IN ('DELIVERED', 'PARTIAL', 'FAILED', 'RESCHEDULED')
   OR EXISTS (SELECT 1 FROM "Delivery" d WHERE d."stopId" = "TripStop"."id"
              AND d."outcome" IN ('DELIVERED', 'PARTIAL', 'FAILED', 'RESCHEDULED'));

-- Hand-maintained PostgreSQL partial index: only current assignments are unique.
-- Keep this SQL in future migrations; the ordinary orderId index covers history queries.
CREATE UNIQUE INDEX "TripStop_one_active_order_key"
ON "TripStop" ("orderId") WHERE "isActive" = true;

-- The baseline allowed only one stop per order, so legacy line counts can be copied
-- to that single attempt. Original requested quantities are never changed.
INSERT INTO "TripStopLine" ("id", "tripStopId", "orderLineId", "plannedQty", "loadedQty", "deliveredQty")
SELECT 'legacy:' || s."id" || ':' || l."id", s."id", l."id", l."requestedQty", l."loadedQty", l."deliveredQty"
FROM "TripStop" s JOIN "OrderLine" l ON l."orderId" = s."orderId";

COMMIT;
