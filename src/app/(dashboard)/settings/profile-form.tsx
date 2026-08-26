"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Loader2 } from "lucide-react";

export interface BusinessProfile {
  businessName: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  logoUrl: string | null;
  accentColor: string | null;
  invoicePrefix: string | null;
}

// Mirrors the server-side rules in /api/settings/profile (zod is the
// source of truth; these give instant feedback before submit).
const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const URL_RE = /^https?:\/\/\S+$/;
const PREFIX_RE = /^[A-Z0-9]*$/;
const FALLBACK_ACCENT = "#2563eb";
// Mirrors the looser accent gating on public share pages (/i/[token])
// so the live preview shows exactly what clients will see. Save-time
// validation above stays strict ({6}) per the server zod contract.
const PREVIEW_HEX_RE = /^#[0-9a-fA-F]{3,8}$/;

function toFormState(p: BusinessProfile) {
  return {
    businessName: p.businessName ?? "",
    addressLine1: p.addressLine1 ?? "",
    addressLine2: p.addressLine2 ?? "",
    city: p.city ?? "",
    state: p.state ?? "",
    postalCode: p.postalCode ?? "",
    country: p.country ?? "",
    logoUrl: p.logoUrl ?? "",
    accentColor: p.accentColor ?? "",
    invoicePrefix: p.invoicePrefix ?? "",
  };
}

type FormState = ReturnType<typeof toFormState>;

/**
 * Business profile editor shown on the Settings page. Branding saved
 * here flows onto invoices, public share pages (/i/[token]) and
 * reminder emails.
 */
