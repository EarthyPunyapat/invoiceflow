"use client";

import { useState, useCallback } from "react";
import { Star } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Pricing data                                                        */
/* ------------------------------------------------------------------ */

export interface PricingTier {
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  annualSavingsLabel: string; // e.g. "Save 2 months" or "Save $30"
  annualSavingsAmount: number;
  isPopular?: boolean;
  isFree?: boolean;
  features: string[];
  missingFeatures?: string[];
  cta: string;
  href: string;
}

export const pricingTiers: PricingTier[] = [
  {
    name: "Pro",
    monthlyPrice: 19,
    annualPrice: 190,
    annualSavingsLabel: "Save 2 months",
    annualSavingsAmount: 38,
    isPopular: true,
    features: [
      "Unlimited invoices",
      "Auto-generate from Stripe",
      "Smart payment reminders",
      "Payment tracking dashboard",
      "Custom branding & logo",
      "Priority support",
    ],
    cta: "Start Getting Paid Faster",
    href: "/login",
  },
  {
    name: "Standard",
    monthlyPrice: 15,
    annualPrice: 150,
    annualSavingsLabel: "Save $30",
    annualSavingsAmount: 30,
    features: [
      "Up to 50 invoices/month",
      "Auto-generate from Stripe",
      "Smart payment reminders",
      "Email delivery",
    ],
    missingFeatures: [
      "Payment tracking dashboard",
      "Custom branding & logo",
      "Priority support",
      "Unlimited invoices",
    ],
    cta: "Choose Standard",
    href: "/login",
  },
  {
    name: "Lite",
    monthlyPrice: 0,
    annualPrice: 0,
    annualSavingsLabel: "",
    annualSavingsAmount: 0,
    isFree: true,
    features: [
      "Up to 5 invoices/month",
      "Basic invoice template",
      "Stripe connection",
      "Email delivery",
    ],
    cta: "Get Started Free",
    href: "/login",
  },
];

/* ------------------------------------------------------------------ */
/*  Toggle types                                                        */
/* ------------------------------------------------------------------ */

export type BillingPeriod = "monthly" | "annual";

