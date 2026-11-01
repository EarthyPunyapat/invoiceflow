# InvoiceFlow interface review

The approved direction is a quiet finance workspace: warm white, dark ink,
restrained green, crisp records and purposeful motion. The redesign was completed
without delegating work, as requested. This is a rendered self-review, not an
independent review or a claim that the live deployment was verified.

| Before | After | Why |
| --- | --- | --- |
| Indigo gradients, glass surfaces and decorative glow | Flat warm canvas, white documents and evergreen actions | Give financial records a stable hierarchy |
| Generic feature grid and oversized marketing chrome | “Good work. Paid for.” with an interactive, labeled example invoice | Let the product explain its purpose |
| Decorative KPI cards with repeated colored icons | One summary strip across Overview and Reports | Make amounts easier to compare |
| Dashboard amount/status cells stacked and the phone document overflowed | Semantic table cells, tabular figures and internal table scrolling | Keep records aligned without widening the page |
| Repeated desktop headers and duplicate account controls | Labeled sidebar and one working canvas | Leave space for the task |
| Mobile navigation lacked native focus containment and used a raw sign-out POST | Native dialog with Escape/focus restoration and Auth.js sign-out | Support keyboard navigation and correct session handling |
| New Invoice had no clear path to add a missing client | Inline client creation with automatic selection and draft preservation | Complete the task without leaving the form; retained from the preceding fix |
| Tablet hero wrapped to three lines | Responsive display size keeps the intended two-line title | Preserve hierarchy at intermediate widths |
| SVG month labels shrank with the chart | HTML month labels keep their reading size and align to chart bars at every width | Keep reports legible and accurately labeled |
| Invoice action text wrapped inside fixed-height buttons | Single-line labels, wrapping action groups and a browser clipping check | Keep actions readable and reachable |
| Tablet detail actions squeezed invoice titles | Detail headers stack before desktop widths | Keep the record identifier readable |
| Settings offered a dead Pro upgrade and placeholder settings | Working profile/Stripe settings and an honest early-access explanation | Make the available actions clear |
| Separate blue/yellow document badges | Shared restrained status badges | Keep invoice lists, detail views and public invoices consistent |

## Rendered checks

The production build is exercised in Chromium using isolated accounts and a
locally signed session against disposable PostgreSQL. It does not bypass route
ownership or replace API/database behavior with a mocked UI.

The design suite captures 13 routes at 1440, 768 and 390px: landing, login,
Overview, invoices, new invoice, invoice detail, estimates, new estimate,
estimate detail, clients, reports, settings and public invoice. It verifies
visible headings, loaded Manrope fonts, document overflow and unclipped workspace
button labels. It also checks the alignment of chart bars and month labels. Captures use synthetic test records.

Separate browser workflows cover standalone and inline client creation, invoice
and estimate persistence, retry/session errors, validation and mobile entry.
Keyboard checks exercise the example invoice, FAQ, reduced-motion preference,
mobile dialog Escape/focus restoration, navigation and sign-out.

Representative captures are in [images/redesign-landing.png](images/redesign-landing.png)
and [images/redesign-dashboard.png](images/redesign-dashboard.png). All 39 local
captures are generated under `/tmp/invoiceflow-design-after` by default; use
`DESIGN_CAPTURE_DIR` to choose another location.

## Design-tool findings and decisions

- Impeccable's source detector returned no findings for the main landing,
  dashboard, shell and demonstration components before the final polish batch.
- Taste inspection found no document overflow or low-contrast text in the landing
  and dashboard render. It correctly identified the tablet title wrap and small
  secondary text; these were adjusted in the polish pass.
- Taste's marketing meter also requests four or more photographs, footage,
  numerous entrance animations and no FAQ divider lines. Those requirements are
  intentionally not adopted: the user approved a restrained finance tool, the
  live interface is its strongest demonstration, and Emil's guidance favors
  purposeful motion. Quiet FAQ separators help scan expandable questions.
  The meter is not represented as passing all of its stylistic rules.
- The supplemental file-based dashboard inspection reported a font-loading
  warning. The actual authenticated production routes load the self-hosted font;
  the browser tests explicitly verify loaded Manrope font faces. That snapshot
  warning is not evidence of production font loading failure.
- Impeccable's external concept-roll service was unreachable. The user's approved
  palette and composition constrained the work. Taste's `product-performs`
  direction and `achromatic-ledger` app direction informed the implementation;
  an initial pastel consumer draw was incompatible with the approved finance
  brief. Source revisions and licenses live in
  [.agents/skills/SOURCES.md](../.agents/skills/SOURCES.md).

External Google OAuth, Resend delivery and Stripe payment completion still
require the deployed test-mode journey described in [DEPLOYMENT.md](DEPLOYMENT.md).
Local browser sessions establish UI behavior, not provider credential validity.
