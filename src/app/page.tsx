import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Zap,
  Bell,
  Send,
  BarChart3,
  Shield,
  CreditCard,
  Users,
  Clock,
  Download,
  Star,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { InteractiveCostCalculator } from "@/components/interactive-cost-calculator";
import { VideoLightbox } from "@/components/video-lightbox";
import { LiveSocialProofCounter } from "@/components/live-social-proof";
import { ComparisonTable } from "@/components/comparison-table";
import { ExitIntentPopup } from "@/components/exit-intent-popup";
import { PricingToggleSection } from "@/components/pricing-toggle-section";

/* ------------------------------------------------------------------ */
/*  Inline test ID helper — strips out at build time                  */
/* ------------------------------------------------------------------ */
const tid = (id: string) => process.env.NODE_ENV === "test" ? id : undefined;

/* ------------------------------------------------------------------ */
/*  Testimonial data                                                   */
/* ------------------------------------------------------------------ */
const testimonials = [
  {
    initials: "AD",
    name: "Alex Durand",
    role: "Freelance Designer",
    quote:
      "I got paid 3× faster after switching. InvoiceFlow saved me 5 hours a week I used to spend chasing invoices. Best decision I made this year.",
    result: "Paid 3× faster",
  },
  {
    initials: "JK",
    name: "Jordan Kline",
    role: "Web Developer",
    quote:
      "I was spending every Sunday morning on invoices. Now it's all automated — I haven't manually sent an invoice in months. Best $19 I spend.",
    result: "Zero manual invoices",
  },
  {
    initials: "MR",
    name: "Maria Rivera",
    role: "Marketing Consultant",
    quote:
      "The smart reminders alone are worth it. My clients pay on time now and I never have to send an awkward 'hey, just checking in' email again.",
    result: "100% on-time payments",
  },
];

