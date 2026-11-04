import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { startCheckout } from "@/lib/subscription";

/** Start an InvoiceFlow Pro checkout. Session-only: API keys cannot buy plans. */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await startCheckout(session.user.id);
    return "url" in result
      ? NextResponse.json(result)
      : NextResponse.json({ error: result.error }, { status: result.status });
  } catch (error) {
    console.error("[billing] checkout failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Could not start checkout. Try again in a moment." }, { status: 502 });
  }
}
