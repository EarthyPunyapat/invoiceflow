import { getPaymentReadiness } from "@/lib/stripe-account";
import { emailConfigured } from "@/lib/integration-config";
import { RefreshIntegrations } from "./refresh-integrations";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CreditCard } from "lucide-react";
import { ApiKeysManager } from "@/components/api-keys-manager";
import { StripeConnectButton } from "./stripe-connect-button";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  // Check if user has connected Stripe + load their business profile
  const [payment, profile] = await Promise.all([
    getPaymentReadiness(session.user.id),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        businessName: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        postalCode: true,
        country: true,
        logoUrl: true,
        accentColor: true,
        invoicePrefix: true,
      },
    }),
  ]);

  const stripeConnected = payment.state === "ready";
  const emailReady = emailConfigured();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Settings
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      {/* User info card */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400  mb-4">
          Profile
        </h2>
        <div className="flex items-center gap-4">
          {session?.user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element -- Google avatar: external URL, next/image needs remotePatterns config
            <img
              src={session.user.image}
              alt=""
              className="w-14 h-14 rounded-full"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
              <span className="text-xl font-bold text-primary-700 dark:text-primary-300">
                {session?.user?.name?.charAt(0) ||
                  session?.user?.email?.charAt(0) ||
                  "?"}
              </span>
            </div>
          )}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {session?.user?.name || "User"}
            </h2>
            <p className="break-all text-sm text-gray-500 dark:text-gray-400">
              {session?.user?.email}
            </p>
          </div>
        </div>
      </div>

      {/* Business profile (branding shown on invoices & emails) */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400  mb-1">
          Business profile
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          Branding shown on your invoices, share links and reminder emails.
        </p>
        <ProfileForm
          profile={
            profile ?? {
              businessName: null,
              addressLine1: null,
              addressLine2: null,
              city: null,
              state: null,
              postalCode: null,
              country: null,
              logoUrl: null,
              accentColor: null,
              invoicePrefix: null,
            }
          }
        />
      </div>

      {/* Stripe Connect Section */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-lg bg-primary-50">
            <CreditCard className="w-5 h-5 text-primary-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Stripe Connect
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {payment.message}
            </p>
            {payment.country && (
              <p className="mt-2 text-xs text-gray-500">
                Stripe account country: {payment.country}
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {stripeConnected ? (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">
                    Connected
                  </span>
                </div>
              ) : payment.state === "not_configured" ? (
                <details className="text-sm">
                  <summary className="font-medium underline">
                    Deployment setup
                  </summary>
                  <p className="mt-2 text-gray-600">
                    Configure STRIPE_SECRET_KEY in the Vercel production
                    environment and redeploy. Then connect your account here.
                  </p>
                </details>
              ) : (
                <StripeConnectButton
                  label={
                    payment.state === "not_connected"
                      ? "Connect Stripe Account"
                      : "Continue Stripe setup"
                  }
                />
              )}
              {!["not_configured", "not_connected"].includes(payment.state) && (
                <RefreshIntegrations />
              )}
            </div>
          </div>
        </div>
      </div>

      <section
        className="rounded-xl border border-gray-200 p-6"
        aria-label="Invoice email settings"
      >
        <h2 className="text-sm font-semibold">Invoice email</h2>
        <p className="mt-2 text-sm text-gray-600">
          {emailReady
            ? "Email sending is configured. Send an invoice to confirm that the provider accepts it; acceptance does not guarantee inbox delivery."
            : "Email delivery is not configured for this deployment. A verified sending address is required before invoices can be emailed."}
        </p>
        <details className="mt-3 text-sm">
          <summary className="font-medium underline">Deployment setup</summary>
          <p className="mt-2 text-gray-600">
            Configure RESEND_API_KEY and RESEND_FROM_EMAIL in the Vercel
            production environment, use a sender on a verified Resend domain,
            and redeploy. The Resend testing sender can only email its authorized
            test recipient.
          </p>
        </details>
      </section>
      <ApiKeysManager />
      <section className="rounded-xl bg-gray-50 p-6">
        <h2 className="text-sm font-semibold">Early access</h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          InvoiceFlow is free to use during early access. Subscription billing
          is not available yet. Payments you collect through Stripe are separate
          from your access to InvoiceFlow.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">
          Your Google account manages your sign-in credentials and account
          security.
        </p>
      </section>
    </div>
  );
}
