import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Settings, User, CreditCard, Zap, ExternalLink } from "lucide-react";
import { StripeConnectButton } from "./stripe-connect-button";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  // Check if user has connected Stripe + load their business profile
  const [stripeAccount, profile] = await Promise.all([
    prisma.stripeAccount.findUnique({
      where: { userId: session.user.id },
    }),
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

  const stripeConnected = stripeAccount?.stripeConnectOnboardingComplete ?? false;

  const settingsSections = [
    {
      title: "Notifications",
      description: "Configure email notifications and reminders",
      icon: Zap,
      href: "#",
      disabled: true,
    },
    {
      title: "Security",
      description: "Manage your password and security settings",
      icon: Settings,
      href: "#",
      disabled: true,
    },
  ];

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
        <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
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
                {session?.user?.name?.charAt(0) || session?.user?.email?.charAt(0) || "?"}
              </span>
            </div>
          )}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {session?.user?.name || "User"}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {session?.user?.email}
            </p>
          </div>
        </div>
      </div>

      {/* Business profile (branding shown on invoices & emails) */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
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
          <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20">
            <CreditCard className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Stripe Connect
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {stripeConnected
                ? "Your Stripe account is connected. You can accept payments directly."
                : "Connect your Stripe account to accept payments from clients."}
            </p>
            <div className="mt-4">
              {stripeConnected ? (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">
                    Connected
                  </span>
                </div>
              ) : (
                <StripeConnectButton />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Billing Section */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Plan & Billing
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              You are currently on the Free plan.
            </p>
            <div className="mt-3 flex items-center gap-3">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                Free Plan
              </span>
              <Link
                href="#"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
              >
                Upgrade to Pro
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Other settings sections */}
      <div className="space-y-2">
        {settingsSections.map((section) => (
          <div
            key={section.title}
            className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 ${
              section.disabled
                ? "opacity-60 cursor-not-allowed"
                : "hover:border-primary-300 dark:hover:border-primary-700 cursor-pointer"
            } transition-all`}
          >
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                <section.icon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {section.title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {section.description}
                </p>
              </div>
              {section.disabled && (
                <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
                  Coming soon
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
