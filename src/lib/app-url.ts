/** A configured origin, never an untrusted request Origin header. */
export function appUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;
  if (!configured && process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_APP_URL must be configured");
  }
  const url = new URL(configured || "http://localhost:3000");
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Invalid app URL");
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("Production app URL must use HTTPS");
  }
  return url.origin;
}
