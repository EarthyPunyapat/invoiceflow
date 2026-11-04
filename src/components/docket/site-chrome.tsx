import Link from "next/link";
import { LogoIcon } from "@/components/logo";

/** Wordmark in the docket world: the document mark printed in carbon blue. */
export function DocketMark() {
  return (
    <span className="docket-mark">
      <LogoIcon size={30} />
      <span>InvoiceFlow</span>
    </span>
  );
}

/** Header shared by the landing page and legal pages. */
export function SiteHeader({ sections = false }: { sections?: boolean }) {
  return (
    <header className="site-header">
      <Link href="/" aria-label="InvoiceFlow home">
        <DocketMark />
      </Link>
      {sections && (
        <nav aria-label="Main navigation" className="site-nav">
          <a href="#how-it-works">How you get paid</a>
          <a href="#price">Price</a>
          <a href="#questions">Questions</a>
        </nav>
      )}
      <div className="site-header-actions">
        <Link href="/login" className="site-signin">
          Sign in
        </Link>
        <Link href="/login" className="stub-button is-small">
          Start free
        </Link>
      </div>
    </header>
  );
}

/** Footer shared by the landing page and legal pages. */
export function SiteFooter({ children }: { children?: React.ReactNode }) {
  return (
    <footer className="site-footer">
      <DocketMark />
      <p>Do the work. Get paid.</p>
      <nav aria-label="Footer">
        <Link href="/api-docs">API for agents</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        {children}
      </nav>
    </footer>
  );
}
