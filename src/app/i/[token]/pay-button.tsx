"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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

      if (res.status === 503) {
        setNotice("Online payment unavailable");
        return;
      }

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.url) {
        setNotice(data?.error || "Unable to start payment");
        return;
      }

      // Hand off to Stripe Checkout.
      window.location.href = data.url;
    } catch {
      setNotice("Online payment unavailable");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={handlePay}
        disabled={loading}
        className="w-full sm:w-auto"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
        ) : (
          <CreditCard className="w-4 h-4 mr-1.5" />
        )}
        {loading ? "Redirecting…" : "Pay now"}
      </Button>
      {notice && (
        <p className="text-sm text-red-600 dark:text-red-400">{notice}</p>
      )}
    </div>
  );
}
