import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { openBillingPortal } from "@/lib/subscription";

/** Open the Stripe billing portal for card, receipts and cancellation. Session-only. */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await openBillingPortal(session.user.id);
    return "url" in result
      ? NextResponse.json(result)
      : NextResponse.json({ error: result.error }, { status: result.status });
  } catch (error) {
    console.error("[billing] portal failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Could not open billing. Try again in a moment." }, { status: 502 });
  }
}
