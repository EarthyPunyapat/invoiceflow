import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

/**
 * Machine credentials for autonomous agents.
 *
 * An agent cannot hold a browser session, so every session-gated route is
 * unreachable to it. This module lets an agent present a bearer key instead.
 *
 * Storage rules:
 *  - The plaintext key is returned exactly once, at creation, and never stored.
 *  - Only a SHA-256 hash is persisted, so a database leak does not leak keys.
 *  - The stored `prefix` is a non-secret 12-char public label used to locate the
 *    candidate row without a full-table scan.
 */

export const API_KEY_PREFIX = "ifk_";
const KEY_BYTES = 32; // 256 bits of entropy -> 64 hex chars

export function hashApiKey(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

/** Shape check only. Never used to authorize; the hash lookup authorizes. */
export function looksLikeApiKey(value: string): boolean {
  return (
    typeof value === "string" &&
    value.startsWith(API_KEY_PREFIX) &&
    value.length > API_KEY_PREFIX.length + 16 &&
    /^[A-Za-z0-9_-]+$/.test(value.slice(API_KEY_PREFIX.length))
  );
}

export function publicPrefix(raw: string): string {
  return raw.slice(0, API_KEY_PREFIX.length + 8);
}

export type CreatedApiKey = {
  id: string;
  name: string;
  prefix: string;
  /** Shown once. Not recoverable. */
  key: string;
  createdAt: Date;
};

export async function createApiKey(
  userId: string,
  name: string
): Promise<CreatedApiKey> {
  const raw = API_KEY_PREFIX + randomBytes(KEY_BYTES).toString("hex");
  const row = await prisma.apiKey.create({
    data: {
      userId,
      name: name.trim().slice(0, 64) || "agent",
      prefix: publicPrefix(raw),
      hash: hashApiKey(raw),
    },
    select: { id: true, name: true, prefix: true, createdAt: true },
  });
  return { ...row, key: raw };
}

export async function listApiKeys(userId: string) {
  return prisma.apiKey.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      prefix: true,
      lastUsedAt: true,
      revokedAt: true,
      createdAt: true,
    },
  });
}

export async function revokeApiKey(userId: string, id: string) {
  // Scope by userId so one tenant can never revoke another tenant's key.
  const { count } = await prisma.apiKey.updateMany({
    where: { id, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return count > 0;
}

/**
 * Resolve a bearer key to a userId. Returns null for unknown, revoked, or
 * malformed keys — callers must treat null as unauthenticated, never as an
 * error that reveals whether a key exists.
 */
export async function userIdForApiKey(raw: string): Promise<string | null> {
  if (!looksLikeApiKey(raw)) return null;
  const hash = hashApiKey(raw);
  const row = await prisma.apiKey.findUnique({
    where: { hash },
    select: { id: true, userId: true, hash: true, revokedAt: true },
  });
  if (!row || row.revokedAt) return null;

  // Defense in depth: constant-time confirm the hash we matched is the one we
  // computed (guards against future index/matching changes).
  const a = Buffer.from(row.hash, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  // Best-effort usage stamp; never block or fail the request on it.
  prisma.apiKey
    .update({ where: { id: row.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return row.userId;
}

/** Extract a bearer token from an Authorization header. */
export function bearerFrom(header: string | null): string | null {
  if (!header) return null;
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  return m ? m[1].trim() : null;
}
