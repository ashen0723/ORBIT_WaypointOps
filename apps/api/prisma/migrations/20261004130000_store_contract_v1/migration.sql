-- AlterEnum
ALTER TYPE "TempRequirement" ADD VALUE 'FROZEN';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "activeTripId" TEXT,
ADD COLUMN     "clientActionId" TEXT,
ADD COLUMN     "recoveryPending" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requestHash" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- Derive cumulative quantities from Tharusha's authoritative attempt rows.
ALTER TABLE "OrderLine" ADD COLUMN "cancelledQty" INTEGER NOT NULL DEFAULT 0;
UPDATE "OrderLine" AS l SET
  "cancelledQty" = COALESCE((SELECT SUM(a."cancelledQty") FROM "TripStopLine" AS a WHERE a."orderLineId" = l."id"), 0),
  "deliveredQty" = COALESCE((SELECT SUM(a."deliveredQty") FROM "TripStopLine" AS a WHERE a."orderLineId" = l."id"), l."deliveredQty", 0);
ALTER TABLE "OrderLine" ALTER COLUMN "deliveredQty" SET NOT NULL;
ALTER TABLE "OrderLine" ALTER COLUMN "deliveredQty" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "Delivery" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Receipt" ADD COLUMN     "clientActionId" TEXT,
ADD COLUMN     "requestHash" TEXT;

-- AlterTable
ALTER TABLE "ReceiptLine" ADD COLUMN     "note" TEXT,
ADD COLUMN     "photoRefs" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE UNIQUE INDEX "Order_clientActionId_key" ON "Order"("clientActionId");

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_clientActionId_key" ON "Receipt"("clientActionId");
