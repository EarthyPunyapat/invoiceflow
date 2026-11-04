"use client";

import { useEffect, useId, useRef, useState } from "react";
import { formatCurrency } from "@/lib/utils";

type Stage = "draft" | "sent" | "paid";

const TAX_RATE = 0.15;

function stampDate() {
  return new Intl.DateTimeFormat("en-NZ", { day: "numeric", month: "short", year: "numeric" })
    .format(new Date())
    .toUpperCase();
}

/**
 * The landing page's working example: a three-ply invoice docket. Typing on
 * the top copy carbons through to the canary copy; tearing the top copy off
 * sends it, and paying stamps the copy you keep. Nothing is sent anywhere.
 */
export function DocketBook() {
  const id = useId();
  const [stage, setStage] = useState<Stage>("draft");
  const [client, setClient] = useState("Northstar Studio");
  const [work, setWork] = useState("Website design");
  const [amount, setAmount] = useState("1280");
  const [paidOn, setPaidOn] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const nextControl = useRef<HTMLButtonElement>(null);
  const topCopy = useRef<HTMLFormElement>(null);

  // React 18 has no inert prop; the torn-off copy must leave the tab order.
  useEffect(() => {
    if (topCopy.current) topCopy.current.inert = stage !== "draft";
  }, [stage]);

  const subtotal = Math.max(0, Number.parseFloat(amount) || 0);
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = subtotal + tax;
  const billTo = client.trim() || "Your client";
  const forWork = work.trim() || "The work";

  // Each step's next control appears where the last one was, so moving focus
  // must not scroll the page. Only nudge it if the control is off-screen.
  // The control is looked up after the next paint, once React has rendered it.
  const focusInPlace = (find: () => HTMLElement | null) =>
    requestAnimationFrame(() => {
      const element = find();
      if (!element) return;
      element.focus({ preventScroll: true });
      const { top, bottom } = element.getBoundingClientRect();
      if (top < 0 || bottom > window.innerHeight) element.scrollIntoView({ block: "nearest" });
    });
  const focusNext = () => focusInPlace(() => nextControl.current);

  function send() {
    setStage("sent");
    setAnnouncement(`Top copy torn off and sent to ${billTo}. The canary copy stays with you.`);
    focusNext();
  }
  function pay() {
    setPaidOn(stampDate());
    setStage("paid");
    setAnnouncement(`${billTo} paid ${formatCurrency(total)} by card. Stamped paid.`);
    focusNext();
  }
  function reset() {
    setStage("draft");
    setPaidOn("");
    setAnnouncement("A fresh top copy is ready.");
    focusInPlace(() => document.getElementById(`${id}-client`));
  }

  const lines = (
    <>
      <div className="ply-row">
        <span className="ply-label">Bill to</span>
        <span className="ply-typed">{billTo}</span>
      </div>
      <div className="ply-row">
        <span className="ply-label">For</span>
        <span className="ply-typed">{forWork}</span>
      </div>
    </>
  );
  const totals = (
    <dl className="ply-totals">
      <div>
        <dt>Subtotal</dt>
        <dd>{formatCurrency(subtotal)}</dd>
      </div>
      <div>
        <dt>Tax 15%</dt>
        <dd>{formatCurrency(tax)}</dd>
      </div>
      <div className="docket-total">
        <dt>{stage === "paid" ? "Total paid" : "Amount due"}</dt>
        <dd>{formatCurrency(total)}</dd>
      </div>
    </dl>
  );

  return (
    <div className="docket" data-stage={stage}>
      <div className="docket-binding" aria-hidden="true">
        <span>Invoice book</span>
        <span>Duplicate</span>
      </div>
      <div className="torn-stub" aria-hidden="true" />
      <div className="docket-plies">
        <div className="ply ply-pink" aria-hidden="true" />

        <section className="ply ply-canary" aria-label="Your canary copy">
          <header className="ply-head">
            <span className="ply-title">Tax invoice</span>
            <span className="ply-serial">No. 0014</span>
          </header>
          <p className="ply-copy-note">Customer copy kept in book</p>
          {lines}
          {totals}
          {/* Sits where the top copy's tear button was, so each next step is under the pointer. */}
          <div className="ply-next">
            {stage === "sent" && (
              <button ref={nextControl} type="button" className="docket-action" onClick={pay}>
                Client pays by card
              </button>
            )}
            {stage === "paid" && (
              <button ref={nextControl} type="button" className="docket-action is-quiet" onClick={reset}>
                Write another
              </button>
            )}
          </div>
          <p className="ply-carbon-strip" aria-hidden="true">
            <span>Carbon copy</span>
            <span>Amount due {formatCurrency(total)}</span>
          </p>
          <span className="stamp stamp-sent" aria-hidden={stage === "draft"}>
            Sent
          </span>
          <span className="stamp stamp-paid" aria-hidden={stage !== "paid"}>
            Paid
            {paidOn && <small>{paidOn}</small>}
          </span>
        </section>

        <form
          ref={topCopy}
          className="ply ply-top"
          aria-label="Example invoice, top copy"
          aria-hidden={stage !== "draft"}
          onSubmit={(event) => {
            event.preventDefault();
            send();
          }}
        >
          <div className="perforation" aria-hidden="true" />
          <header className="ply-head">
            <span className="ply-title">Tax invoice</span>
            <span className="ply-serial">No. 0014</span>
          </header>
          <div className="ply-row">
            <label className="ply-label" htmlFor={`${id}-client`}>
              Bill to
            </label>
            <input
              id={`${id}-client`}
              className="ply-input"
              value={client}
              maxLength={40}
              onChange={(event) => setClient(event.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="ply-row">
            <label className="ply-label" htmlFor={`${id}-work`}>
              For
            </label>
            <input
              id={`${id}-work`}
              className="ply-input"
              value={work}
              maxLength={40}
              onChange={(event) => setWork(event.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="ply-row">
            <label className="ply-label" htmlFor={`${id}-amount`}>
              Amount (US$)
            </label>
            <input
              id={`${id}-amount`}
              className="ply-input ply-amount"
              inputMode="decimal"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>
          {totals}
          <button type="submit" className="tear-button">
            Tear off &amp; send
          </button>
        </form>
      </div>

      <div className="docket-controls">
        <p className="docket-example">Example invoice. Nothing is sent or charged.</p>
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}
