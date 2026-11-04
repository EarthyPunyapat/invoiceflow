import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Logo } from "@/components/logo";
import { SiteFooter } from "@/components/marketing/site-footer";
import "../marketing.css";
import "./legal.css";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="marketing">
      <header className="marketing-header">
        <Link href="/" aria-label="InvoiceFlow home">
          <Logo size={34} />
        </Link>
        <Link href="/login" className="marketing-signin">
          Sign in <ArrowUpRight size={15} />
        </Link>
      </header>
      <main className="legal">{children}</main>
      <SiteFooter />
    </div>
  );
}
