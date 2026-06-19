"use client";

import { useState } from "react";
import { Zap } from "lucide-react";
import {
  PricingToggle,
  PricingToggleCard,
  pricingTiers,
  type BillingPeriod,
} from "@/components/pricing-toggle";

export function PricingToggleSection() {
  const [period, setPeriod] = useState<BillingPeriod>("monthly");

  return (
    <>
      <PricingToggle period={period} onPeriodChange={setPeriod} className="mt-10" />

      <div className="mt-10 grid gap-8 lg:grid-cols-3 max-w-5xl mx-auto items-start">
        {pricingTiers.map((tier) => (
          <PricingToggleCard key={tier.name} tier={tier} period={period} />
        ))}
      </div>

      {/* Asymmetric dominance visual cue */}
      <div className="mt-6 text-center">
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-gray-50 dark:bg-[#1A1A1E] px-5 py-3 border border-gray-100 dark:border-gray-800">
          <Zap className="h-4 w-4 text-amber-500 shrink-0" />
          <p className="text-sm text-gray-600 dark:text-gray-400 text-balance">
            <strong className="text-gray-900 dark:text-white">Pro tip:</strong> For just{" "}
            <strong className="text-primary-600 dark:text-primary-400">$4 more</strong> than Standard,{" "}
            <strong className="text-gray-900 dark:text-white">Pro</strong> gives you unlimited invoices,
            custom branding, and priority support. It&apos;s the clear winner.
          </p>
        </div>
      </div>
    </>
  );
}