export interface PricingToggleProps {
  /** The currently selected billing period. */
  period: BillingPeriod;
  /** Called when the user toggles the billing period. */
  onPeriodChange: (period: BillingPeriod) => void;
  /** Optional className override. */
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  AnimatedPrice — smoothly transitions between monthly/annual prices */
/* ------------------------------------------------------------------ */

function AnimatedPrice({
  period,
  tier,
}: {
  period: BillingPeriod;
  tier: PricingTier;
}) {
  const isMonthly = period === "monthly";
  const price = isMonthly ? tier.monthlyPrice : tier.annualPrice;
  const label = isMonthly ? "/month" : "/year";

  return (
    <div className="flex items-baseline justify-center gap-1">
      <span
        key={`${tier.name}-${period}-price`}
        className="animate-fade-up text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white"
      >
        ${price}
      </span>
      <span className="text-lg font-medium text-gray-500 dark:text-gray-400">
        {label}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PricingToggle — pill-shaped monthly/annual switch                 */
/* ------------------------------------------------------------------ */

export function PricingToggle({
  period,
  onPeriodChange,
  className = "",
}: PricingToggleProps) {
  const isAnnual = period === "annual";

  const handleToggle = useCallback(() => {
    onPeriodChange(isAnnual ? "monthly" : "annual");
  }, [isAnnual, onPeriodChange]);

  return (
    <div className={`flex justify-center ${className}`}>
      <div className="glass-panel relative inline-flex items-center rounded-full p-1">
        {/* ── Background slider that moves between sides ── */}
        <div
          className={`
            absolute top-1 h-[calc(100%-8px)] w-[calc(50%-4px)] rounded-full
            bg-primary-600 shadow-lg shadow-primary-500/30
            transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]
            ${isAnnual ? "translate-x-[calc(100%-0px)]" : "translate-x-0"}
          `}
          aria-hidden="true"
        />

        {/* ── Monthly button ── */}
        <button
          type="button"
          onClick={handleToggle}
          aria-pressed={!isAnnual}
          className={`
            relative z-10 rounded-full px-5 py-2 text-sm font-semibold
            transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]
            ${
              !isAnnual
                ? "text-white"
                : "text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            }
          `}
        >
          Monthly
        </button>

        {/* ── Annual button ── */}
        <div className="relative">
          <button
            type="button"
            onClick={handleToggle}
            aria-pressed={isAnnual}
            className={`
              relative z-10 rounded-full px-5 py-2 text-sm font-semibold
              transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]
              ${
                isAnnual
                  ? "text-white"
                  : "text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              }
            `}
          >
            Annual
          </button>

          {/* ── "Best value" badge on Annual side ── */}
          <div
            className={`
              absolute -top-3 -right-3 z-20 flex items-center gap-1
              rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold
              text-amber-900 shadow-sm
              transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]
              ${
                isAnnual
                  ? "opacity-100 scale-100 translate-y-0"
                  : "opacity-0 scale-75 translate-y-1 pointer-events-none"
              }
            `}
          >
            <Star className="h-2.5 w-2.5 fill-amber-900" />
            Best value
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PricingToggleCard — a single pricing card that responds to toggle */
/* ------------------------------------------------------------------ */

export interface PricingToggleCardProps {
  tier: PricingTier;
  period: BillingPeriod;
  className?: string;
}

export function PricingToggleCard({
  tier,
  period,
  className = "",
}: PricingToggleCardProps) {
  const isAnnual = period === "annual";

  return (
    <div
      className={`
        hover-lift relative rounded-3xl border bg-white dark:bg-[#1A1A1E] p-8 sm:p-10
        transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]
        ${
          tier.isPopular
            ? "border-primary-500/30 dark:border-primary-400/20 shadow-xl shadow-primary-500/5 scale-[1.02] lg:scale-105"
            : tier.isFree
              ? "border-gray-200 dark:border-gray-700"
              : "border-gray-200 dark:border-gray-700 opacity-80"
        }
        ${className}
      `}
    >
      {/* ── Popular / decoy badge ── */}
      {tier.isPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary-600 px-5 py-1 text-sm font-semibold text-white shadow-lg shadow-primary-500/25">
          Most Popular
        </div>
      )}
      {!tier.isPopular && !tier.isFree && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-gray-400 dark:bg-gray-600 px-4 py-1 text-xs font-semibold text-white">
          More expensive option
        </div>
      )}

      <div className="text-center">
        {/* ── Tier name ── */}
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          {tier.name}
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {tier.isFree
            ? "For trying it out"
            : tier.isPopular
              ? "For professionals who want to get paid"
              : "Still limited"}
        </p>

        {/* ── Animated price ── */}
        <div className="mt-4">
          <AnimatedPrice period={period} tier={tier} />
        </div>

        {/* ── Annual savings badge ── */}
        {isAnnual && !tier.isFree && (
          <div
            className="mt-2 inline-flex items-center gap-2 rounded-full bg-accent-50 dark:bg-accent-900/30 px-3 py-1 animate-fade-up"
          >
            <span className="text-sm font-semibold text-accent-700 dark:text-accent-300">
              ${tier.annualPrice}/year — {tier.annualSavingsLabel}
            </span>
          </div>
        )}

        {tier.isFree && (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Free forever
          </p>
        )}

        {/* ── Trial note for Pro ── */}
        {tier.isPopular && (
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            7-day free trial · Cancel anytime
          </p>
        )}

        {/* ── Decoy comparison text ── */}
        {!tier.isPopular && !tier.isFree && (
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Just $4 less than Pro but half the features
          </p>
        )}
      </div>

      {/* ── Feature list ── */}
      <ul className="mt-8 space-y-3">
        {tier.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3">
            <svg
              className={`mt-0.5 h-5 w-5 flex-shrink-0 ${
                tier.isPopular
                  ? "text-primary-600 dark:text-primary-400"
                  : "text-gray-400 dark:text-gray-500"
              }`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                clipRule="evenodd"
              />
            </svg>
            <span
              className={
                tier.isPopular
                  ? "text-gray-700 dark:text-gray-300"
                  : "text-gray-600 dark:text-gray-400"
              }
            >
              {feature}
            </span>
          </li>
        ))}
      </ul>

      {/* ── Missing features (decoy) ── */}
      {tier.missingFeatures && tier.missingFeatures.length > 0 && (
        <div className="mt-6 border-t border-gray-100 dark:border-gray-800 pt-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
            Not included
          </p>
          <ul className="space-y-2">
            {tier.missingFeatures.map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-3 text-gray-400 dark:text-gray-500 line-through decoration-gray-300 dark:decoration-gray-700"
              >
                <span className="text-sm">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── CTA ── */}
      <a
        href={tier.href}
        className={`
          mt-8 flex w-full items-center justify-center gap-2 rounded-xl
          px-6 py-4 text-base font-semibold
          transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]
          ${
            tier.isPopular
              ? "bg-primary-600 text-white hover:bg-primary-700 hover:shadow-lg hover:shadow-primary-500/25 hover:-translate-y-0.5"
              : tier.isFree
                ? "border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1A1A1E] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                : "border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1A1A1E] text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
          }
        `}
      >
        {tier.cta}
        {tier.isPopular && (
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </a>

      {/* ── Savings note for Pro ── */}
      {tier.isPopular && (
        <p className="mt-3 text-center text-xs text-gray-400 dark:text-gray-500">
          vs. $4,500/year doing it manually — that&apos;s a 95% savings
        </p>
      )}

      {/* ── No credit card for Lite ── */}
      {tier.isFree && (
        <p className="mt-6 text-xs text-gray-400 dark:text-gray-500 text-center">
          No credit card required
        </p>
      )}
    </div>
  );
}

export default PricingToggle;
