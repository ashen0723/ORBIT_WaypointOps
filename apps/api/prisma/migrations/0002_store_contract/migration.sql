-- AlterEnum
ALTER TYPE "TempRequirement" ADD VALUE 'FROZEN';

-- DropIndex
DROP INDEX "TripStop_orderId_key";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "activeTripId" TEXT,
ADD COLUMN     "clientActionId" TEXT,
ADD COLUMN     "recoveryPending" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requestHash" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- Existing draft rows may have no delivered quantity yet.
UPDATE "OrderLine" SET "deliveredQty" = 0 WHERE "deliveredQty" IS NULL;

-- AlterTable
ALTER TABLE "OrderLine" ADD COLUMN     "cancelledQty" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "deliveredQty" SET NOT NULL,
ALTER COLUMN "deliveredQty" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "Delivery" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Receipt" ADD COLUMN     "clientActionId" TEXT,
ADD COLUMN     "requestHash" TEXT;

-- CreateTable
CREATE TABLE "DeliveryLine" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "orderLineId" TEXT NOT NULL,
    "loadedQty" INTEGER NOT NULL,
    "deliveredQty" INTEGER NOT NULL,
    "returnedQty" INTEGER NOT NULL,

    CONSTRAINT "DeliveryLine_pkey" PRIMARY KEY ("id")
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

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryLine_deliveryId_orderLineId_key" ON "DeliveryLine"("deliveryId", "orderLineId");

-- CreateIndex
CREATE UNIQUE INDEX "ReceiptLine_receiptId_orderLineId_key" ON "ReceiptLine"("receiptId", "orderLineId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_clientActionId_key" ON "Order"("clientActionId");

-- CreateIndex
CREATE INDEX "TripStop_orderId_idx" ON "TripStop"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_clientActionId_key" ON "Receipt"("clientActionId");

-- AddForeignKey
ALTER TABLE "DeliveryLine" ADD CONSTRAINT "DeliveryLine_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryLine" ADD CONSTRAINT "DeliveryLine_orderLineId_fkey" FOREIGN KEY ("orderLineId") REFERENCES "OrderLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptLine" ADD CONSTRAINT "ReceiptLine_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptLine" ADD CONSTRAINT "ReceiptLine_orderLineId_fkey" FOREIGN KEY ("orderLineId") REFERENCES "OrderLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
