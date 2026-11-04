import Link from "next/link";
import { getEntitlement } from "@/lib/subscription";

/** Workspace notice when the trial is nearly over, has ended, or a payment failed. */
export async function PlanBanner({ userId }: { userId: string }) {
  let plan;
  try {
    plan = await getEntitlement(userId);
  } catch (error) {
    // Never take the workspace down over a notice.
    console.error("[plan-banner]", error instanceof Error ? error.message : error);
    return null;
  }
  let message: string;
  let action = "Subscribe";
  if (plan.state === "ended") {
    message = "Your free trial has ended. Subscribe to create and send invoices.";
  } else if (plan.state === "past_due") {
    message = "Your last subscription payment failed.";
    action = "Update card";
  } else if (plan.state === "trial" && plan.trialDaysLeft <= 3) {
    const days = plan.trialDaysLeft === 1 ? "1 day" : `${plan.trialDaysLeft} days`;
    message = `Your free trial ends in ${days}. Subscribe to keep creating invoices.`;
  } else {
    return null;
  }
  return (
    <div role="status" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <span>{message}</span>
      <Link href="/settings#plan" className="font-medium underline underline-offset-2">
        {action}
      </Link>
    </div>
  );
}
