---
name: InvoiceFlow
description: The duplicate invoice book, rebuilt so the top copy goes to your client and the carbon stays with you.
colors:
  desk: "#e9edf7"
  desk-deep: "#dce2f2"
  paper: "#ffffff"
  canary: "#ffd83d"
  canary-soft: "#fff3b8"
  pink: "#ff8fb1"
  pink-soft: "#ffd6e3"
  carbon: "#2b3a8f"
  carbon-deep: "#1f2b70"
  ink: "#1b2350"
  typed: "#1b1b22"
  stamp: "#d7263d"
  stamp-deep: "#b01e33"
  app-primary: "#245b45"
  app-primary-deep: "#194431"
  app-canvas: "#f7f8f4"
  app-surface: "#ffffff"
  app-ink: "#1c2923"
  app-secondary: "#59645d"
  app-edge: "#dce1d9"
typography:
  display:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(3.1rem, 6.3vw, 5.6rem)"
    fontWeight: 800
    lineHeight: 0.93
    letterSpacing: "-0.035em"
  heading:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(2.2rem, 4.4vw, 3.9rem)"
    fontWeight: 800
    lineHeight: 0.98
    letterSpacing: "-0.03em"
  form-header:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(1.15rem, 2vw, 1.6rem)"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "0.04em"
  label:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "0.05em"
  serial:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1.15rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.06em"
  typed:
    fontFamily: "Courier Prime, ui-monospace, monospace"
    fontSize: "clamp(1.05rem, 1.4vw, 1.22rem)"
    fontWeight: 400
    lineHeight: 1.3
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
  app-body:
    fontFamily: "Manrope, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.55
rounded:
  paper: "4px"
  binding: "6px"
  app-control: "6px"
  app-sheet: "10px"
spacing:
  row: "7px"
  ply: "30px"
  gutter: "clamp(20px, 4.5vw, 56px)"
  section: "clamp(80px, 11vw, 148px)"
  app-canvas: "40px"
components:
  button-stub:
    backgroundColor: "{colors.carbon}"
    textColor: "{colors.paper}"
    rounded: "{rounded.paper}"
    height: "52px"
    padding: "0 30px"
  button-stub-hover:
    backgroundColor: "{colors.carbon-deep}"
  button-stub-small:
    backgroundColor: "{colors.carbon}"
    textColor: "{colors.paper}"
    rounded: "{rounded.paper}"
    height: "40px"
  button-stamp:
    backgroundColor: "{colors.stamp}"
    textColor: "{colors.paper}"
    rounded: "{rounded.paper}"
    height: "44px"
  input-typed:
    textColor: "{colors.typed}"
    typography: "{typography.typed}"
  ply-top:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.typed}"
    padding: "30px 32px 26px"
  ply-canary:
    backgroundColor: "{colors.canary}"
    textColor: "{colors.carbon}"
  app-button-primary:
    backgroundColor: "{colors.app-primary}"
    textColor: "{colors.app-surface}"
    rounded: "{rounded.app-control}"
    height: "40px"
---

# Design System: InvoiceFlow

## Overview

**The Duplicate Invoice Book.** The public site — landing, sign-in, privacy and terms, and the invoice a client opens from a link — is built as the carbonless invoice book a freelancer keeps in the van: white top copy, canary and pink carbons, a carbon-blue binding, pre-printed form lettering, typed entries, red serial numbers and rubber stamps. The owner chose this world on 4 November 2026 to replace the earlier warm-white and green look, which read as generic and too quiet.

The world carries the page; it never decorates a template. The landing's first viewport is a working three-ply docket: you type on the top copy, the entries carbon through to the canary copy, you tear the top copy off to send it, and a PAID stamp lands on the copy you keep. Sections below stay on the same paper: a counterfoil ledger for how money comes in, filed pink copies for records, a canary price slip, FAQ slips and a closing stub. Legal pages and the public invoice are Read surfaces: one legible printed sheet each.

**Scope.** The logged-in workspace still uses the previous system (Manrope, `app-*` tokens: warm canvas, dark ink, restrained evergreen, 232px sidebar). It is recorded here unchanged and is the next surface to move into the docket world. The `/api-docs` and `/sdk` pages also still use the previous marketing stylesheet.

## Colors

Restrained-but-saturated: the paper plies are full-strength colour fields, and each ink has one job.

