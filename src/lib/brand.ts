export const BRAND = {
  name: "InvoiceFlow",
  tagline: "Create invoices. Share payment links. Track what is owed.",
  description:
    "Create and share professional invoices, accept payments with Stripe Connect, and track clients, estimates, and overdue balances.",
  url: "https://invoiceflow-ten-azure.vercel.app",
  colors: {
    primary: "#245B45",
    primaryLight: "#39725A",
    primaryDark: "#194431",
    accent: "#39725A",
    accentLight: "#609374",
    accentDark: "#245B45",
    success: "#245B45",
    warning: "#8C5B1F",
    danger: "#AA4036",
    background: "#FFFFFF",
    backgroundAlt: "#F7F8F4",
    textPrimary: "#1C2923",
    textSecondary: "#59645D",
    textMuted: "#647067",
  },
} as const;

export const METADATA = {
  title: {
    default: BRAND.name,
    template: `%s | ${BRAND.name}`,
  },
  description: BRAND.description,
  keywords: [
    "invoicing",
    "Stripe",
    "freelance",
    "automated invoices",
    "payment reminders",
    "small business",
    "invoice generator",
  ],
  authors: [{ name: "InvoiceFlow" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BRAND.url,
    siteName: BRAND.name,
    title: BRAND.name,
    description: BRAND.description,
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND.name,
    description: BRAND.description,
  },
} as const;
