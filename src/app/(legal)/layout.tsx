import { SiteFooter, SiteHeader } from "@/components/docket/site-chrome";
import { docketFonts } from "@/components/docket/fonts";
import "../docket.css";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`docket-site ${docketFonts}`}>
      <SiteHeader />
      <main className="legal-sheet">{children}</main>
      <SiteFooter />
    </div>
  );
}
