"use client";

import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";

interface PayButtonProps {
  token: string;
}

/**
 * Public "Pay now" CTA shown on the shared invoice page (/i/[token]).
 * Posts to the rate-limited pay endpoint and redirects to the returned
 * Stripe Checkout URL. A 503 means online payments are not configured
 * for this business — surfaced as an inline notice, not an exception.
 */
export function PayButton({ token }: PayButtonProps) {
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const handlePay = async () => {
    setLoading(true);
    setNotice(null);

    try {
      const res = await fetch(`/api/i/${token}/pay`, { method: "POST" });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.url) {
        setNotice(data?.error || "Unable to start payment");
        return;
      }

      // Hand off to Stripe Checkout.
      window.location.href = data.url;
    } catch {
      setNotice(
        "The payment service could not be reached. Please try again, or contact the issuer for payment instructions.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pay-area">
      <button type="button" onClick={handlePay} disabled={loading} className="stub-button pay-stub">
        {loading ? (
          <Loader2 className="pay-icon animate-spin" aria-hidden="true" />
        ) : (
          <CreditCard className="pay-icon" aria-hidden="true" />
        )}
        {loading ? "Redirecting…" : "Pay now"}
      </button>
      {notice && (
        <p role="alert" className="pay-notice">
          {notice}
        </p>
      )}
    </div>
  );
}
