export const BRAND = {
  name: "InvoiceFlow",
  tagline: "Auto-generate invoices from Stripe. Get paid faster.",
  description:
    "InvoiceFlow connects to your Stripe account and automatically creates professional invoices for every payment. We handle the paperwork so you can focus on your business.",
  url: "https://invoiceflow.app",
  colors: {
    primary: "#4F46E5", // indigo-600
    primaryLight: "#6366F1", // indigo-500
    primaryDark: "#4338CA", // indigo-700
    accent: "#0D9488", // teal-600
    accentLight: "#14B8A6", // teal-500
    accentDark: "#0F766E", // teal-700
    success: "#059669", // emerald-600
    warning: "#D97706", // amber-600
    danger: "#DC2626", // red-600
    background: "#FFFFFF",
    backgroundAlt: "#F9FAFB", // gray-50
    textPrimary: "#111827", // gray-900
    textSecondary: "#4B5563", // gray-600
    textMuted: "#9CA3AF", // gray-400
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
