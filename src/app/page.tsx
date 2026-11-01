import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Zap,
  Bell,
  Send,
  BarChart3,
  CreditCard,
  Download,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import dynamic from "next/dynamic";
import { Logo } from "@/components/logo";
import { PricingToggleSection } from "@/components/pricing-toggle-section";

const LiveSocialProofCounter = dynamic(
  () =>
    import("@/components/live-social-proof").then(
      (m) => m.LiveSocialProofCounter
    )
);
/* ------------------------------------------------------------------ */
/*  FAQ data                                                            */
/* ------------------------------------------------------------------ */
const faqs = [
  {
    q: "Do I need Stripe to create an invoice?",
    a: "You can create invoices, download PDFs, and track their status without connecting Stripe. To accept online payments, complete Stripe Connect onboarding in Settings.",
  },
  {
    q: "Can I customize my invoices?",
    a: "Add your business details, logo URL, accent color, invoice prefix, and notes. Your branding appears on the public invoice page and PDF.",
  },
  {
    q: "How do clients receive and pay an invoice?",
    a: "Send an invoice email or copy its public share link. Clients can view it without signing in and use Stripe Checkout when online payments are available for your business.",
  },
  {
    q: "What can I try during early access?",
    a: "Create clients and invoices, turn estimates into invoices, download PDFs, and review paid and overdue balances. Early access is a chance to see whether the workflow fits your business.",
  },
  {
    q: "Does InvoiceFlow handle card details?",
    a: "Online payments take place on Stripe Checkout. Clients enter their card details on Stripe's hosted payment page rather than on your public invoice page.",
  },
  {
    q: "Can I export my records?",
    a: "You can download invoices as PDFs and export invoice and client records as CSV files from your account.",
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
              Early access
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
              Explore early access
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
              Early access for freelancers
            </div>

            {/* ── PAIN-DRIVEN HEADLINE ── */}
            <h1 className="text-balance text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl lg:text-[56px] lg:leading-[1.05]">
              Stop chasing late payments.{" "}
              <span className="text-primary-600 dark:text-primary-400">
                Keep your invoicing in one place.
              </span>
            </h1>

            {/* ── AGITATE PAIN + OFFER RELIEF ── */}
            <p className="mt-6 text-balance text-lg leading-relaxed text-gray-600 dark:text-gray-400 sm:text-xl">
              Create branded invoices, share a payment link, and keep track of
              what&apos;s paid and overdue. InvoiceFlow brings your clients,
              estimates, and invoices into one clear workflow.
            </p>

            {/* ── CTAs ── */}
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/login"
                className="group hover-cta inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-8 py-4 text-base font-semibold text-white shadow-sm sm:w-auto"
              >
                Create your first invoice
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="#how-it-works" className="text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-primary-600">
                See how it works
              </Link>
            </div>
            <p className="mt-5 text-sm text-gray-400 dark:text-gray-500">
              Sign in with Google to explore the pilot
            </p>
          </div>

          {/* ── Audience ── */}
          <div className="mt-6 mx-auto max-w-lg flex justify-center">
            <LiveSocialProofCounter />
          </div>

          <div className="mt-10 mx-auto max-w-3xl">
            <div className="glass-panel-strong rounded-2xl border border-gray-100 dark:border-gray-800 bg-white/90 dark:bg-[#1A1A1E]/90 p-6 sm:p-8">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Built around the work you already do</h2>
              <p className="mt-2 text-gray-600 dark:text-gray-400">Keep client details, estimates, invoice PDFs, and payment status together.</p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-6 border-t border-gray-100 dark:border-gray-800 pt-5">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400"><Download className="h-4 w-4" /><span className="text-xs font-semibold">PDF invoices</span></div>
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400"><CreditCard className="h-4 w-4" /><span className="text-xs font-semibold">Stripe-hosted payments</span></div>
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400"><BarChart3 className="h-4 w-4" /><span className="text-xs font-semibold">Payment tracking</span></div>
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
              From invoice to payment
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
              A straightforward workflow for your freelance business
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
                Create your invoice
              </h3>
              <p className="mt-2 text-gray-600 dark:text-gray-400 leading-relaxed">
                Choose a client, add line items and tax, and set a due date.
                Turn an accepted estimate into an invoice when you are ready.
              </p>
              <div className="mt-6 flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>Keep your details together</span>
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
                Send a public invoice link
              </h3>
              <p className="mt-2 text-gray-600 dark:text-gray-400 leading-relaxed">
                Email your invoice or copy its share link. Your client can view
                your branded invoice without creating an account.
              </p>
              <div className="mt-6 flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>Easy to view and share</span>
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
                Track payments and follow up
              </h3>
              <p className="mt-2 text-gray-600 dark:text-gray-400 leading-relaxed">
                Offer Stripe Checkout to clients when your business is connected.
                Track outstanding invoices and use scheduled reminders to follow up.
              </p>
              <div className="mt-6 flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>See paid and overdue invoices</span>
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
                Create and reuse invoice details
              </h3>
              <p className="mt-2 text-base sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Send a public invoice link from your Stripe transactions in
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
                Scheduled reminders help you follow up on overdue invoices
                without writing every message from scratch.
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
                Share a clear invoice
              </h3>
              <p className="mt-2 text-base sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Send an email with a public invoice link, or download a PDF
                to share through your usual channels.
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
                Explore early access
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-400 dark:text-gray-500">
              PDF · 5-minute read · No email required
            </p>
          </div>
        </div>
      </section>

      {/* ─── Early access ─── */}
      <section id="pricing" className="py-24 sm:py-32 bg-white dark:bg-[#0A0A0B]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Explore InvoiceFlow during early access
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
              Try the invoicing workflow and see how it fits your business.
              Wider launch plans and pricing are still being shaped.
            </p>
          </div>
          <PricingToggleSection />
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

        </div>
      </section>

      {/* ─── Final CTA Section ─── */}
      <section className="bg-gray-900 dark:bg-[#0A0A0B] py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Keep your next invoice under control.
            </h2>
            <p className="mt-4 text-lg text-gray-400 dark:text-gray-500 leading-relaxed">
              Bring your clients, estimates, invoices, and payment status into
              one place. Start with your next project.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/login"
                className="group hover-cta-white inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold text-gray-900 shadow-sm"
              >
                Create your first invoice
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
            <p className="mt-6 text-sm text-gray-500">
              Early access for freelancers and independent businesses
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
                Early access
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

    </div>
  );
}
