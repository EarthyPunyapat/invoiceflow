-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RecurringFrequency" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "EstimateStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'CONVERTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "businessName" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "logoUrl" TEXT,
    "accentColor" TEXT,
    "invoicePrefix" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT,
    "phone" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "shareToken" TEXT,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "subtotal" DOUBLE PRECISION NOT NULL,
    "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "lastReminderSentAt" TIMESTAMP(3),
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripeAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeAccountId" TEXT NOT NULL,
    "stripeConnectOnboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringInvoice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "sourceInvoiceId" TEXT,
    "name" TEXT NOT NULL,
    "frequency" "RecurringFrequency" NOT NULL,
    "nextRunAt" TIMESTAMP(3) NOT NULL,
    "paused" BOOLEAN NOT NULL DEFAULT false,
    "endDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Estimate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "estimateNumber" TEXT NOT NULL,
    "status" "EstimateStatus" NOT NULL DEFAULT 'DRAFT',
    "issueDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "subtotal" DOUBLE PRECISION NOT NULL,
    "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Estimate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstimateItem" (
    "id" TEXT NOT NULL,
    "estimateId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstimateItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "Client_userId_idx" ON "Client"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_shareToken_key" ON "Invoice"("shareToken");

-- CreateIndex
CREATE INDEX "Invoice_userId_idx" ON "Invoice"("userId");

-- CreateIndex
CREATE INDEX "Invoice_clientId_idx" ON "Invoice"("clientId");

-- CreateIndex
CREATE INDEX "Invoice_status_dueDate_idx" ON "Invoice"("status", "dueDate");

-- CreateIndex
CREATE INDEX "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "StripeAccount_userId_key" ON "StripeAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StripeAccount_stripeAccountId_key" ON "StripeAccount"("stripeAccountId");

-- CreateIndex
CREATE INDEX "RecurringInvoice_userId_idx" ON "RecurringInvoice"("userId");

-- CreateIndex
CREATE INDEX "RecurringInvoice_sourceInvoiceId_idx" ON "RecurringInvoice"("sourceInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "Estimate_estimateNumber_key" ON "Estimate"("estimateNumber");

-- CreateIndex
CREATE INDEX "Estimate_userId_idx" ON "Estimate"("userId");

-- CreateIndex
CREATE INDEX "Estimate_clientId_idx" ON "Estimate"("clientId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StripeAccount" ADD CONSTRAINT "StripeAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringInvoice" ADD CONSTRAINT "RecurringInvoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringInvoice" ADD CONSTRAINT "RecurringInvoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateItem" ADD CONSTRAINT "EstimateItem_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