### Primary
- **Carbon blue** (`carbon` #2b3a8f, `carbon-deep` #1f2b70): everything pre-printed — form headers, labels, rules, the binding, primary stub buttons, focus rings.

### Secondary
- **Stamp red** (`stamp` #d7263d, `stamp-deep` #b01e33): serial numbers and rubber stamps only — the moments money moves. `stamp-deep` is used for serials on canary, where `stamp` falls under 4.5:1.

### Tertiary
- **Canary** (`canary` #ffd83d, `canary-soft` #fff3b8) and **pink** (`pink` #ff8fb1, `pink-soft` #ffd6e3): the carbon copies you keep — canary copy, filed pink copies, the price slip. Soft tints are for highlight fields and secondary filed copies.

### Neutral
- **Desk** (`desk` #e9edf7, `desk-deep` #dce2f2): the page ground, a pale carbon-blue with fibre grain — never cream.
- **Paper** (`paper` #ffffff): top copies, ledgers, legal sheets, the public invoice.
- **Ink** (`ink` #1b2350) for running copy on the desk; **typed** (`typed` #1b1b22) for entries on paper.

### Named Rules
- **One ink, one job.** Blue prints the form, red marks money moving, typewriter ink records the entries, canary and pink are copies you keep. Never use red for decoration or blue for a stamp.
- **Stamps never cover figures.** A stamp lands in blank paper; amounts and totals stay fully legible in every state and width.

## Typography

Two faces, both self-hosted through `next/font` and scoped to public pages: **Archivo** (variable width) for anything printed on the form, **Courier Prime** for anything typed onto it. The app keeps Manrope.

### Hierarchy
- **Display** — hero headline, Archivo 800 at 86% width, `clamp(3.1rem, 6.3vw, 5.6rem)`, line-height 0.93, tracking −0.035em.
- **Heading** — section headlines, Archivo 800 at 88% width, `clamp(2.2rem, 4.4vw, 3.9rem)`.
- **Form header** — "TAX INVOICE", "INVOICE": Archivo 800 at 125% width, uppercase, +0.04em. Lives on the paper object, never above a page heading.
- **Label** — field labels, 12–12.5px Archivo 700 uppercase, +0.05em.
- **Serial** — Archivo 700 at 80% width, tabular figures, +0.06em, in stamp red.
- **Typed** — Courier Prime for entries, amounts, ledger lines and FAQ answers; monospaced, so figures align.
- **Body** — Archivo 16px / 1.55; legal sheets 16px / 1.68 at a 68ch measure.

### Named Rules
- **Typed is for entries, not reading.** Courier Prime sets entries, data and short answers; long reading copy (legal pages, ledes) stays in Archivo.

## Layout

Shared 1240px canvas with `clamp(20px, 4.5vw, 56px)` gutters and `clamp(80px, 11vw, 148px)` between sections. Hero: copy column at 0.74fr beside the docket at 1.12fr; on desktop the docket runs into the right margin, tilted −2°, like an object on the desk. Two-column sections (counterfoil, records, FAQ) collapse to one column at 1024px; at 600px, rows reflow and tilts soften. The public invoice hides Qty and Price columns on phones and shows "qty × price" under each description, so totals never scroll out of view. The page never scrolls sideways.

App workspace (unchanged): 232px sidebar, 40px gutters, 1340px maximum width; 24px gutters on tablet, 18px on phone.

## Elevation & Depth

Paper on a desk: flat sheets, one soft stack shadow where plies overlap, deeper for the sheet underneath. No glass, glows, gradients-as-decoration or hard offset shadows.

### Shadow Vocabulary
- Top copy / ledger: `0 3px 10px rgba(31, 43, 112, 0.1)`.
- Canary copy / filed copy: `0 6px 18px rgba(31, 43, 112, 0.12)`.
- Pink ply (bottom of stack): `0 10px 28px rgba(31, 43, 112, 0.18)`.
- Standalone slips (price, sign-in): `0 6px 22px rgba(31, 43, 112, 0.14)`; masked sheets use the same as a `drop-shadow` filter.

## Shapes

Paper corners at 4px; the binding's top corners at 6px. Perforations are rows of small holes; torn edges are half-holes along the edge. Primary actions are ticket stubs with semicircle notches on both ends and a dashed tear line. Stamps are double-ruled boxes with uneven ink. App controls keep 6px, app sheets 10px.

## Components

### Buttons
- **Stub button** (`button-stub`): carbon fill, white Archivo 800, notched ends, dashed tear line inside the left notch; hover `carbon-deep`, press moves down 1px. Small variant in the header.
- **Tear button**: full-width carbon bar on the top copy, a dashed tear mark before the label.
- **Stamp button** (`button-stamp`): red fill for the one in-demo money action ("Client pays by card"); quiet outlined variant for "Write another".

### Inputs / Fields
- **Typed field** (`input-typed`): transparent, a dotted carbon rule beneath, Courier Prime entry; hover tints canary, focus fills canary-soft with a solid carbon rule. Labels are real `<label>`s in the label style.

### Navigation
- Header: carbon-blue wordmark (document mark plus Archivo 800), section anchors, Sign in, small stub. Footer on a carbon rule.

### Docket (signature component)
- Binding strip, three plies stacked in one grid cell (pink stretches, canary carries extra blank paper for stamps, top copy editable), perforation along the top, form header and serial, typed fields, totals with a double rule. States: draft → sent (top copy lifts off along the perforation, 420ms, leaving a torn stub) → paid (stamp lands 1.25→1, 220ms). The canary copy's action row sits where the top copy's tear button was, so each next step ("Client pays by card", then "Write another") appears under the pointer; stamps land in the blank paper below it. Each step moves focus to the next control without scrolling the page (it only nudges the page if that control is off-screen) and is announced in a live region; reduced motion makes every change instant.

### Rubber stamp
- Double-ruled red box, Archivo 800 at 122% width, multiply blend, ink texture from a noise mask, slight tilt.

## Do's and Don'ts

### Do:
- Do label every demonstration "Example invoice" or "Example records"; workspace numbers come from the database.
- Do keep amounts crisp: no grain, blur or stamp over a figure on any surface.
- Do theme the browser surfaces from the palette: selection canary, caret red, focus ring carbon, scrollbar carbon on desk-deep.
- Do preserve a freelancer's own accent on their public invoice (rules and the total's double rule), never on text where a pale accent would fail contrast.

### Don't:
- Don't put a label or eyebrow above a heading; form headers belong on the paper object.
- Don't drift toward cream, beige or lamplight grounds; the desk is cool carbon-blue.
- Don't use stock photography, icon tiles or glyphs as icons; icons are lucide or authored SVG.
- Don't invent customers, endorsements, statistics or prices beyond US$9/month after a 14-day free trial.
