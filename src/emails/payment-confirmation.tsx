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

export interface PaymentConfirmationProps {
  clientName: string;
  invoiceNumber: string;
  amount: string;
  paidAt: string;
}

export function PaymentConfirmation({
  clientName = "Alex Johnson",
  invoiceNumber = "INV-001",
  amount = "$2,450.00",
  paidAt = "July 15, 2026 at 3:45 PM",
}: PaymentConfirmationProps) {
  return (
    <Html>
      <Head />
      <Preview>
        🎉 {clientName} paid invoice {invoiceNumber} — {amount}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={headerSection}>
            <Heading style={logo}>InvoiceFlow</Heading>
          </Section>

          {/* Hero */}
          <Section style={heroSection}>
            <Text style={icon}>💰</Text>
            <Heading style={heroTitle}>Payment Received!</Heading>
            <Text style={heroSubtitle}>
              Great news — {clientName} has paid their invoice.
            </Text>
          </Section>

          {/* Summary Box */}
          <Section style={summaryBox}>
            <Row>
              <Column style={summaryLabel}>Invoice</Column>
              <Column style={summaryValue}>{invoiceNumber}</Column>
            </Row>
            <Hr style={summaryDivider} />
            <Row>
              <Column style={summaryLabel}>Amount Paid</Column>
              <Column style={summaryValueLarge}>{amount}</Column>
            </Row>
            <Hr style={summaryDivider} />
            <Row>
              <Column style={summaryLabel}>Client</Column>
              <Column style={summaryValue}>{clientName}</Column>
            </Row>
            <Hr style={summaryDivider} />
            <Row>
              <Column style={summaryLabel}>Paid On</Column>
              <Column style={summaryValue}>{paidAt}</Column>
            </Row>
          </Section>

          {/* CTA */}
          <Section style={ctaSection}>
            <Button href="https://invoiceflow.com/dashboard" style={button}>
              View Dashboard
            </Button>
          </Section>

          {/* Footer */}
          <Section style={footerSection}>
            <Text style={footerText}>
              This payment has been automatically recorded in your InvoiceFlow
              dashboard. No further action is needed.
            </Text>
            <Text style={footerMuted}>
              InvoiceFlow — Freelance invoicing made simple.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default PaymentConfirmation;

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
  textAlign: "center",
};

const icon: React.CSSProperties = {
  fontSize: "40px",
  margin: "0 0 12px",
};

const heroTitle: React.CSSProperties = {
  fontSize: "28px",
  fontWeight: "700",
  color: "#059669",
  margin: "0 0 8px",
};

const heroSubtitle: React.CSSProperties = {
  fontSize: "16px",
  color: "#6b7280",
  lineHeight: "1.6",
  margin: "0",
};

const summaryBox: React.CSSProperties = {
  backgroundColor: "#f0fdf4",
  borderRadius: "8px",
  margin: "32px 40px",
  padding: "24px",
  border: "1px solid #a7f3d0",
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
  color: "#059669",
  fontWeight: "700",
  textAlign: "right",
  padding: "8px 0",
};

const summaryDivider: React.CSSProperties = {
  borderColor: "#a7f3d0",
  margin: "4px 0",
};

const ctaSection: React.CSSProperties = {
  padding: "0 40px 32px",
  textAlign: "center",
};

const button: React.CSSProperties = {
  backgroundColor: "#059669",
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
