"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Send,
  CheckCircle,
  FileDown,
  Link,
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
  const [copied, setCopied] = useState(false);
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

  // Opens the server-rendered PDF instead of relying on print stylesheets.
  const handleDownloadPDF = () => {
    window.open(`/api/invoices/${invoiceId}/pdf`, "_blank", "noopener");
  };

  // Issues (or reuses) the public share token, then copies the link.
  // Clipboard access can be denied outside secure contexts, so fall back
  // to a manual prompt rather than dead-ending the user.
  const handleCopyLink = async () => {
    setError("");
    setActionLoading("SHARE");

    let url = "";
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/share`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create share link");
      }
      url = data.url as string;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setActionLoading(null);
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy your invoice link:", url);
    } finally {
      setActionLoading(null);
    }
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
        <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
          <FileDown className="w-4 h-4 mr-1.5" />
          Download PDF
        </Button>
        {(status === "SENT" || status === "OVERDUE") && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            disabled={actionLoading === "SHARE"}
          >
            {actionLoading === "SHARE" ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : copied ? (
              <CheckCircle className="w-4 h-4 mr-1.5" />
            ) : (
              <Link className="w-4 h-4 mr-1.5" />
            )}
            {copied ? "Copied!" : "Copy Public Link"}
          </Button>
        )}
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
