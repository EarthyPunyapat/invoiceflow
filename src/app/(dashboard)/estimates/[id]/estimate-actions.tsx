"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Send,
  CheckCircle,
  XCircle,
  ArrowRightLeft,
  Trash2,
  Loader2,
} from "lucide-react";

interface EstimateActionsProps {
  estimateId: string;
  status: string;
}

export function EstimateActions({ estimateId, status }: EstimateActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const patchStatus = async (newStatus: string) => {
    setLoading(newStatus);
    setError("");
    try {
      const res = await fetch(`/api/estimates/${estimateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to update estimate");
        return;
      }
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(null);
    }
  };

  const convert = async () => {
    setLoading("CONVERT");
    setError("");
    try {
      const res = await fetch(`/api/estimates/${estimateId}/convert`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to convert estimate");
        return;
      }
      router.push(`/invoices/${data.invoice.id}`);
    } catch {
      setError("Something went wrong");
      setLoading(null);
    }
  };

  const remove = async () => {
    if (!confirm("Delete this estimate? This cannot be undone.")) return;
    setLoading("DELETE");
    try {
      const res = await fetch(`/api/estimates/${estimateId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to delete estimate");
        return;
      }
      router.push("/estimates");
    } catch {
      setError("Something went wrong");
      setLoading(null);
    }
  };

  const canSend = status === "DRAFT";
  const canDecide = status === "SENT";
  const canConvert =
    status === "ACCEPTED" || status === "SENT" || status === "DRAFT";

  if (status === "CONVERTED") {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Converted to invoice
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {canSend && (
          <Button size="sm" onClick={() => patchStatus("SENT")} disabled={!!loading}>
            {loading === "SENT" ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-1.5" />
            )}
            Mark Sent
          </Button>
        )}
        {canDecide && (
          <>
            <Button
              size="sm"
              onClick={() => patchStatus("ACCEPTED")}
              disabled={!!loading}
            >
              <CheckCircle className="w-4 h-4 mr-1.5" />
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => patchStatus("DECLINED")}
              disabled={!!loading}
            >
              <XCircle className="w-4 h-4 mr-1.5" />
              Decline
            </Button>
          </>
        )}
        {canConvert && (
          <Button
            size="sm"
            variant="primary"
            onClick={convert}
            disabled={!!loading}
          >
            {loading === "CONVERT" ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <ArrowRightLeft className="w-4 h-4 mr-1.5" />
            )}
            Convert to Invoice
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={remove}
          disabled={!!loading}
          aria-label="Delete estimate"
        >
          <Trash2 className="w-4 h-4 text-red-500" />
        </Button>
      </div>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
