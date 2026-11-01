/** Reporting never converts currencies or adds totals from different currencies. */
export function normalizeReportCurrency(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) return null;
  return Intl.supportedValuesOf("currency").includes(code) ? code : null;
}

export function reportCurrencyOptions(available: string[]): string[] {
  return [...new Set(available.map(normalizeReportCurrency).filter((code): code is string => code !== null))].sort();
}

export function selectReportCurrency(requested: unknown, available: string[]): string {
  const options = reportCurrencyOptions(available);
  const code = normalizeReportCurrency(requested);
  if (code && options.includes(code)) return code;
  return options.includes("USD") ? "USD" : options[0] || "USD";
}
