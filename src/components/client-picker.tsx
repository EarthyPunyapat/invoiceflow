"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

interface ClientOption {
  id: string;
  name: string;
  email: string;
  company?: string | null;
}

interface ClientPickerProps {
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}

function isClientOption(value: unknown): value is ClientOption {
  if (!value || typeof value !== "object") return false;
  const client = value as Partial<ClientOption>;
  return typeof client.id === "string" && typeof client.name === "string" && typeof client.email === "string";
}

export function ClientPicker({ value, onChange, disabled = false }: ClientPickerProps) {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [sessionExpired, setSessionExpired] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [notice, setNotice] = useState("");
  const selectRef = useRef<HTMLSelectElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const wasCreating = useRef(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const loadId = useRef(0);
  const loadController = useRef<AbortController | null>(null);

  const loadClients = useCallback(async () => {
    const requestId = ++loadId.current;
    loadController.current?.abort();
    const controller = new AbortController();
    loadController.current = controller;
    setLoading(true);
    setLoadError("");
    setSessionExpired(false);
    try {
      const response = await fetch("/api/clients?view=options", { cache: "no-store", signal: controller.signal });
      const data = await response.json().catch(() => null);
      if (response.status === 401) {
        if (loadId.current === requestId) setSessionExpired(true);
        throw new Error("Your session has expired. Sign in again to load your clients.");
      }
      if (!response.ok || !Array.isArray(data?.clients) || !data.clients.every(isClientOption)) {
        throw new Error("We couldn't load your clients. Please try again.");
      }
      if (loadId.current === requestId) setClients(data.clients);
    } catch (error) {
      if (controller.signal.aborted || loadId.current !== requestId) return;
      setLoadError(error instanceof Error && error.message.includes("Your session has expired") ? error.message : "We couldn't load your clients. Please try again.");
    } finally {
      if (loadId.current === requestId) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadClients();
    return () => {
      loadId.current += 1;
      loadController.current?.abort();
    };
  }, [loadClients]);

  useEffect(() => {
    if (showCreate) nameRef.current?.focus();
    else if (wasCreating.current) {
      if (selectRef.current?.disabled) addButtonRef.current?.focus();
      else selectRef.current?.focus();
    }
    wasCreating.current = showCreate;
  }, [showCreate]);

  const closeCreate = () => {
    setShowCreate(false);
    setCreateError("");
  };

  const createClient = async () => {
    if (creating || disabled) return;
    setCreateError("");
    if (!name.trim()) {
      setCreateError("Enter the client's name.");
      nameRef.current?.focus();
      return;
    }
    if (!email.trim() || !emailRef.current?.checkValidity()) {
      setCreateError("Enter a valid email address.");
      emailRef.current?.focus();
      return;
    }
    setCreating(true);
    try {
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), company: company.trim() || null }),
      });
      const data = await response.json().catch(() => null);
      if (response.status === 401) {
        setSessionExpired(true);
        throw new Error("Your session has expired. Sign in again before saving this client.");
      }
      if (!response.ok) throw new Error(typeof data?.error === "string" ? data.error : "We couldn't save this client. Please try again.");
      if (!isClientOption(data?.client)) throw new Error("We couldn't confirm the saved client. Reload your clients before trying again.");
      const client = data.client;
      // A slow earlier list response must not replace the newly created option.
      loadId.current += 1;
      loadController.current?.abort();
      setClients(previous => [...previous.filter(item => item.id !== client.id), client].sort((a, b) => a.name.localeCompare(b.name)));
      onChange(client.id);
      setLoading(false);
      setLoadError("");
      setSessionExpired(false);
      setName(""); setEmail(""); setCompany("");
      setNotice(`${client.name} was added and selected.`);
      closeCreate();
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "We couldn't save this client. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-3">
      <Select
        ref={selectRef}
        id="client"
        label="Client"
        value={value}
        onChange={event => { onChange(event.target.value); setNotice(""); }}
        disabled={disabled || creating || loading || clients.length === 0}
        required
        options={[
          { value: "", label: loading ? "Loading clients…" : clients.length ? "Select a client…" : "No clients available" },
          ...clients.map(client => ({ value: client.id, label: `${client.name}${client.company ? ` (${client.company})` : ""}` })),
        ]}
      />
      {loading && <p role="status" className="text-sm text-gray-500">Loading your clients…</p>}
      {loadError && (
        <div className="space-y-2">
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
          <Button type="button" size="sm" variant="outline" onClick={() => void loadClients()} disabled={disabled || creating}>Retry loading clients</Button>
        </div>
      )}
      {!loading && !loadError && clients.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">No clients yet. Add your first client to continue.</p>}
      {!showCreate && (
        <Button ref={addButtonRef} type="button" variant="outline" size="sm" disabled={disabled || creating} onClick={() => { setShowCreate(true); setNotice(""); }} aria-expanded={false} aria-controls="inline-client-editor">
          <Plus className="mr-1 h-4 w-4" /> Add new client
        </Button>
      )}
      {showCreate && (
        <fieldset
          id="inline-client-editor"
          disabled={disabled || creating}
          className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-950"
          onKeyDown={event => {
            if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
              event.preventDefault();
              void createClient();
            }
            if (event.key === "Escape" && !creating) { event.preventDefault(); closeCreate(); }
          }}
        >
          <legend className="px-1 text-sm font-semibold text-gray-900 dark:text-white">Add new client</legend>
          <div className="space-y-1">
            <label htmlFor="inline-client-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
            <Input ref={nameRef} id="inline-client-name" autoComplete="name" maxLength={200} value={name} onChange={event => setName(event.target.value)} aria-required="true" />
          </div>
          <div className="space-y-1">
            <label htmlFor="inline-client-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
            <Input ref={emailRef} id="inline-client-email" type="email" autoComplete="email" maxLength={320} value={email} onChange={event => setEmail(event.target.value)} aria-required="true" />
          </div>
          <div className="space-y-1">
            <label htmlFor="inline-client-company" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Company (optional)</label>
            <Input id="inline-client-company" autoComplete="organization" maxLength={200} value={company} onChange={event => setCompany(event.target.value)} />
          </div>
          {createError && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{createError}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => void createClient()} disabled={creating || disabled}>
              {creating && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              {creating ? "Saving client…" : "Save client"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={closeCreate} disabled={creating}>Cancel</Button>
          </div>
        </fieldset>
      )}
      {sessionExpired && <Link href="/login" target="_blank" rel="noopener noreferrer" className="block text-sm font-medium text-primary-600 hover:underline">Sign in again</Link>}
      {notice && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">{notice}</p>}
    </div>
  );
}
