import Link from "next/link";
import { Logo } from "@/components/logo";
import { InvoiceDemo } from "@/components/marketing/invoice-demo";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Check, Plus, FileText, ArrowUpRight } from "lucide-react";
import "./marketing.css";
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
    q: "Is this a paid subscription?",
    a: "InvoiceFlow is currently in early access. There is no subscription checkout or plan billing. Stripe’s own processing fees apply when you accept a payment.",
  },
];
export default function HomePage() {
  return (
    <div className="marketing">
      <header className="marketing-header">
        <Link href="/" aria-label="InvoiceFlow home">
          <Logo size={34} />
        </Link>
        <nav aria-label="Main navigation">
          <a href="#product">The product</a>
          <a href="#workflow">How it works</a>
          <a href="#questions">Questions</a>
        </nav>
        <Link href="/login" className="marketing-signin">
          Sign in <ArrowUpRight size={15} />
        </Link>
      </header>
      <main>
        <section className="marketing-hero" id="product">
          <div className="hero-introduction">
            <h1>
              Good work.
              <br />
              Paid for.
            </h1>
            <div className="hero-copy">
              <p>
                Invoices, estimates and payments for the work you do. One clear
                place to send an invoice and see where it stands.
              </p>
              <Link className="marketing-primary" href="/login">
                Create your first invoice <Plus size={17} />
              </Link>
              <span>For independent people and small teams.</span>
            </div>
          </div>
          <InvoiceDemo />
        </section>
        <section className="marketing-workflow" id="workflow">
          <div>
            <h2>
              A clear path
              <br />
              to getting paid.
            </h2>
            <p>
              Less time keeping track.
              <br />
              More time for the work itself.
            </p>
          </div>
          <div className="workflow-list">
            <article>
              <h3>Start with the details.</h3>
              <p>
                Keep your clients, line items and tax together. Turn an estimate
                into an invoice when the work is ready.
              </p>
              <span>Clients · Estimates · Invoices</span>
            </article>
            <article>
              <h3>Send something clear.</h3>
              <p>
                Your branding, your payment terms, one public link. Email it to
                your client or download a PDF.
              </p>
              <span>Public links · PDF export · Email</span>
            </article>
            <article>
              <h3>Know where it stands.</h3>
              <p>
                See what’s paid, what’s waiting and what needs a follow-up. Keep
                each currency’s totals separate.
              </p>
              <span>Payment tracking · Reminders · Reports</span>
            </article>
          </div>
        </section>
        <section className="marketing-records">
          <div className="records-copy">
            <h2>
              Your books.
              <br />A little lighter.
            </h2>
            <p>
              A proper record of your work, without another spreadsheet to
              reconcile by hand.
            </p>
            <ul>
              <li>
                <Check size={17} /> Invoice numbers and totals, handled
              </li>
              <li>
                <Check size={17} /> Clients and estimates in the same place
              </li>
              <li>
                <Check size={17} /> A clear view of what’s still owed
              </li>
            </ul>
            <Link href="/login" className="marketing-text-link">
              Open your workspace <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="records-preview" data-ui>
            <div className="records-preview-title">
              <div>
                <h3>Invoices</h3>
                <p>Example workspace</p>
              </div>
              <FileText size={21} />
            </div>
            <div className="records-row">
              <div>
                <strong>INV-2026-012</strong>
                <span>Northstar Studio</span>
              </div>
              <span className="sample-state sample-paid">Paid</span>
              <strong>$1,472.00</strong>
            </div>
            <div className="records-row">
              <div>
                <strong>INV-2026-013</strong>
                <span>Linden Coffee</span>
              </div>
              <span className="sample-state">Sent</span>
              <strong>$860.00</strong>
            </div>
            <div className="records-row">
              <div>
                <strong>INV-2026-014</strong>
                <span>Fieldwork Co.</span>
              </div>
              <span className="sample-state sample-draft">Draft</span>
              <strong>$2,400.00</strong>
            </div>
            <p className="records-footnote">A place for the whole picture.</p>
          </div>
        </section>
        <section className="marketing-faq" id="questions">
          <div>
            <h2>
              A few things
              <br />
              worth knowing.
            </h2>
            <p>Simple answers before you start.</p>
          </div>
          <div>
            {questions.map((question) => (
              <details key={question.q}>
                <summary>
                  {question.q}
                  <Plus size={18} />
                </summary>
                <p>{question.a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="marketing-close">
          <h2>
            Back to the
            <br />
            work you love.
          </h2>
          <div>
            <p>
              Give your invoices a home.
              <br />
              Get on with the good part.
            </p>
            <Link className="marketing-primary" href="/login">
              Get started <ArrowUpRight size={17} />
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter>
        <a href="#product">Back to top</a>
      </SiteFooter>
    </div>
  );
}
