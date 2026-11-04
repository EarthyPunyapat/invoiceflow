import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL } from "@/lib/legal";
import { PRO_PLAN } from "@/lib/plan";
import { SupportContact } from "../support-contact";

export const metadata: Metadata = { title: "Terms of service" };
// Read SUPPORT_EMAIL at request time, not at build time.
export const dynamic = "force-dynamic";

export default function TermsPage() {
  return (
    <article>
      <h1>Terms of service</h1>
      <p className="legal-effective">Effective {LEGAL.effective}</p>

      <p>
        These terms are the agreement between you and {LEGAL.operator} (“we”)
        for using InvoiceFlow. By signing in you accept them. Our{" "}
        <Link href="/privacy">privacy policy</Link> explains how we handle your
        information.
      </p>

      <h2>The service</h2>
      <p>
        InvoiceFlow lets you manage clients, create estimates and invoices,
        share and email invoices, accept online payments through your own
        Stripe account, send reminders and export your records. You sign in
        with a Google account and are responsible for keeping it secure.
      </p>

      <h2>Free trial and price</h2>
      <ul>
        <li>Every new account gets a 14-day free trial. No card is needed to start.</li>
        <li>After the trial, {PRO_PLAN.name} costs {PRO_PLAN.label}, billed monthly in advance through Stripe.</li>
        <li>Your subscription renews automatically each month until you cancel.</li>
        <li>You can cancel at any time in Settings. Cancellation takes effect at the end of the period you have paid for.</li>
        <li>We do not refund partial months, except where the law requires it.</li>
        <li>We will give you at least 30 days’ notice before changing the price.</li>
      </ul>
      <p>
        If you do not subscribe after the trial, you can still view, edit,
        export and download your existing records, and your clients can still
        pay invoices you have already sent. Creating and sending new invoices
        requires an active subscription.
      </p>

      <h2>Payments from your clients</h2>
      <p>
        When your clients pay an invoice online, the money goes directly to
        your own Stripe account. {LEGAL.operator} is not a party to those
        payments, and Stripe’s processing fees and terms apply to them.
      </p>

      <h2>Your responsibilities</h2>
      <ul>
        <li>You are responsible for the content of your invoices and estimates, including amounts, taxes and payment terms.</li>
        <li>You are responsible for your tax obligations and for using InvoiceFlow lawfully.</li>
        <li>Do not use InvoiceFlow for fraud, spam, or to send invoices for goods or services you did not provide.</li>
        <li>You are responsible for API keys you create and for anything done with them. Revoke a key in Settings if it may have been exposed.</li>
      </ul>

      <h2>Availability and liability</h2>
      <p>
        We work to keep InvoiceFlow available and your data safe, but the
        service is provided “as is”, without warranties of any kind. To the
        extent the law allows, our total liability to you is limited to the
        fees you paid us in the 12 months before the claim.
      </p>

      <h2>Ending the agreement</h2>
      <p>
        You can stop using InvoiceFlow and cancel your subscription at any
        time. We may suspend or close accounts that break these terms. Before
        you leave, you can export your clients and invoices as CSV files and
        download invoices as PDFs.
      </p>

      <h2>Law that applies</h2>
      <p>These terms are governed by the laws of {LEGAL.governingLaw}.</p>

      <h2>Changes and contact</h2>
      <p>
        If we change these terms, we will update the effective date above and,
        for significant changes, tell you in the app or by email. Questions are
        welcome <SupportContact />.
      </p>
    </article>
  );
}
