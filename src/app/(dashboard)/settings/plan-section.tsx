"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PlanState } from "@/lib/plan";

export type PlanSummary = {
  state: PlanState;
  trialDaysLeft: number;
  /** Dates are formatted on the server so hydration cannot disagree. */
  trialEnds: string;
  activeUntil: string | null;
  cancelsAtPeriodEnd: boolean;
};

type Props = {
  plan: PlanSummary;
  priceLabel: string;
  trialEndedMessage: string;
  paymentFailedMessage: string;
  billingReady: boolean;
  notice: "success" | "cancelled" | "portal" | null;
};

function days(n: number) {
  return n === 1 ? "1 day" : `${n} days`;
}

export function PlanSection({ plan, priceLabel, trialEndedMessage, paymentFailedMessage, billingReady, notice }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function go(endpoint: "/api/billing/checkout" | "/api/billing/portal") {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(endpoint, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error || "Something went wrong. Try again.");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      setLoading(false);
    }
  }

  const subscribe = { label: `Subscribe — ${priceLabel}`, endpoint: "/api/billing/checkout" as const };
  const content = {
    trial: {
      title: `Free trial — ${days(plan.trialDaysLeft)} left`,
      body: `Subscribe any time to keep creating and sending invoices after ${plan.trialEnds}.`,
      action: subscribe,
    },
    pro: {
      title: "InvoiceFlow Pro",
      body: plan.cancelsAtPeriodEnd
        ? `Ends on ${plan.activeUntil}. You won’t be charged again.`
        : `Renews on ${plan.activeUntil}.`,
      action: { label: "Manage billing", endpoint: "/api/billing/portal" as const },
    },
    past_due: {
      title: "Payment failed",
      body: paymentFailedMessage,
      action: { label: "Update card", endpoint: "/api/billing/portal" as const },
    },
    ended: { title: "Free trial ended", body: trialEndedMessage, action: subscribe },
  }[plan.state];

  return (
    <section id="plan" aria-labelledby="plan-heading" className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 id="plan-heading" className="text-xs font-medium text-gray-500">
        Plan
      </h2>
      {notice === "success" && plan.state === "pro" && (
        <p role="status" className="mt-3 rounded-md bg-primary-50 px-3 py-2 text-sm text-primary-700">
          Thanks — your subscription is active.
        </p>
      )}
      {notice === "cancelled" && (
        <p role="status" className="mt-3 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700">
          Checkout was cancelled. You have not been charged.
        </p>
      )}
      <p className="mt-3 text-lg font-semibold text-gray-900">{content.title}</p>
      <p className="mt-1 text-sm leading-relaxed text-gray-600">{content.body}</p>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button size="sm" disabled={loading || !billingReady} onClick={() => go(content.action.endpoint)}>
          {loading && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
          {content.action.label}
        </Button>
        {!billingReady && <span className="text-sm text-gray-500">Billing isn’t available yet.</span>}
      </div>
      <p className="mt-4 text-xs text-gray-500">
        See the <Link href="/terms" className="underline underline-offset-2">Terms</Link> and{" "}
        <Link href="/privacy" className="underline underline-offset-2">Privacy Policy</Link>.
      </p>
    </section>
  );
}
