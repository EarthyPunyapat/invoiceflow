-- Machine credentials for autonomous agents. Additive: no existing table altered.
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ApiKey_prefix_key" ON "ApiKey"("prefix");
CREATE UNIQUE INDEX "ApiKey_hash_key" ON "ApiKey"("hash");
CREATE INDEX "ApiKey_userId_idx" ON "ApiKey"("userId");
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
