import { NextResponse } from "next/server";
import { getEntitlement } from "@/lib/subscription";

export const TRIAL_ENDED_MESSAGE =
  "Your free trial has ended. Subscribe in Settings to create and send invoices. Existing invoices stay available and can still be paid.";
export const PAYMENT_FAILED_MESSAGE =
  "Your last subscription payment failed. Update your card in Settings to keep creating and sending invoices.";

/**
 * Gate for creating invoices/estimates, converting estimates and sending
 * invoices (spec D3). Returns a 402 response to send back, or null to proceed.
 * Reading, editing, exporting and clients' payments are never gated.
 */
export async function requireActivePlan(userId: string): Promise<NextResponse | null> {
  const plan = await getEntitlement(userId);
  if (plan.canCreate) return null;
  return plan.state === "past_due"
    ? NextResponse.json({ error: PAYMENT_FAILED_MESSAGE, code: "payment_failed" }, { status: 402 })
    : NextResponse.json({ error: TRIAL_ENDED_MESSAGE, code: "subscription_required" }, { status: 402 });
}