export function ProfileForm({ profile }: { profile: BusinessProfile }) {
  const router = useRouter();
  const [initial, setInitial] = useState<FormState>(() => toFormState(profile));
  const [form, setForm] = useState<FormState>(() => toFormState(profile));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initial),
    [form, initial]
  );

  const logoValid = form.logoUrl === "" || URL_RE.test(form.logoUrl.trim());
  const accentValid =
    form.accentColor === "" || HEX_RE.test(form.accentColor.trim());
  const prefixValid = PREFIX_RE.test(form.invoicePrefix.trim());

  const set =
    (key: keyof FormState) =>
    (
      e: React.ChangeEvent<HTMLInputElement>
    ) => {
      setSaved(false);
      setError(null);
      setForm((f) => ({ ...f, [key]: e.target.value }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Early client-side checks (server re-validates with zod).
    if (!logoValid) {
      setError("Logo must be a valid http(s) URL");
      return;
    }
    if (!accentValid) {
      setError("Accent color must be a hex value like #2563EB");
      return;
    }
    if (!prefixValid) {
      setError("Invoice prefix may only contain uppercase letters and digits");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const issues = data?.issues as Record<string, string[]> | undefined;
        const first = issues ? Object.values(issues)[0]?.[0] : undefined;
        setError(first || data?.error || "Failed to save profile");
        return;
      }

      const snapshot = {
        ...form,
        logoUrl: form.logoUrl.trim(),
        accentColor: form.accentColor.trim(),
        invoicePrefix: form.invoicePrefix.trim().toUpperCase(),
      };
      setInitial(snapshot);
      setForm(snapshot);
      setSaved(true);
      router.refresh();
    } catch {
      setError("Network error — please try again");
    } finally {
      setSaving(false);
    }
  };

  const accentTrimmed = form.accentColor.trim();
  const previewAccent = HEX_RE.test(accentTrimmed)
    ? accentTrimmed
    : FALLBACK_ACCENT;
  const previewName = form.businessName.trim() || "Your business";
  const previewLogo = form.logoUrl.trim();
  const showLogoImage = logoValid && previewLogo !== "";
  // Preview-only accent gate mirrors the PUBLIC share page (/i/[token]):
  // undefined means neutral styling with inline styles omitted — exactly
  // how the public page renders an absent/invalid accent.
  const previewHex = PREVIEW_HEX_RE.test(accentTrimmed)
    ? accentTrimmed
    : undefined;
  const previewPrefix = form.invoicePrefix.trim().toUpperCase() || "INV";

  const labelClass =
    "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label htmlFor="businessName" className={labelClass}>
            Business name
          </label>
          <Input
            id="businessName"
            value={form.businessName}
            onChange={set("businessName")}
            placeholder="Acme Studio LLC"
            maxLength={120}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="addressLine1" className={labelClass}>
            Address line 1
          </label>
          <Input
            id="addressLine1"
            value={form.addressLine1}
            onChange={set("addressLine1")}
            placeholder="123 Main Street"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="addressLine2" className={labelClass}>
            Address line 2
          </label>
          <Input
            id="addressLine2"
            value={form.addressLine2}
            onChange={set("addressLine2")}
            placeholder="Suite 400"
          />
        </div>

        <div>
          <label htmlFor="city" className={labelClass}>
            City
          </label>
          <Input
            id="city"
            value={form.city}
            onChange={set("city")}
            placeholder="San Francisco"
          />
        </div>

        <div>
          <label htmlFor="state" className={labelClass}>
            State / Region
          </label>
          <Input
            id="state"
            value={form.state}
            onChange={set("state")}
            placeholder="CA"
          />
        </div>

        <div>
          <label htmlFor="postalCode" className={labelClass}>
            Postal code
          </label>
          <Input
            id="postalCode"
            value={form.postalCode}
            onChange={set("postalCode")}
            placeholder="94105"
          />
        </div>

        <div>
          <label htmlFor="country" className={labelClass}>
            Country
          </label>
          <Input
            id="country"
            value={form.country}
            onChange={set("country")}
            placeholder="United States"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="logoUrl" className={labelClass}>
            Logo URL
          </label>
          <Input
            id="logoUrl"
            type="url"
            value={form.logoUrl}
            onChange={set("logoUrl")}
            placeholder="https://example.com/logo.png"
            className={!logoValid ? "border-red-400 focus-visible:ring-red-500" : undefined}
          />
        </div>

        <div>
          <label htmlFor="accentColor" className={labelClass}>
            Accent color
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              aria-label="Pick accent color"
              value={
                HEX_RE.test(form.accentColor) ? form.accentColor : FALLBACK_ACCENT
              }
              onChange={(e) => {
                setSaved(false);
                setError(null);
                setForm((f) => ({ ...f, accentColor: e.target.value }));
              }}
              className="h-10 w-12 shrink-0 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent cursor-pointer p-1"
            />
            <Input
              id="accentColor"
              value={form.accentColor}
              onChange={set("accentColor")}
              placeholder="#2563eb"
              maxLength={7}
              className={`font-mono ${
                !accentValid ? "border-red-400 focus-visible:ring-red-500" : ""
              }`}
            />
          </div>
        </div>

        <div>
          <label htmlFor="invoicePrefix" className={labelClass}>
            Invoice prefix
          </label>
          <Input
            id="invoicePrefix"
            value={form.invoicePrefix}
            onChange={(e) => {
              setSaved(false);
              setError(null);
              setForm((f) => ({
                ...f,
                invoicePrefix: e.target.value.toUpperCase(),
              }));
            }}
            placeholder="INV"
            maxLength={10}
            className={`font-mono uppercase ${
              !prefixValid ? "border-red-400 focus-visible:ring-red-500" : ""
            }`}
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Numbering looks like {form.invoicePrefix.trim() || "INV"}-202608-0001. Defaults to INV when empty.
          </p>
        </div>
      </div>

      {/* Live branding preview — mirrors how clients see invoices on the
          public share page (/i/[token]). Re-renders instantly from the
          same form state as the fields above. */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">
          Live preview
        </p>

        {/* Invoice header: logo, business name, example number */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-4 min-w-0">
            {showLogoImage ? (
              // eslint-disable-next-line @next/next/no-img-element -- issuer-uploaded external logo URL; next/image would need remotePatterns config
              <img
                src={previewLogo}
                alt={previewName}
                className="w-12 h-12 rounded-lg object-cover shrink-0"
              />
            ) : (
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-lg font-bold shrink-0"
                style={{ backgroundColor: previewAccent }}
              >
                {previewName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                {previewName}
              </h3>
              <div
                className="h-1 w-20 mt-1 rounded-full transition-colors"
                style={{ backgroundColor: previewHex ?? FALLBACK_ACCENT }}
              />
            </div>
          </div>
          <div className="text-right shrink-0">
            <p
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: previewHex }}
            >
              Invoice
            </p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white font-mono">
              {previewPrefix}-0042
            </p>
          </div>
        </div>

        {/* Sample total line — accent applied only when the hex passes the
            public-page rule; otherwise neutral gray styling, exactly like
            /i/[token] renders an absent or invalid accent color. */}
        <div className="pt-3 flex flex-col items-end space-y-1">
          <div className="flex justify-between w-52 text-sm">
            <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
            <span className="text-gray-900 dark:text-white">$1,250.00</span>
          </div>
          <div
            className="flex justify-between w-52 text-base font-bold pt-2 border-t-2"
            style={{ borderTopColor: previewHex }}
          >
            <span className="text-gray-900 dark:text-white">Total</span>
            <span style={previewHex ? { color: previewHex } : undefined}>
              $1,375.00
            </span>
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
      {saved && !error && (
        <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1.5">
          <Check className="w-4 h-4" /> Profile saved
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving || !dirty || !logoValid || !accentValid || !prefixValid}>
          {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
          {saving ? "Saving…" : "Save changes"}
        </Button>
        {!dirty && !saved && (
          <span className="text-xs text-gray-400 dark:text-gray-500">No changes</span>
        )}
      </div>
    </form>
  );
}
