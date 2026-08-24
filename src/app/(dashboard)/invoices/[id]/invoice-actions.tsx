"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Send,
  CheckCircle,
  Download,
  Loader2,
  Trash2,
} from "lucide-react";

interface InvoiceActionsProps {
  invoiceId: string;
  status: string;
  canSend: boolean;
  canMarkPaid: boolean;
}

export function InvoiceActions({
  invoiceId,
  status,
  canSend,
  canMarkPaid,
}: InvoiceActionsProps) {
  const router = useRouter();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleStatusChange = async (newStatus: string) => {
    setActionLoading(newStatus);
    setError("");

    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update invoice");
      }

      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this invoice? This cannot be undone.")) {
      return;
    }

    setActionLoading("DELETE");
    setError("");

    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete invoice");
      }

      router.push("/invoices");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setActionLoading(null);
    }
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  return (
    <>
      {error && (
        <div className="w-full p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
      <div className="flex items-center gap-2">
        {canSend && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleStatusChange("SENT")}
            disabled={actionLoading === "SENT"}
          >
            {actionLoading === "SENT" ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-1.5" />
            )}
            Mark as Sent
          </Button>
        )}
        {canMarkPaid && (
          <Button
            size="sm"
            onClick={() => handleStatusChange("PAID")}
            disabled={actionLoading === "PAID"}
          >
            {actionLoading === "PAID" ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4 mr-1.5" />
            )}
            Mark Paid
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={handleDownloadPDF}>
          <Download className="w-4 h-4 mr-1.5" />
          PDF
        </Button>
        {status === "DRAFT" && (
          <Button
            variant="danger"
            size="sm"
            onClick={handleDelete}
            disabled={actionLoading === "DELETE"}
          >
            {actionLoading === "DELETE" ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4 mr-1.5" />
            )}
            Delete
          </Button>
        )}
      </div>
    </>
  );
}