/* ------------------------------------------------------------------ */
/*  FAQ data                                                            */
/* ------------------------------------------------------------------ */
const faqs = [
  {
    q: "Do I need a Stripe account to use InvoiceFlow?",
    a: "Yes — InvoiceFlow is built on top of Stripe. You connect your existing Stripe account with one click via Stripe's secure OAuth. If you don't have a Stripe account yet, it's free to create one and takes about 5 minutes.",
  },
  {
    q: "Can I customize how my invoices look?",
    a: "Absolutely. Upload your logo, choose your brand colors, and customize the invoice template to match your business identity. You can also add custom notes, payment terms, and tax IDs.",
  },
  {
    q: "What happens if I cancel my subscription?",
    a: "You can cancel anytime. Your data stays in your Stripe account, and you'll maintain access to all past invoices. If you're on the annual plan, you'll keep access until the end of your billing period.",
  },
  {
    q: "Is my financial data safe?",
    a: "Security is our top priority. InvoiceFlow never stores your Stripe credentials — we use Stripe's official OAuth to read transactions. All data is encrypted in transit and at rest. We are PCI compliant and Stripe Verified.",
  },
  {
    q: "How quickly do invoices get generated after a Stripe payment?",
    a: "Invoices are generated in real-time — typically within 30 seconds of a successful Stripe payment. Your client receives an email automatically with the branded invoice attached.",
  },
  {
    q: "Do you offer refunds?",
    a: "Yes. If InvoiceFlow isn't the right fit, contact us within 14 days of your first payment and we'll refund you in full — no questions asked.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0A0A0B]">
      {/* ─── Global animation & transition styles ─── */}
      <style>{`
        /* Emil Kowalski principles: no ease-in, no transition:all, GPU-friendly */
        :root {
          --ease-out-custom: cubic-bezier(0.23, 1, 0.32, 1);
          --duration-fast: 150ms;
          --duration-ui: 200ms;
        }

        /* Hover effects gated behind pointer:fine */
        @media (hover: hover) and (pointer: fine) {
          .hover-lift {
            transition: transform var(--duration-ui) var(--ease-out-custom),
                        box-shadow var(--duration-ui) var(--ease-out-custom);
          }
          .hover-lift:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04);
          }

          .hover-border-glow {
            transition: border-color var(--duration-ui) var(--ease-out-custom),
                        box-shadow var(--duration-ui) var(--ease-out-custom);
          }
          .hover-border-glow:hover {
            border-color: rgba(79,70,229,0.20);
            box-shadow: 0 4px 20px rgba(79,70,229,0.06);
          }

          .hover-bg-shift {
            transition: background-color var(--duration-fast) var(--ease-out-custom);
          }
          .hover-bg-shift:hover {
            background-color: rgba(79,70,229,0.04);
          }

          .hover-cta {
            transition: background-color var(--duration-ui) var(--ease-out-custom),
                        box-shadow var(--duration-ui) var(--ease-out-custom),
                        transform var(--duration-ui) var(--ease-out-custom);
          }
          .hover-cta:hover {
            transform: translateY(-1px);
            box-shadow: 0 8px 25px rgba(79,70,229,0.25);
          }

          .hover-cta-white {
            transition: background-color var(--duration-ui) var(--ease-out-custom),
                        transform var(--duration-ui) var(--ease-out-custom),
                        box-shadow var(--duration-ui) var(--ease-out-custom);
          }
          .hover-cta-white:hover {
            transform: translateY(-1px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.10);
          }

          .nav-link {
            transition: color var(--duration-fast) var(--ease-out-custom);
          }
          .nav-link:hover {
            color: #4F46E5;
          }

          .hover-scale-teal {
            transition: transform var(--duration-ui) var(--ease-out-custom),
                        box-shadow var(--duration-ui) var(--ease-out-custom);
          }
          .hover-scale-teal:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 30px rgba(13,148,136,0.20);
          }
        }

        /* Staggered entry animations */
        @keyframes card-enter {
          from {
            opacity: 0;
            transform: translateY(16px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .stagger-card {
          animation: card-enter 500ms var(--ease-out-custom) both;
        }

        @keyframes fade-up {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-up {
          animation: fade-up 400ms var(--ease-out-custom) both;
        }

        /* Reduced motion: preserve opacity, remove movement */
        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }

          .stagger-card,
          .animate-fade-up {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }

          .hover-lift:hover,
          .hover-cta:hover,
          .hover-cta-white:hover,
          .hover-scale-teal:hover {
            transform: none !important;
          }
        }
      `}</style>

      {/* ─── Navbar — Glass panel ─── */}
      <header className="sticky top-0 z-50 border-b border-black/5 bg-white/72 backdrop-blur-xl dark:border-white/5 dark:bg-[#0A0A0B]/72">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Link href="/" aria-label="Home">
              <Logo size={36} />
            </Link>
          </div>
          <div className="hidden items-center gap-8 sm:flex">
            <Link
              href="#features"
              className="nav-link text-sm font-medium text-gray-600 dark:text-gray-400"
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="nav-link text-sm font-medium text-gray-600 dark:text-gray-400"
            >
              How It Works
            </Link>
            <Link
              href="#pricing"
              className="nav-link text-sm font-medium text-gray-600 dark:text-gray-400"
            >
              Pricing
            </Link>
            <Link
              href="#free-guide"
              className="nav-link text-sm font-medium text-accent-600 dark:text-accent-400"
            >
              Free Guide
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="nav-link hidden text-sm font-medium text-gray-600 dark:text-gray-400 sm:inline-flex"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="group hover-cta inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm"
            >
              Start Free Trial
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </nav>
      </header>

      {/* ─── Hero Section — Glass panel focus, pain-driven headline ─── */}
      <section className="relative overflow-hidden bg-gray-50 dark:bg-[#111114]">
        {/* Ambient background orbs */}
        <div className="absolute right-0 top-0 -z-0 h-[600px] w-[600px] translate-x-1/4 -translate-y-1/4 rounded-full bg-primary-100/40 dark:bg-primary-900/20" />
        <div className="absolute bottom-0 left-0 -z-0 h-64 w-64 translate-y-1/2 rounded-full bg-accent-100/30 dark:bg-accent-900/15" />
        <div className="absolute left-1/3 top-1/2 -z-0 h-48 w-48 -translate-y-1/2 rounded-full bg-primary-50/50 dark:bg-primary-900/10" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-20 pt-24 sm:px-6 sm:pb-28 sm:pt-32 lg:px-8 lg:pt-40">
          {/* Glass panel hero card */}
          <div className="glass-panel-strong mx-auto max-w-3xl p-8 sm:p-12 lg:p-16 text-center">
            {/* Beta badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary-200 dark:border-primary-800 bg-primary-50/80 dark:bg-primary-900/30 px-4 py-1.5 text-sm font-semibold text-primary-700 dark:text-primary-300">
              <Zap className="h-3.5 w-3.5" />
              Now in public beta
            </div>

            {/* ── PAIN-DRIVEN HEADLINE ── */}
            <h1 className="text-balance text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl lg:text-[56px] lg:leading-[1.05]">
              Stop chasing late payments.{" "}
              <span className="text-primary-600 dark:text-primary-400">
                Your invoices write themselves now.
              </span>
            </h1>

            {/* ── AGITATE PAIN + OFFER RELIEF ── */}
            <p className="mt-6 text-balance text-lg leading-relaxed text-gray-600 dark:text-gray-400 sm:text-xl">
              Every hour you spend on manual invoices is an hour you&apos;re not
              billing clients. InvoiceFlow auto-generates branded invoices from
              Stripe instantly — so you stop losing money to paperwork and start
              getting paid.
            </p>

            {/* ── LOSS AVERSION: interactive cost calculator ── */}
            <div className="mt-6 mx-auto max-w-lg">
              <InteractiveCostCalculator />
            </div>

            {/* ── CTAs ── */}
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/login"
                className="group hover-cta inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-8 py-4 text-base font-semibold text-white shadow-sm sm:w-auto"
              >
                Start Getting Paid Faster
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <VideoLightbox />
            </div>
            <p className="mt-5 text-sm text-gray-400 dark:text-gray-500">
              No credit card required · 7-day free trial · Cancel anytime
            </p>
          </div>

          {/* ── LIVE SOCIAL PROOF ROTATING COUNTER ── */}
          <div className="mt-6 mx-auto max-w-lg flex justify-center">
            <LiveSocialProofCounter />
          </div>

          {/* ── SOCIAL PROOF ABOVE THE FOLD ── */}
          <div className="mt-10 mx-auto max-w-3xl">
            <div className="glass-panel-strong rounded-2xl border border-gray-100 dark:border-gray-800 bg-white/90 dark:bg-[#1A1A1E]/90 p-6 sm:p-8">
              <div className="flex items-start gap-4">
                {/* Avatar placeholder */}
                <div className="flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 text-sm font-bold">
                  AD
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 mb-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className="h-4 w-4 fill-amber-400 text-amber-400"
                      />
                    ))}
                  </div>
                  <blockquote className="text-base text-gray-700 dark:text-gray-300 italic leading-relaxed">
                    &ldquo;I got paid 3× faster after switching. InvoiceFlow
                    saved me 5 hours a week. Best decision I made this
                    year.&rdquo;
                  </blockquote>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      Alex Durand
                    </span>
                    <span className="text-gray-300 dark:text-gray-600">·</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Freelance Designer
                    </span>
                  </div>
                </div>
              </div>
              {/* Trust badges */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-6 border-t border-gray-100 dark:border-gray-800 pt-5">
                <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
                  <Shield className="h-4 w-4" />
                  <span className="text-xs font-semibold">Stripe Verified</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
                  <CreditCard className="h-4 w-4" />
                  <span className="text-xs font-semibold">PCI Compliant</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
                  <Users className="h-4 w-4" />
                  <span className="text-xs font-semibold">2,000+ Users</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── How It Works — Glass panel cards, benefit-focused copy ─── */}
      <section id="how-it-works" className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Your invoices, on autopilot
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
              Three steps to never manually sending an invoice again
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Step 1 */}
            <div
              className="hover-border-glow stagger-card card card-hover relative rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1A1A1E] p-8"
              style={{ animationDelay: "0ms" }}
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
                <span className="text-lg font-bold">1</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Connect Stripe in one click
              </h3>
              <p className="mt-2 text-gray-600 dark:text-gray-400 leading-relaxed">
                Link your Stripe account securely — no copy-pasting API keys, no
                setup headaches. InvoiceFlow reads your transactions instantly.
              </p>
              <div className="mt-6 flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>Takes under 60 seconds</span>
              </div>
            </div>

            {/* Step 2 */}
            <div
              className="hover-border-glow stagger-card card card-hover relative rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1A1A1E] p-8"
              style={{ animationDelay: "60ms" }}
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
                <span className="text-lg font-bold">2</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Invoices appear automatically
              </h3>
              <p className="mt-2 text-gray-600 dark:text-gray-400 leading-relaxed">
                Every Stripe payment triggers a branded, numbered invoice. They
                appear in your dashboard. You never type another invoice again.
              </p>
              <div className="mt-6 flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>Zero manual work</span>
              </div>
            </div>

            {/* Step 3 */}
            <div
              className="hover-border-glow stagger-card card card-hover relative rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1A1A1E] p-8 sm:col-span-2 sm:mx-auto sm:max-w-md lg:col-span-1 lg:max-w-none"
              style={{ animationDelay: "120ms" }}
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
                <span className="text-lg font-bold">3</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Get paid without the awkwardness
              </h3>
              <p className="mt-2 text-gray-600 dark:text-gray-400 leading-relaxed">
                Smart reminders go out automatically for overdue invoices.
                Clients pay on time — and you never send another &ldquo;just
                checking in&rdquo; email.
              </p>
              <div className="mt-6 flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>Set and forget</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features Grid — Benefit-focused copy ─── */}
      <section id="features" className="bg-gray-50 dark:bg-[#111114] py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Everything you need to get paid
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
              Stop doing paperwork. Start doing what you&apos;re actually paid for.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Feature 1 */}
            <div
              className="hover-lift stagger-card card card-hover rounded-2xl bg-white dark:bg-[#1A1A1E] p-6 shadow-sm ring-1 ring-gray-100 dark:ring-gray-800"
              style={{ animationDelay: "0ms" }}
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
                <Zap className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Never type another invoice
              </h3>
              <p className="mt-2 text-base sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Invoices appear automatically from your Stripe transactions in
                real-time. Zero data entry, zero copy-pasting.
              </p>
            </div>

            {/* Feature 2 */}
            <div
              className="hover-lift stagger-card card card-hover rounded-2xl bg-white dark:bg-[#1A1A1E] p-6 shadow-sm ring-1 ring-gray-100 dark:ring-gray-800"
              style={{ animationDelay: "50ms" }}
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
                <Bell className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Get paid without awkward follow-ups
              </h3>
              <p className="mt-2 text-base sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Friendly payment reminders go out automatically at the right
                time. No more &ldquo;hey, just checking in&rdquo; emails.
              </p>
            </div>

            {/* Feature 3 */}
            <div
              className="hover-lift stagger-card card card-hover rounded-2xl bg-white dark:bg-[#1A1A1E] p-6 shadow-sm ring-1 ring-gray-100 dark:ring-gray-800"
              style={{ animationDelay: "100ms" }}
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
                <Send className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Deliver invoices instantly
              </h3>
              <p className="mt-2 text-base sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Professional, branded invoices land in your client&apos;s inbox
                the moment a payment processes. One-click resend if needed.
              </p>
            </div>

            {/* Feature 4 */}
            <div
              className="hover-lift stagger-card card card-hover rounded-2xl bg-white dark:bg-[#1A1A1E] p-6 shadow-sm ring-1 ring-gray-100 dark:ring-gray-800"
              style={{ animationDelay: "150ms" }}
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
                <BarChart3 className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                See exactly who owes you what
              </h3>
              <p className="mt-2 text-base sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Paid, pending, overdue — all in one dashboard. Know your cash
                position at a glance without spreadsheets.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Reciprocity: Free Guide Section ─── */}
      <section
        id="free-guide"
        className="py-24 sm:py-32 bg-white dark:bg-[#0A0A0B]"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent-200 dark:border-accent-800 bg-accent-50/80 dark:bg-accent-900/30 px-4 py-1.5 text-sm font-semibold text-accent-700 dark:text-accent-300">
              <Download className="h-3.5 w-3.5" />
              Free resource
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Free Guide: 5 Ways to Get Paid Faster
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
              No signup required. Just actionable tips to improve your invoicing
              workflow today — even if you never use InvoiceFlow.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <a
                href="/guides/5-ways-get-paid-faster.pdf"
                className="hover-cta inline-flex items-center gap-2 rounded-xl bg-accent-600 px-8 py-4 text-base font-semibold text-white shadow-sm"
              >
                <Download className="h-5 w-5" />
                Download Free Guide
              </a>
              <Link
                href="/login"
                className="group hover-bg-shift inline-flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1A1A1E] px-8 py-4 text-base font-semibold text-gray-700 dark:text-gray-300"
              >
                Start Free Trial
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-400 dark:text-gray-500">
              PDF · 5-minute read · No email required
            </p>
          </div>
        </div>
      </section>

      {/* ─── Testimonials Section ─── */}
      <section className="bg-gray-50 dark:bg-[#111114] py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Trusted by 2,000+ freelancers
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
              Real results from real users who stopped chasing invoices
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t, i) => (
              <div
                key={t.name}
                className="hover-lift stagger-card rounded-2xl bg-white dark:bg-[#1A1A1E] p-6 sm:p-8 shadow-sm ring-1 ring-gray-100 dark:ring-gray-800"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {/* Stars */}
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, si) => (
                    <Star
                      key={si}
                      className="h-4 w-4 fill-amber-400 text-amber-400"
                    />
                  ))}
                </div>

                <blockquote className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>

                {/* Result highlight */}
                <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-accent-50 dark:bg-accent-900/30 px-3 py-1 text-xs font-semibold text-accent-700 dark:text-accent-300">
                  <CheckCircle2 className="h-3 w-3" />
                  {t.result}
                </div>

                {/* Author */}
                <div className="mt-5 flex items-center gap-3 border-t border-gray-100 dark:border-gray-800 pt-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/40 text-sm font-bold text-primary-700 dark:text-primary-300">
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {t.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t.role}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing — Toggle + Cards with Decoy Effect ─── */}
      <section id="pricing" className="py-24 sm:py-32 bg-white dark:bg-[#0A0A0B]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            {/* Urgency badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/20 px-4 py-1.5 text-sm font-semibold text-amber-700 dark:text-amber-300">
              <Clock className="h-3.5 w-3.5" />
              Early adopter pricing — lock in $19/mo forever
            </div>

            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Reclaim your time for less than a coffee a day
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
              Manual invoicing costs you $4,500/year in lost billable time.
              InvoiceFlow costs $228.
            </p>
          </div>

          {/* ── Monthly/Annual toggle ── */}
          <PricingToggleSection />

          {/* Trust reassurance */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-8">
            <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
              <Shield className="h-4 w-4" />
              <span className="text-xs font-semibold">14-day money-back guarantee</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
              <CreditCard className="h-4 w-4" />
              <span className="text-xs font-semibold">Secure Stripe checkout</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Comparison Table ── InvoiceFlow vs Manual vs FreshBooks */}
      <section className="py-24 sm:py-32 bg-white dark:bg-[#0A0A0B]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Why InvoiceFlow wins
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
              Compared to the alternatives, InvoiceFlow is faster, cheaper, and works on autopilot
            </p>
          </div>
          <div className="mt-16 mx-auto max-w-4xl">
            <ComparisonTable />
          </div>
        </div>
      </section>

      {/* ─── FAQ Section ─── */}
      <section className="py-24 sm:py-32 bg-gray-50 dark:bg-[#111114]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Got questions? We&apos;ve got answers.
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
              Everything you need to know before you start
            </p>
          </div>

          <div className="mt-16 mx-auto max-w-3xl divide-y divide-gray-200 dark:divide-gray-800">
            {faqs.map((faq, i) => (
              <details
                key={i}
                className="group py-5"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-4 text-left py-3 min-h-[44px]">
                  <span className="text-base font-semibold text-gray-900 dark:text-white">
                    {faq.q}
                  </span>
                  <span className="flex-shrink-0 text-gray-400 dark:text-gray-500 group-open:hidden">
                    <ChevronDown className="h-5 w-5" />
                  </span>
                  <span className="flex-shrink-0 text-gray-400 dark:text-gray-500 hidden group-open:block">
                    <ChevronUp className="h-5 w-5" />
                  </span>
                </summary>
                <p className="mt-3 text-base text-gray-600 dark:text-gray-400 leading-relaxed pr-8">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Still have questions?{" "}
              <a
                href="mailto:support@invoiceflow.com"
                className="font-medium text-primary-600 dark:text-primary-400 hover:underline"
              >
                Email our support team
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* ─── Final CTA Section ─── */}
      <section className="bg-gray-900 dark:bg-[#0A0A0B] py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Reclaim your Sundays. Start getting paid faster.
            </h2>
            <p className="mt-4 text-lg text-gray-400 dark:text-gray-500 leading-relaxed">
              Join 2,000+ freelancers and small businesses who stopped chasing
              invoices and started focusing on what they do best.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/login"
                className="group hover-cta-white inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold text-gray-900 shadow-sm"
              >
                Start Getting Paid Faster
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <VideoLightbox
                triggerClassName="inline-flex items-center gap-2 rounded-xl border border-white/20 px-8 py-4 text-base font-semibold text-white hover:bg-white/10 transition-colors"
                triggerLabel="See it in 60 seconds"
              />
            </div>
            <p className="mt-6 text-sm text-gray-500">
              No credit card required · Free 7-day trial · Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-[#0A0A0B] py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2">
              <Link href="/" aria-label="Home">
                <Logo size={32} />
              </Link>
            </div>
            <div className="flex items-center gap-8">
              <Link
                href="#features"
                className="nav-link text-sm text-gray-500 dark:text-gray-400"
              >
                Features
              </Link>
              <Link
                href="#pricing"
                className="nav-link text-sm text-gray-500 dark:text-gray-400"
              >
                Pricing
              </Link>
              <Link
                href="#free-guide"
                className="nav-link text-sm text-gray-500 dark:text-gray-400"
              >
                Free Guide
              </Link>
              <Link
                href="/login"
                className="nav-link text-sm text-gray-500 dark:text-gray-400"
              >
                Sign in
              </Link>
            </div>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              &copy; {new Date().getFullYear()} InvoiceFlow. All rights
              reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* ── Exit-intent popup (desktop only, once per session) ── */}
      <ExitIntentPopup />
    </div>
  );
}
