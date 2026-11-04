---
name: InvoiceFlow
description: A calm, precise workspace for independent work.
colors:
  primary: "#245b45"
  primary-deep: "#194431"
  canvas: "#f7f8f4"
  surface: "#ffffff"
  ink: "#1c2923"
  secondary: "#59645d"
  edge: "#dce1d9"
typography:
  display:
    fontFamily: "Manrope, sans-serif"
    fontSize: "clamp(64px, 6.7vw, 94px)"
    fontWeight: 500
    lineHeight: 0.99
    letterSpacing: "-0.04em"
  title:
    fontFamily: "Manrope, sans-serif"
    fontSize: "28px"
    fontWeight: 600
  body:
    fontFamily: "Manrope, sans-serif"
    fontSize: "15px"
    lineHeight: 1.55
rounded:
  control: "6px"
  sheet: "10px"
spacing:
  small: "8px"
  medium: "16px"
  group: "24px"
  canvas: "40px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    height: "40px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "40px"
---
# InvoiceFlow design system

## Overview
A calm working ledger: warm-white canvas, dark ink, restrained evergreen. The user approved this direction for a full replacement of the previous indigo/glass appearance. Preserve application data, actions, routes and ownership rules. Implement in the existing Next.js/Tailwind stack and inspect the actual production browser build. Complete this redesign without delegation.

Landing: Persuade, with an interactive example invoice as its main visual proof. Workspace: Operate, with a labeled sidebar, a shared summary strip and real invoice rows. Login: one focused sign-in action. Public invoice: a legible financial document.

## Colors
Use the frontmatter palette and matching Tailwind gray/primary ramps. Color communicates invoice state and the primary action. Secondary text must remain readable against its actual background. Preserve customer-selected invoice accents; the design system is the fallback.

## Typography
Manrope is the one family for UI and public pages, loaded through next/font and self-hosted by the build. Marketing headlines are confident and left-aligned; app headings remain compact. Figures use tabular numerals. Sentence case, with no decorative eyebrows or artificially tracked all-cap labels. Chart labels use HTML text so they stay readable as the chart scales.

## Layout
Desktop workspace: 232px sidebar, fluid content with 40px gutters, 1340px maximum outer content width. Tablet: 24px gutters and mobile navigation. Phone: 18px gutters, compact header and native dialog navigation. Tables scroll within their own container when necessary; invoice numbers and amounts stay together. Marketing content shares a centered 1240px canvas, with 48/32/20px minimum gutters across desktop/tablet/phone.

## Elevation & Depth
Flat surfaces. Floating overlays may cast shadows; working records and summary figures do not. No glass, decorative gradients, glowing surfaces or KPI icon tiles.

## Shapes
Buttons and controls have 6px radii; content sheets use 10px. Invoice states use compact rectangular badges. Avatars alone use circles. Keep the document mark and single-color wordmark consistent with the favicon.

## Components
- Summary strips: four equal columns on desktop, two on phones; explicit labels, tabular figures and one selected reporting currency.
- Client picker: inline creation selects the saved client, retains the invoice/estimate draft, and exposes loading, retry and session-expiry states.
- Navigation: native dialog supplies focus containment and Escape; sign-out goes through Auth.js rather than a raw request missing CSRF.
- Marketing invoice: Draft/Sent/Paid buttons expose aria-pressed. Totals are computed from visible line items and tax. Every demonstration is labeled as an example.
- Motion: invoice state feedback responds to visitors; app navigation is immediate. Controls use 140–180ms feedback with an ease-out curve. Respect reduced motion and never hide content pending entrance JavaScript.
- Settings: the plan comes first (trial days left, Pro renewal or end date, payment failure) with one real Subscribe or Manage billing action, then business profile and Stripe actions. No dead upgrade or placeholder settings links. The workspace shows a single plan notice only when the trial has three days or fewer left, has ended, or a payment failed.

## Do's and Don'ts
Do preserve financial precision, ownership boundaries, keyboard navigation and drafts. Do use synthetic data only in labeled examples. Do inspect rendered desktop, tablet and phone layouts.

Do not fabricate customers, testimonials, pricing, business statistics or payment processing. Do not add stock photographs, autoplay footage or scroll entrance effects merely to satisfy a design meter. The user's restrained finance-tool direction and purposeful-motion guidance take precedence.

Project-local guidance and source revisions are recorded in [.agents/skills/SOURCES.md](.agents/skills/SOURCES.md). Impeccable's external roll service was unreachable; the user's approved direction takes precedence. Taste's product-performs direction supplies the interface demonstration. Its achromatic-ledger app direction replaces an initial pastel-consumer draw because this is a working finance tool. The user's no-delegation instruction takes precedence over reviewer-agent workflows.
