import type { Metadata } from "next";
import { LEGAL } from "@/lib/legal";
import { SupportContact } from "../support-contact";

export const metadata: Metadata = { title: "Privacy policy" };
// Read SUPPORT_EMAIL at request time, not at build time.
export const dynamic = "force-dynamic";

export default function PrivacyPage() {
  return (
    <article>
      <h1>Privacy policy</h1>
      <p className="legal-effective">Effective {LEGAL.effective}</p>

      <p>
        This policy explains what {LEGAL.operator} (“we”) collects when you use
        InvoiceFlow, why, who helps us run the service, and what you can ask us
        to do with your information.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>Your name, email address and profile picture from Google when you sign in.</li>
        <li>Your business profile: business name, address, logo, accent colour and invoice prefix.</li>
        <li>Your clients’ names, email addresses, companies and addresses that you enter.</li>
        <li>Invoices, estimates, line items, notes and payment status.</li>
        <li>API keys you create. We store only a one-way hash and a short prefix, never the key itself.</li>
        <li>Identifiers for your connected Stripe account and your InvoiceFlow subscription. We never see or store full card numbers.</li>
        <li>Server logs, such as request times and errors, used to keep the service working and secure.</li>
      </ul>

      <h2>Why we use it</h2>
      <ul>
        <li>To provide InvoiceFlow: storing your records, generating PDFs and public invoice links, and showing reports.</li>
        <li>To send invoices, reminders and payment confirmations when you ask us to.</li>
        <li>To bill your InvoiceFlow subscription.</li>
        <li>To keep the service secure, prevent abuse and fix problems.</li>
      </ul>
      <p>
        We do not sell your information. We do not use advertising or analytics
        trackers.
      </p>

      <h2>Who helps us run InvoiceFlow</h2>
      <p>These providers process information on our behalf, only to run the service:</p>
      <ul>
        <li>Vercel — hosting.</li>
        <li>Neon — database.</li>
        <li>Google — sign-in.</li>
        <li>Stripe — invoice payments and subscription billing.</li>
        <li>Resend — email delivery.</li>
      </ul>

      <h2>Your clients’ information</h2>
      <p>
        When you add a client, you decide what to enter and why. You are
        responsible for having a lawful reason to store their details and to
        send them invoices and reminders through InvoiceFlow.
      </p>

      <h2>How long we keep it</h2>
      <p>
        We keep your information while your account is open. If you ask us to
        delete your account, we delete your information within 30 days of
        verifying the request, except for records the law requires us to keep.
      </p>

      <h2>Your choices and rights</h2>
      <p>
        You can export your clients and invoices as CSV files and download any
        invoice as a PDF at any time. You can ask to see, correct or delete the
        personal information we hold about you by contacting us <SupportContact />.
      </p>

      <h2>Law that applies</h2>
      <p>
        We handle personal information in line with the {LEGAL.governingLaw}{" "}
        Privacy Act 2020.
      </p>

      <h2>Changes and contact</h2>
      <p>
        If we change this policy, we will update the effective date above and,
        for significant changes, tell you in the app or by email. Questions are
        welcome <SupportContact />.
      </p>
    </article>
  );
}
