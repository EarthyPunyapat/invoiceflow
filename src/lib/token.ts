import { randomBytes } from "crypto";

/**
 * Generate a URL-safe, unguessable share token for public invoice links.
 * 32 hex chars = 128 bits of entropy — not enumerable.
 */
export function generateShareToken(): string {
  return randomBytes(16).toString("hex");
}

/** Basic shape check for tokens received from URLs. */
export function isValidShareToken(token: string | null | undefined): boolean {
  return typeof token === "string" && /^[a-f0-9]{32}$/.test(token);
}
