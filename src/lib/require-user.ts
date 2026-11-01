import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { bearerFrom, userIdForApiKey } from "@/lib/api-key";

/**
 * Dual-channel authentication: browser session OR agent API key.
 *
 * Existing routes call `auth()` and would reject an agent outright. This helper
 * keeps session behaviour byte-for-byte identical (so nothing about the current
 * product changes) and additionally accepts `Authorization: Bearer ifk_...`.
 *
 * Returns the userId, or null if unauthenticated. Never throws on bad
 * credentials — an exception would leak the difference between "no key" and
 * "wrong key" through timing and error shape.
 */
export async function requireUser(req: NextRequest): Promise<string | null> {
  // Prefer an explicit bearer key when present so an agent is never rate-limited
  // or redirected by session machinery it cannot participate in.
  const token = bearerFrom(req.headers.get("authorization"));
  if (token) return userIdForApiKey(token);

  try {
    const session = await auth();
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}
