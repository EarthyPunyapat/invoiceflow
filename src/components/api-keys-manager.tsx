"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ApiKeyRow {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

function fmt(value: string | null): string {
  if (!value) return "never";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "never";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ApiKeysManager() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/keys", { cache: "no-store" });
      if (!res.ok) throw new Error("load failed");
      const data = (await res.json()) as { keys?: ApiKeyRow[] };
      setKeys(Array.isArray(data.keys) ? data.keys : []);
      setError(null);
    } catch {
      setError("Could not load API keys. Reload the page to try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    const label = name.trim();
    if (!label) {
      setError("Give the key a name so you can recognise it later.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: label }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        key?: string;
        error?: string;
      };
      if (!res.ok || !data.key) {
        setError(data.error ?? "Could not create the key.");
        return;
      }
      setFreshKey(data.key);
      setCopied(false);
      setName("");
      await load();
    } catch {
      setError("Could not create the key.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/keys/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Could not revoke the key.");
        return;
      }
      await load();
    } catch {
      setError("Could not revoke the key.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!freshKey) return;
    try {
      await navigator.clipboard.writeText(freshKey);
      setCopied(true);
    } catch {
      setError("Copy failed. Select the key and copy it manually.");
    }
  }

  const active = keys.filter((k) => !k.revokedAt);

  return (
    <section
      className="rounded-xl border border-gray-200 p-6"
      aria-label="API keys"
    >
      <h2 className="text-sm font-semibold">API keys</h2>
      <p className="mt-2 text-sm text-gray-600">
        Let an agent or script work with your invoices. A key acts only as{" "}
        <strong>your</strong> account, and it cannot create or revoke other keys.
        See the{" "}
        <a className="underline" href="/api-docs">
          agent API reference
        </a>
        .
      </p>

      {freshKey && (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">
            Copy this key now. It is shown once and cannot be recovered.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 break-all rounded bg-white px-2 py-1.5 font-mono text-xs">
              {freshKey}
            </code>
            <Button type="button" variant="outline" onClick={copy} disabled={busy}>
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setFreshKey(null);
                setCopied(false);
              }}
            >
              Done
            </Button>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <label className="min-w-0 flex-1 text-sm">
          <span className="mb-1 block text-gray-600">Key name</span>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. bookkeeping-agent"
            maxLength={64}
            disabled={busy}
          />
        </label>
        <Button type="button" onClick={create} disabled={busy || !name.trim()}>
          {busy ? "Working..." : "Create key"}
        </Button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-5">
        {loading ? (
          <p className="text-sm text-gray-500">Loading keys...</p>
        ) : active.length === 0 ? (
          <p className="text-sm text-gray-500">
            No API keys yet. Create one to let an agent start working.
          </p>
        ) : (
          <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
            {active.map((k) => (
              <li
                key={k.id}
                className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{k.name}</p>
                  <p className="mt-0.5 font-mono text-xs text-gray-500">
                    {k.prefix}...
                  </p>
                </div>
                <p className="text-xs text-gray-500">
                  created {fmt(k.createdAt)} | last used {fmt(k.lastUsedAt)}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => revoke(k.id)}
                  disabled={busy}
                >
                  Revoke
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
