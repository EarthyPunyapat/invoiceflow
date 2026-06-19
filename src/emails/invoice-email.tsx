import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
  Heading,
  Row,
  Column,
} from "@react-email/components";

export interface InvoiceEmailProps {
  clientName: string;
  invoiceNumber: string;
  amount: string;
  dueDate: string;
  invoiceUrl: string;
  businessName: string;
}

export function InvoiceEmail({
  clientName = "Alex Johnson",
  invoiceNumber = "INV-001",
  amount = "$2,450.00",
  dueDate = "July 30, 2026",
  invoiceUrl = "https://invoiceflow.com/invoices/inv-001",
  businessName = "Acme Studio",
}: InvoiceEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        New invoice {invoiceNumber} for {amount} from {businessName}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={headerSection}>
            <Heading style={logo}>{businessName}</Heading>
          </Section>

          {/* Hero */}
          <Section style={heroSection}>
            <Heading style={heroTitle}>New Invoice</Heading>
            <Text style={heroSubtitle}>
              Hi {clientName}, here&apos;s your invoice for recent work.
            </Text>
          </Section>

          {/* Invoice Summary Box */}
          <Section style={summaryBox}>
            <Row>
              <Column style={summaryLabel}>Invoice</Column>
              <Column style={summaryValue}>{invoiceNumber}</Column>
            </Row>
            <Hr style={summaryDivider} />
            <Row>
              <Column style={summaryLabel}>Amount Due</Column>
              <Column style={summaryValueLarge}>{amount}</Column>
            </Row>
            <Hr style={summaryDivider} />
            <Row>
              <Column style={summaryLabel}>Due Date</Column>
              <Column style={summaryValue}>{dueDate}</Column>
            </Row>
          </Section>

          {/* CTA */}
          <Section style={ctaSection}>
            <Button href={invoiceUrl} style={button}>
              View & Pay Invoice
            </Button>
          </Section>

          {/* Footer */}
          <Section style={footerSection}>
            <Text style={footerText}>
              If you have any questions about this invoice, please reply to
              this email or contact {businessName} directly.
            </Text>
            <Text style={footerMuted}>
              This invoice is issued by {businessName}. Payment is due by{" "}
              {dueDate}.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default InvoiceEmail;

// ─── Styles ────────────────────────────────────────────────────────

const main: React.CSSProperties = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  padding: "40px 0",
};

const container: React.CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  margin: "0 auto",
  maxWidth: "560px",
  width: "100%",
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
};

const headerSection: React.CSSProperties = {
  padding: "32px 40px 0",
};

const logo: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: "700",
  color: "#111827",
  margin: "0",
};

const heroSection: React.CSSProperties = {
  padding: "32px 40px 0",
};

const heroTitle: React.CSSProperties = {
  fontSize: "28px",
  fontWeight: "700",
  color: "#111827",
  margin: "0 0 8px",
};

const heroSubtitle: React.CSSProperties = {
  fontSize: "16px",
  color: "#6b7280",
  lineHeight: "1.6",
  margin: "0",
};

const summaryBox: React.CSSProperties = {
  backgroundColor: "#f9fafb",
  borderRadius: "8px",
  margin: "32px 40px",
  padding: "24px",
};

const summaryLabel: React.CSSProperties = {
  fontSize: "14px",
  color: "#6b7280",
  padding: "8px 0",
};

const summaryValue: React.CSSProperties = {
  fontSize: "14px",
  color: "#111827",
  fontWeight: "500",
  textAlign: "right",
  padding: "8px 0",
};

const summaryValueLarge: React.CSSProperties = {
  fontSize: "22px",
  color: "#111827",
  fontWeight: "700",
  textAlign: "right",
  padding: "8px 0",
};

const summaryDivider: React.CSSProperties = {
  borderColor: "#e5e7eb",
  margin: "4px 0",
};

const ctaSection: React.CSSProperties = {
  padding: "0 40px 32px",
  textAlign: "center",
};

const button: React.CSSProperties = {
  backgroundColor: "#4f46e5",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  padding: "14px 32px",
  textDecoration: "none",
  textAlign: "center",
  display: "inline-block",
};

const footerSection: React.CSSProperties = {
  borderTop: "1px solid #e5e7eb",
  padding: "24px 40px 32px",
};

const footerText: React.CSSProperties = {
  fontSize: "14px",
  color: "#6b7280",
  lineHeight: "1.6",
  margin: "0 0 12px",
};

const footerMuted: React.CSSProperties = {
  fontSize: "12px",
  color: "#9ca3af",
  lineHeight: "1.5",
  margin: "0",
};
