-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "checkoutAttempt" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "checkoutSessionId" TEXT,
ADD COLUMN     "paymentNotifiedAt" TIMESTAMP(3),
ADD COLUMN     "invoiceEmailedAt" TIMESTAMP(3),
ADD COLUMN     "stripeInvoiceId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_checkoutSessionId_key" ON "Invoice"("checkoutSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_stripeInvoiceId_key" ON "Invoice"("stripeInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_userId_invoiceNumber_key" ON "Invoice"("userId", "invoiceNumber");

