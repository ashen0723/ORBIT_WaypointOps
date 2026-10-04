BEGIN;
-- AlterTable
ALTER TABLE "Outlet" ADD COLUMN     "scheduledWeekday" INTEGER;

-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "departedAt" TIMESTAMP(3),
ADD COLUMN     "departedPlanVersion" INTEGER;

-- AlterTable
ALTER TABLE "Delivery" ADD COLUMN     "capturedAt" TIMESTAMP(3),
ADD COLUMN     "recorded" JSONB;

-- CreateTable
CREATE TABLE "CatalogItem" (
    "id" TEXT NOT NULL,
    "brand" "Brand" NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "temp" "TempRequirement" NOT NULL,
    "unitWeightKg" DOUBLE PRECISION NOT NULL,
    "unitVolumeM3" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "tripId" TEXT,
    "mediaType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "bytes" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverIssue" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "stopId" TEXT,
    "userId" TEXT NOT NULL,
    "recorded" JSONB NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriverIssue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Evidence_orderId_idx" ON "Evidence"("orderId");

ALTER TABLE "Outlet" ADD CONSTRAINT "Outlet_scheduled_weekday" CHECK ("scheduledWeekday" BETWEEN 1 AND 6);
ALTER TABLE "CatalogItem" ADD CONSTRAINT "CatalogItem_load_factors" CHECK ("unitWeightKg" >= 0 AND "unitWeightKg" < 'Infinity'::float8 AND "unitVolumeM3" >= 0 AND "unitVolumeM3" < 'Infinity'::float8);
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_bytes_size" CHECK ("sizeBytes" > 0 AND "sizeBytes" <= 10485760 AND octet_length("bytes") = "sizeBytes");
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_image_type" CHECK ("mediaType" IN ('image/png','image/jpeg','image/webp'));
COMMIT;
