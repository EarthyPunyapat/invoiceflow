"use client";
import { useState } from "react";
import { Check, CheckCheck, Send, FileText } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
const states = ["Draft", "Sent", "Paid"] as const;
const description = {
  Draft: "Start with the work. Add your client, line items and terms.",
  Sent: "Send one clear link. Your client can review the invoice without an account.",
  Paid: "Keep the payment and its invoice together. No guessing what came in.",
};
export function InvoiceDemo() {
  const [stage, setStage] = useState<(typeof states)[number]>("Draft");
  const subtotal = 1280;
  const tax = subtotal * 0.15;
  return (
    <div className="invoice-demo" data-ui>
      <div className="demo-toolbar">
        <span>Example invoice</span>
        <div className="demo-tabs" aria-label="Preview invoice status">
          {states.map((state) => (
            <button
              type="button"
              key={state}
              aria-pressed={stage === state}
              onClick={() => setStage(state)}
            >
              {state}
            </button>
          ))}
        </div>
      </div>
      <div className="demo-workspace">
        <div className="demo-context">
          <div className="demo-studio-mark">
            <span></span>
            <strong>Forma Studio</strong>
          </div>
          <p>
            Good work deserves
            <br />a clear finish.
          </p>
          <div className="demo-status-note" key={stage}>
            <span className="demo-state-icon">
              {stage === "Draft" ? (
                <FileText size={18} />
              ) : stage === "Sent" ? (
                <Send size={18} />
              ) : (
                <CheckCheck size={18} />
              )}
            </span>
            <h3>
              {stage === "Draft"
                ? "Make it yours."
                : stage === "Sent"
                  ? "Over to your client."
                  : "That’s a wrap."}
            </h3>
            <p>{description[stage]}</p>
          </div>
          <span className="demo-example-note">
            A preview, not a real payment.
          </span>
        </div>
        <div className="demo-document">
          <div className="demo-document-head">
            <div>
              <h2>Invoice</h2>
              <p>INV-2026-012</p>
            </div>
            <span
              className={`demo-document-status is-${stage.toLowerCase()}`}
              key={stage}
            >
              {stage === "Paid" && <Check size={14} />} {stage}
            </span>
          </div>
          <div className="demo-addresses">
            <div>
              <span>From</span>
              <strong>Forma Studio</strong>
              <p>Brand & digital design</p>
            </div>
            <div>
              <span>Bill to</span>
              <strong>Northstar Studio</strong>
              <p>hello@northstar.example</p>
            </div>
          </div>
          <div className="demo-line">
            <span>Website design</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <dl className="demo-totals">
            <div>
              <dt>Subtotal</dt>
              <dd>{formatCurrency(subtotal)}</dd>
            </div>
            <div>
              <dt>Tax (15%)</dt>
              <dd>{formatCurrency(tax)}</dd>
            </div>
            <div className="demo-grand-total">
              <dt>{stage === "Paid" ? "Total paid" : "Amount due"}</dt>
              <dd>{formatCurrency(subtotal + tax)}</dd>
            </div>
          </dl>
          <div className="demo-document-footer">
            <span>
              {stage === "Paid"
                ? "Payment recorded. Thank you."
                : stage === "Sent"
                  ? "Your payment link is ready to share."
                  : "A little detail. A better impression."}
            </span>
            <span>InvoiceFlow</span>
          </div>
        </div>
      </div>
    </div>
  );
}
