ALTER TABLE "Order" ADD COLUMN "clientActionId" TEXT;
CREATE UNIQUE INDEX "Order_clientActionId_key" ON "Order"("clientActionId");
CREATE TABLE "OperatingDay" (
  "date" DATE NOT NULL,
  "isOperating" BOOLEAN NOT NULL,
  CONSTRAINT "OperatingDay_pkey" PRIMARY KEY ("date")
);
CREATE TABLE "ReceiptItem" (
  "id" TEXT NOT NULL,
  "receiptId" TEXT NOT NULL,
  "orderLineId" TEXT NOT NULL,
  "result" TEXT NOT NULL,
  "receivedQty" INTEGER NOT NULL,
  CONSTRAINT "ReceiptItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ReceiptItem_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ReceiptItem_orderLineId_fkey" FOREIGN KEY ("orderLineId") REFERENCES "OrderLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ReceiptItem_receivedQty_check" CHECK ("receivedQty" >= 0),
  CONSTRAINT "ReceiptItem_result_check" CHECK ("result" IN ('OK', 'ISSUE'))
);
CREATE UNIQUE INDEX "ReceiptItem_receiptId_orderLineId_key" ON "ReceiptItem"("receiptId", "orderLineId");
CREATE TABLE "ReceiptEvidence" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "uploadedById" TEXT NOT NULL,
  "fileKey" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReceiptEvidence_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ReceiptEvidence_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ReceiptEvidence_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ReceiptEvidence_fileKey_key" ON "ReceiptEvidence"("fileKey");
