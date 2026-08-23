"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { Plus, Trash2, ArrowLeft, Loader2, Save } from "lucide-react";
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

const today = () => new Date().toISOString().split("T")[0];
const inDays = (days: number) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

export default function NewEstimatePage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState("");
  const [issueDate, setIssueDate] = useState(today());
  const [expiryDate, setExpiryDate] = useState(inDays(30));
  const [tax, setTax] = useState(0);
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
  const taxAmount = subtotal * ((tax || 0) / 100);
  const total = subtotal + taxAmount;

  const updateItem = (id: string, field: keyof LineItem, value: any) => {
    setItems(
      items.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const addItem = () =>
    setItems([
      ...items,
      { id: crypto.randomUUID(), description: "", quantity: 1, unitPrice: 0 },
    ]);

  const removeItem = (id: string) =>
    setItems(items.length > 1 ? items.filter((i) => i.id !== id) : items);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!clientId) {
      setError("Please select a client");
      return;
    }
    if (!items.some((i) => i.description.trim())) {
      setError("At least one line item needs a description");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/estimates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          items: items
            .filter((i) => i.description.trim())
            .map(({ description, quantity, unitPrice }) => ({
              description: description.trim(),
              quantity: Number(quantity),
              unitPrice: Number(unitPrice),
            })),
          issueDate,
          expiryDate,
          tax: Number(tax) || 0,
          notes: notes || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create estimate");
        return;
      }
      router.push(`/estimates/${data.estimate.id}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/estimates">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          New Estimate
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Client + dates */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Client *
              </label>
              <Select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
                options={[
                  { value: "", label: "Select a client..." },
                  ...clients.map((c) => ({
                    value: c.id,
                    label: `${c.name}${c.company ? ` — ${c.company}` : ""}`,
                  })),
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Issue date
              </label>
              <Input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Expires
              </label>
              <Input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Line items
            </h2>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="w-4 h-4 mr-1" />
              Add item
            </Button>
          </div>

          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) =>
                    updateItem(item.id, "description", e.target.value)
                  }
                  className="flex-1"
                />
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={item.quantity}
                  onChange={(e) =>
                    updateItem(item.id, "quantity", Number(e.target.value))
                  }
                  className="sm:w-24"
                  aria-label="Quantity"
                />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unitPrice}
                  onChange={(e) =>
                    updateItem(item.id, "unitPrice", Number(e.target.value))
                  }
                  className="sm:w-32"
                  aria-label="Unit price"
                />
                <div className="flex items-center justify-between sm:justify-end gap-2 sm:w-28">
                  <span className="text-sm text-gray-600 dark:text-gray-400 sm:hidden">
                    Total
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatCurrency(item.quantity * item.unitPrice)}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(item.id)}
                  disabled={items.length === 1}
                  aria-label="Remove item"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-gray-200 dark:border-gray-800 pt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
              <span className="text-gray-900 dark:text-white">
                {formatCurrency(subtotal)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm gap-4">
              <span className="text-gray-500 dark:text-gray-400">
                Tax %
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={tax}
                  onChange={(e) => setTax(Number(e.target.value))}
                  className="ml-2 inline-block w-20"
                  aria-label="Tax percent"
                />
              </span>
              <span className="text-gray-900 dark:text-white">
                {formatCurrency(taxAmount)}
              </span>
            </div>
            <div className="flex items-center justify-between font-semibold">
              <span className="text-gray-900 dark:text-white">Total</span>
              <span className="text-lg text-primary-600 dark:text-primary-400">
                {formatCurrency(total)}
              </span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Terms, scope, or other details for this estimate..."
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="flex justify-end gap-3">
          <Link href="/estimates">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-1.5" />
            )}
            Create estimate
          </Button>
        </div>
      </form>
    </div>
  );
}
