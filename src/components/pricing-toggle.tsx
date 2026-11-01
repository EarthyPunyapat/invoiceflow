import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

const pilotFeatures = [
  "Client and estimate management",
  "Branded invoice pages and PDF downloads",
  "Public payment links with Stripe Checkout",
  "Invoice status and overdue tracking",
  "CSV exports for your records",
];

export function PilotAccessCard() {
  return (
    <div className="rounded-3xl border border-primary-200 dark:border-primary-800 bg-white dark:bg-[#1A1A1E] p-8 sm:p-10 shadow-xl shadow-primary-500/5">
      <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">Early access</h3>
      <p className="mt-3 text-gray-600 dark:text-gray-400">
        Explore the workflow with your first invoice. No subscription purchase is required to sign in.
      </p>
      <ul className="mt-8 space-y-3">
        {pilotFeatures.map(feature => (
          <li key={feature} className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary-600 dark:text-primary-400" />
            {feature}
          </li>
        ))}
      </ul>
      <Link href="/login" className="mt-8 flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-4 font-semibold text-white hover:bg-primary-700">
        Explore early access <ArrowRight className="h-5 w-5" />
      </Link>
      <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
        Stripe payment processing fees apply to online payments.
      </p>
    </div>
  );
}

export default PilotAccessCard;
