BEGIN;
-- DropIndex
DROP INDEX "RecoveryDecision_retryStopId_key";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "pendingQuantities" JSONB;

-- AlterTable
ALTER TABLE "OrderLine" ADD COLUMN     "unitVolumeM3" DOUBLE PRECISION,
ADD COLUMN     "unitWeightKg" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "LoadingIssue" ADD COLUMN     "acknowledgedAt" TIMESTAMP(3),
ADD COLUMN     "acknowledgedById" TEXT,
ADD COLUMN     "cancelledQty" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "decidedAt" TIMESTAMP(3),
ADD COLUMN     "decidedById" TEXT,
ADD COLUMN     "decisionData" JSONB,
ADD COLUMN     "photoRefs" TEXT[],
ADD COLUMN     "reportedPlanVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "stopId" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "OrderDeferral" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fromDate" DATE,
    "toDate" DATE NOT NULL,
    "reason" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceStopId" TEXT,

    CONSTRAINT "OrderDeferral_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderDeferral_sourceStopId_key" ON "OrderDeferral"("sourceStopId");

-- CreateIndex
CREATE INDEX "OrderDeferral_orderId_recordedAt_idx" ON "OrderDeferral"("orderId", "recordedAt");

-- CreateIndex
CREATE INDEX "RecoveryDecision_retryStopId_idx" ON "RecoveryDecision"("retryStopId");

-- AddForeignKey
ALTER TABLE "OrderDeferral" ADD CONSTRAINT "OrderDeferral_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

UPDATE "LoadingIssue" SET "photoRefs" = ARRAY[]::TEXT[] WHERE "photoRefs" IS NULL;
UPDATE "LoadingIssue" i SET "stopId" = s."id"
FROM "LoadingRecord" r, "TripStop" s, "OrderLine" l
WHERE i."loadingRecordId" = r."id" AND s."tripId" = r."tripId" AND s."active" AND l."id" = i."orderLineId" AND s."orderId" = l."orderId";
-- Only single-line orders permit an exact factor backfill from aggregate totals.
UPDATE "OrderLine" l SET "unitWeightKg" = o."weightKg" / l."requestedQty", "unitVolumeM3" = o."volumeM3" / l."requestedQty"
FROM "Order" o WHERE o."id" = l."orderId" AND l."requestedQty" > 0
AND (SELECT count(*) FROM "OrderLine" all_lines WHERE all_lines."orderId" = o."id") = 1;
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_cancelled_balance" CHECK ("cancelledQty" >= 0 AND "cancelledQty" <= "requestedQty");
ALTER TABLE "LoadingIssue" ADD CONSTRAINT "LoadingIssue_cancelled_balance" CHECK ("cancelledQty" >= 0);
CREATE UNIQUE INDEX "LoadingIssue_one_unresolved_line" ON "LoadingIssue" ("loadingRecordId", "orderLineId") WHERE "status" <> 'RESOLVED';
COMMIT;
