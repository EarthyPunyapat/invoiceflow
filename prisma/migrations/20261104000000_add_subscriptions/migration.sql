-- InvoiceFlow Pro subscription state. Additive: no existing column altered.
ALTER TABLE "User" ADD COLUMN "trialEndsAt" TIMESTAMP(3),
  ADD COLUMN "stripeCustomerId" TEXT,
  ADD COLUMN "stripeSubscriptionId" TEXT,
  ADD COLUMN "subscriptionStatus" TEXT,
  ADD COLUMN "subscriptionPeriodEnd" TIMESTAMP(3),
  ADD COLUMN "subscriptionCancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "subscriptionCheckedAt" TIMESTAMP(3);
-- Accounts that exist at launch get a full trial from today (spec D2).
UPDATE "User" SET "trialEndsAt" = CURRENT_TIMESTAMP + INTERVAL '14 days';
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");
CREATE UNIQUE INDEX "User_stripeSubscriptionId_key" ON "User"("stripeSubscriptionId");
