"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  Mail,
  Building2,
  FileText,
  Plus,
  Users,
} from "lucide-react";

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  total: number;
  currency: string;
  dueDate: string;
  createdAt: string;
  items: InvoiceItem[];
}

interface Client {
  id: string;
  name: string;
  email: string;
  company?: string | null;
  invoices: Invoice[];
}

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/clients/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setClient(data.client);
        }
      })
      .catch(() => setError("Failed to load client"))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded" />
        <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-xl" />
        <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-xl" />
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <Users className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" />
        <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
          {error || "Client not found"}
        </h2>
        <Link
          href="/clients"
          className="mt-4 inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to clients
        </Link>
      </div>
    );
  }

  const totalBilled = client.invoices.reduce(
    (sum, inv) => sum + (inv.status !== "CANCELLED" ? inv.total : 0),
    0
  );
  const outstanding = client.invoices.reduce(
    (sum, inv) =>
      sum + (inv.status === "SENT" || inv.status === "OVERDUE" ? inv.total : 0),
    0
  );
  const paid = client.invoices.reduce(
    (sum, inv) => sum + (inv.status === "PAID" ? inv.total : 0),
    0
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/clients"
          className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {client.name}
          </h1>
        </div>
        <Link href={`/invoices/new?clientId=${client.id}`}>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-1.5" />
            New Invoice
          </Button>
        </Link>
      </div>

      {/* Client info card */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
              {client.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {client.name}
            </h2>
            {client.company && (
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <Building2 className="w-4 h-4" />
                {client.company}
              </p>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <Mail className="w-4 h-4" />
              {client.email}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(totalBilled)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Total Billed
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(paid)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Paid
            </p>
          </div>
          <div className="text-center">
            <p className={`text-2xl font-bold ${outstanding > 0 ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"}`}>
              {formatCurrency(outstanding)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Outstanding
            </p>
          </div>
        </div>
      </div>

      {/* Invoices */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between p-5 pb-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Invoices ({client.invoices.length})
          </h2>
        </div>
        <div className="p-5">
          {client.invoices.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600" />
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                No invoices for this client
              </p>
              <Link
                href={`/invoices/new?clientId=${client.id}`}
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
              >
                <Plus className="w-4 h-4" />
                Create first invoice
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {client.invoices.map((inv) => (
                <Link
                  key={inv.id}
                  href={`/invoices/${inv.id}`}
                  className="flex items-center justify-between py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                      <FileText className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {inv.invoiceNumber}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Due {formatDate(inv.dueDate)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(inv.total, inv.currency)}
                    </p>
                    <Badge variant={statusVariant(inv.status)}>
                      {inv.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
