"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import {
  Plus,
  Trash2,
  ArrowLeft,
  Loader2,
  Send,
  Save,
} from "lucide-react";
import Link from "next/link";

interface Client {
  id: string;
  name: string;
  email: string;
  company?: string | null;
}

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [tax, setTax] = useState(0);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([
    { id: crypto.randomUUID(), description: "", quantity: 1, unitPrice: 0 },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/clients")
      .then((res) => res.json())
      .then((data) => setClients(data.clients || []))
      .catch(console.error);
  }, []);

  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const taxAmount = (subtotal * tax) / 100;
  const total = subtotal + taxAmount;

  const addItem = () => {
    setItems([
      ...items,
      { id: crypto.randomUUID(), description: "", quantity: 1, unitPrice: 0 },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(items.filter((item) => item.id !== id));
  };

  const updateItem = (
    id: string,
    field: keyof LineItem,
    value: string | number
  ) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const validateForm = (): boolean => {
    if (!clientId) {
      setError("Please select a client");
      return false;
    }
    if (!dueDate) {
      setError("Please set a due date");
      return false;
    }
    const invalidItems = items.filter(
      (item) => !item.description.trim() || item.quantity <= 0 || item.unitPrice <= 0
    );
    if (invalidItems.length > 0) {
      setError("All line items must have a description, quantity > 0, and price > 0");
      return false;
    }
    setError("");
    return true;
  };

  const handleSubmit = async (status: "DRAFT" | "SENT") => {
    if (!validateForm()) return;
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          items: items.map(({ id, ...rest }) => rest),
          dueDate,
          currency,
          tax,
          notes: notes || undefined,
          status,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create invoice");
      }

      const data = await res.json();
      router.push(`/invoices/${data.invoice.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/invoices"
          className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            New Invoice
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Create a new invoice for your client
          </p>
        </div>
      </div>

      {error && (
        <div
          aria-live="polite"
          className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400"
        >
          {error}
        </div>
      )}

      {/* Client & Details */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
          Invoice Details
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            id="client"
            label="Client"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            options={[
              { value: "", label: "Select a client..." },
              ...clients.map((c) => ({
                value: c.id,
                label: `${c.name}${c.company ? ` (${c.company})` : ""}`,
              })),
            ]}
          />
          <div className="space-y-1">
            <label
              htmlFor="invoiceDate"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Invoice Date
            </label>
            <Input
              id="invoiceDate"
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label
              htmlFor="dueDate"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Due Date
            </label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <Select
            id="currency"
            label="Currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            options={[
              { value: "USD", label: "USD - US Dollar" },
              { value: "EUR", label: "EUR - Euro" },
              { value: "GBP", label: "GBP - British Pound" },
              { value: "NZD", label: "NZD - New Zealand Dollar" },
              { value: "CAD", label: "CAD - Canadian Dollar" },
              { value: "AUD", label: "AUD - Australian Dollar" },
            ]}
          />
          <div className="space-y-1">
            <label
              htmlFor="taxRate"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Tax Rate (%)
            </label>
            <Input
              id="taxRate"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={tax}
              onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
            Line Items
          </h2>
          <Button variant="outline" size="sm" onClick={addItem} type="button">
            <Plus className="w-4 h-4 mr-1" />
            Add Item
          </Button>
        </div>

        <div className="space-y-3">
          {/* Header row - hidden on mobile */}
          <div className="hidden sm:grid grid-cols-12 gap-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1">
            <div className="col-span-5">Description</div>
            <div className="col-span-2">Qty</div>
            <div className="col-span-2">Price</div>
            <div className="col-span-2 text-right">Total</div>
            <div className="col-span-1" />
          </div>

          {items.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-3 items-start p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50"
            >
              <div className="sm:col-span-5">
                <label
                  htmlFor={`description-${item.id}`}
                  className="sm:hidden text-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Description
                </label>
                <Input
                  id={`description-${item.id}`}
                  placeholder="Item description"
                  value={item.description}
                  onChange={(e) =>
                    updateItem(item.id, "description", e.target.value)
                  }
                />
              </div>
              <div className="sm:col-span-2 grid grid-cols-2 sm:block gap-2">
                <div>
                  <label
                    htmlFor={`qty-${item.id}`}
                    className="sm:hidden text-xs font-medium text-gray-500 dark:text-gray-400"
                  >
                    Qty
                  </label>
                  <Input
                    id={`qty-${item.id}`}
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(
                        item.id,
                        "quantity",
                        parseInt(e.target.value) || 0
                      )
                    }
                  />
                </div>
                <div className="sm:hidden">
                  <label
                    htmlFor={`price-${item.id}`}
                    className="sm:hidden text-xs font-medium text-gray-500 dark:text-gray-400"
                  >
                    Price
                  </label>
                  <Input
                    id={`price-${item.id}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) =>
                      updateItem(
                        item.id,
                        "unitPrice",
                        parseFloat(e.target.value) || 0
                      )
                    }
                  />
                </div>
              </div>
              <div className="hidden sm:block sm:col-span-2">
                <Input
                  aria-label="Unit price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unitPrice}
                  onChange={(e) =>
                    updateItem(
                      item.id,
                      "unitPrice",
                      parseFloat(e.target.value) || 0
                    )
                  }
                />
              </div>
              <div className="sm:col-span-2 text-right">
                <span className="sm:hidden text-xs font-medium text-gray-500 dark:text-gray-400">
                  Total:{" "}
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatCurrency(item.quantity * item.unitPrice)}
                </span>
              </div>
              <div className="sm:col-span-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  disabled={items.length <= 1}
                  aria-label="Remove item"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
            <span className="text-gray-900 dark:text-white font-medium">
              {formatCurrency(subtotal)}
            </span>
          </div>
          {tax > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                Tax ({tax}%)
              </span>
              <span className="text-gray-900 dark:text-white font-medium">
                {formatCurrency(taxAmount)}
              </span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-200 dark:border-gray-700">
            <span className="text-gray-900 dark:text-white">Total</span>
            <span className="text-gray-900 dark:text-white">
              {formatCurrency(total)}
            </span>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-2">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
          Notes
        </h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional notes, payment instructions, or terms..."
          rows={3}
          className="flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900 dark:ring-offset-gray-950 dark:placeholder:text-gray-400 dark:focus-visible:ring-primary-500"
        />
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-end">
        <Button
          variant="outline"
          onClick={() => handleSubmit("DRAFT")}
          disabled={saving}
        >
          {saving ? (
            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-1.5" />
          )}
          Save as Draft
        </Button>
        <Button
          onClick={() => handleSubmit("SENT")}
          disabled={saving}
        >
          {saving ? (
            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
          ) : (
            <Send className="w-4 h-4 mr-1.5" />
          )}
          Save & Send
        </Button>
      </div>
    </div>
  );
}
