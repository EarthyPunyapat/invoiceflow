/**
 * InvoiceFlow agent client — zero dependencies, Node 18+ (global fetch).
 *
 * Auth: one bearer key from Settings -> API keys (https://<app>/settings).
 *       Authorization: Bearer ifk_<...>
 *
 * Every method throws InvoiceFlowError on a non-2xx response, so a caller can
 * never silently treat a failure as success.
 */

export class InvoiceFlowError extends Error {
  constructor(status, body) {
    const detail =
      body && typeof body === "object" && body.error
        ? body.error
        : typeof body === "string"
        ? body.slice(0, 200)
        : `HTTP ${status}`;
    super(`${status} ${detail}`);
    this.name = "InvoiceFlowError";
    this.status = status;
    this.body = body;
  }
}

export class InvoiceFlowClient {
  /**
   * @param {{apiKey: string, baseUrl?: string, fetchImpl?: Function}} opts
   */
  constructor({ apiKey, baseUrl = "https://invoiceflow-ten-azure.vercel.app", fetchImpl } = {}) {
    if (!apiKey || typeof apiKey !== "string") {
      throw new Error("apiKey is required");
    }
    if (!/^ifk_/.test(apiKey)) {
      throw new Error('apiKey must start with "ifk_"');
    }
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.fetchImpl = fetchImpl ?? globalThis.fetch;
    if (typeof this.fetchImpl !== "function") {
      throw new Error("no fetch available; pass fetchImpl");
    }
  }

  async #req(method, path, { body, query, raw = false } = {}) {
    const url = new URL(this.baseUrl + path);
    for (const [k, v] of Object.entries(query ?? {})) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
    const headers = { Authorization: `Bearer ${this.apiKey}` };
    let payload;
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }

    const res = await this.fetchImpl(url.toString(), {
      method,
      headers,
      body: payload,
      redirect: "manual",
    });

    if (raw) {
      if (!res.ok) throw new InvoiceFlowError(res.status, await res.text().catch(() => ""));
      return res;
    }

    const text = await res.text();
    let parsed = text;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      /* non-JSON body stays a string */
    }
    if (!res.ok) throw new InvoiceFlowError(res.status, parsed);
    return parsed;
  }

  /** Confirm the key works and report which account it maps to. */
  me() {
    return this.#req("GET", "/api/dashboard/stats");
  }

  // ---- invoices ----------------------------------------------------------
  listInvoices(query) {
    return this.#req("GET", "/api/invoices", { query });
  }
  getInvoice(id) {
    return this.#req("GET", `/api/invoices/${encodeURIComponent(id)}`);
  }
  createInvoice(invoice) {
    return this.#req("POST", "/api/invoices", { body: invoice });
  }
  updateInvoice(id, patch) {
    return this.#req("PATCH", `/api/invoices/${encodeURIComponent(id)}`, { body: patch });
  }
  deleteInvoice(id) {
    return this.#req("DELETE", `/api/invoices/${encodeURIComponent(id)}`);
  }
  sendInvoice(id) {
    return this.#req("POST", `/api/invoices/${encodeURIComponent(id)}/send`, { body: {} });
  }
  shareInvoice(id) {
    return this.#req("POST", `/api/invoices/${encodeURIComponent(id)}/share`, { body: {} });
  }
  /** Returns the raw Response so the caller can stream or write the PDF. */
  invoicePdf(id) {
    return this.#req("GET", `/api/invoices/${encodeURIComponent(id)}/pdf`, { raw: true });
  }

  // ---- clients -----------------------------------------------------------
  listClients(query) {
    return this.#req("GET", "/api/clients", { query });
  }
  getClient(id) {
    return this.#req("GET", `/api/clients/${encodeURIComponent(id)}`);
  }
  createClient(client) {
    return this.#req("POST", "/api/clients", { body: client });
  }
  updateClient(id, patch) {
    return this.#req("PATCH", `/api/clients/${encodeURIComponent(id)}`, { body: patch });
  }

  // ---- estimates ---------------------------------------------------------
  listEstimates(query) {
    return this.#req("GET", "/api/estimates", { query });
  }
  createEstimate(estimate) {
    return this.#req("POST", "/api/estimates", { body: estimate });
  }
  convertEstimate(id) {
    return this.#req("POST", `/api/estimates/${encodeURIComponent(id)}/convert`, { body: {} });
  }

  // ---- exports (CSV) -----------------------------------------------------
  exportInvoices(query) {
    return this.#req("GET", "/api/export/invoices", { query, raw: true });
  }
  exportClients(query) {
    return this.#req("GET", "/api/export/clients", { query, raw: true });
  }
}
