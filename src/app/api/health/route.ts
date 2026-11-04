import { NextRequest, NextResponse } from "next/server";
import { runHealthChecks } from "@/lib/health";
import { take } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Public launch readiness: named booleans only, never configured values. */
export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!take(`health:${ip}`, 30, 60_000).allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  return NextResponse.json(await runHealthChecks(), { headers: { "Cache-Control": "no-store" } });
}
