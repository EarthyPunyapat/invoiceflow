import Link from "next/link";
import { DocketBook } from "@/components/docket/docket-book";
import { SiteFooter, SiteHeader } from "@/components/docket/site-chrome";
import { docketFonts } from "@/components/docket/fonts";
import "./docket.css";

const questions = [
  {
    q: "How do I get started?",
    a: "Sign in with Google, add a client and create your first invoice. You can add a client while writing the invoice, so there’s no need to leave your draft.",
  },
  {
    q: "How do clients pay?",
    a: "Connect your Stripe account in Settings to accept online payments. Share the public invoice link or send it by email. Your client doesn’t need an InvoiceFlow account.",
  },
  {
    q: "Can I send a PDF instead?",
    a: "Yes. Every invoice can be downloaded as a PDF. You can also export your client and invoice records as CSV files.",
  },
  {
    q: "What does it cost?",
    a: "Every account starts with a 14-day free trial, no card needed. After that, InvoiceFlow Pro is US$9 a month and you can cancel at any time. Stripe’s own processing fees apply when you accept a payment. Your existing invoices stay available and payable even if you stop subscribing.",
  },
];

// The real path of an invoice, entered on the book's counterfoil.
const counterfoil = [
  {
    serial: "0015",
    step: "Write it",
    detail: "Client, line items and tax, under your own name, logo and invoice numbering. Turn an estimate into an invoice when the work is agreed.",
    mark: "Draft",
  },
  {
    serial: "0016",
    step: "Send it",
    detail: "Email it from InvoiceFlow or share one link. Your client opens a clear invoice and needs no account.",
    mark: "Sent",
  },
  {
    serial: "0017",
    step: "They pay by card",
    detail: "Pay now opens Stripe Checkout. The money goes straight to your own Stripe account and the invoice marks itself paid.",
    mark: "Paid",
  },
  {
    serial: "0018",
    step: "Late? It chases",
    detail: "Reminders go out on their own for sent and overdue invoices, firmer each time, until the invoice is paid.",
    mark: "Reminded",
  },
];

export default function HomePage() {
  return (
    <div className={`docket-site ${docketFonts}`}>
      <SiteHeader sections />
      <main>
        <section className="docket-hero" id="top">
          <div className="hero-copy">
            <h1>
              Do the work.
              <br />
              Tear. <span>Get paid.</span>
            </h1>
            <p className="hero-lede">
              Write the invoice, send it in one go, and your client pays by
              card from the link. InvoiceFlow chases the late ones for you.
            </p>
            <div className="hero-actions">
              <Link href="/login" className="stub-button">
                Start free — 14 days
              </Link>
              <p className="hero-price">Free for 14 days, then US$9/month.</p>
            </div>
            <a href="#how-it-works" className="hero-secondary">
              See how the money comes in
            </a>
          </div>
          <div className="hero-docket">
            <DocketBook />
          </div>
        </section>

        <section className="counterfoil-section" id="how-it-works" aria-labelledby="how-heading">
          <div className="section-intro">
            <h2 id="how-heading">How the money comes in.</h2>
            <p>
              Every invoice takes the same four steps. You do the first one.
              InvoiceFlow handles the rest and keeps the record.
            </p>
          </div>
          <ol className="counterfoil">
            {counterfoil.map((row) => (
              <li key={row.serial}>
                <span className="cf-serial">No. {row.serial}</span>
                <h3>{row.step}</h3>
                <p>{row.detail}</p>
                <span className={`cf-mark is-${row.mark.toLowerCase()}`}>{row.mark}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="carbon-section" aria-labelledby="carbon-heading">
          <div className="carbon-copy-stack" aria-hidden="true">
            <div className="filed-copy">
              <span className="fc-serial">No. 0012</span>
              <span className="fc-client">Linden Coffee</span>
              <span className="fc-amount">$860.00</span>
              <span className="fc-mark">Paid</span>
            </div>
            <div className="filed-copy">
              <span className="fc-serial">No. 0013</span>
              <span className="fc-client">Fieldwork Co.</span>
              <span className="fc-amount">NZ$2,400.00</span>
              <span className="fc-mark is-late">Overdue</span>
            </div>
            <div className="filed-copy">
              <span className="fc-serial">No. 0014</span>
              <span className="fc-client">Northstar Studio</span>
              <span className="fc-amount">$1,472.00</span>
              <span className="fc-mark">Sent</span>
            </div>
            <span className="filed-label">Example records</span>
          </div>
          <div className="carbon-copy-text">
            <h2 id="carbon-heading">Keep the carbon.</h2>
            <p>
              The pink copies used to live in a shoebox. Here every invoice and
              estimate stays filed, searchable and exportable.
            </p>
            <ul className="carbon-list">
              <li>What’s paid, what’s waiting and what’s overdue, at a glance</li>
              <li>Totals kept per currency, never blended into one</li>
              <li>Any invoice as a PDF, your records as CSV for your accountant</li>
              <li>Recurring work drafted for you on schedule</li>
            </ul>
          </div>
        </section>

        <section className="price-section" id="price" aria-labelledby="price-heading">
          <div className="price-slip">
            <div className="perforation" aria-hidden="true" />
            <h2 id="price-heading">
              14 days free,
              <br />
              then US$9 a month.
            </h2>
            <p className="price-sub">
              One plan with everything in it. No card to start, cancel any time.
            </p>
            <ul className="price-includes">
              <li>Clients, estimates and invoices</li>
              <li>Card payments into your own Stripe account</li>
              <li>Email delivery and share links</li>
              <li>Automatic reminders and recurring drafts</li>
              <li>PDF and CSV exports, reports per currency</li>
            </ul>
            <Link href="/login" className="stub-button">
              Start free — 14 days
            </Link>
            <p className="price-fine">
              Stripe’s processing fees apply to payments you receive. Invoices
              you’ve sent stay payable even if you stop subscribing.
            </p>
            <span className="stamp stamp-price" aria-hidden="true">
              No card needed
            </span>
          </div>
        </section>

        <section className="faq-section" id="questions" aria-labelledby="faq-heading">
          <h2 id="faq-heading">Before you start.</h2>
          <div className="faq-list">
            {questions.map((question) => (
              <details key={question.q}>
                <summary>{question.q}</summary>
                <p>{question.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="close-section" aria-labelledby="close-heading">
          <h2 id="close-heading">Back to the work.</h2>
          <p>Let the invoice book take care of itself.</p>
          <Link href="/login" className="stub-button">
            Start free — 14 days
          </Link>
        </section>
      </main>
      <SiteFooter>
        <a href="#top">Back to top</a>
      </SiteFooter>
    </div>
  );
}
