import Link from "next/link";
import { Logo } from "@/components/logo";

/** Footer shared by the landing page and the legal pages. */
export function SiteFooter({ children }: { children?: React.ReactNode }) {
  return (
    <footer className="marketing-footer">
      <Logo size={32} />
      <p>Made for the work you do.</p>
      <nav className="marketing-footer-links" aria-label="Footer">
        <Link href="/api-docs">API for agents</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        {children}
      </nav>
    </footer>
  );
}
