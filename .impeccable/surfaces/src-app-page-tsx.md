---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: ["src/app/login/page.tsx","src/app/(legal)/privacy/page.tsx","src/app/(legal)/terms/page.tsx","src/app/i/[token]/page.tsx"]
---

# Public site — surface brief

Scope: the public site — landing (`/`), sign-in (`/login`), legal (`/privacy`, `/terms`) and the public invoice a client opens (`/i/[token]`). The workspace keeps its current look until a later round extends this world. Mode: Persuade for landing and sign-in; Read for legal and the public invoice.

Audience and job: freelancers and small service businesses who finished the work and want the money. Action: start the 14-day free trial (Google sign-in). Proof: the product's real mechanism shown working on a labeled example invoice; no endorsements, counts or logos exist. Constraints: price US$9/month after 14 days, Stripe fees apply, existing invoices stay payable; FAQ answer for "What does it cost?" is fixed copy; keyboard access, reduced motion, honest labels.

Chosen direction: Carbon Copy Docket (owner chose it over the rolled Riso Pressroom, 4 Nov 2026). Memorable moment: tearing the top copy off along the perforation to send it, then the rubber PAID stamp landing on the canary copy you keep.

Unresolved: final domain; whether the workspace adopts the docket world next.

## Direction contract

THESIS: The site is the duplicate invoice book a freelancer keeps in the van — the top copy goes to the client, the carbon stays with you, and a rubber stamp says PAID. It refuses the category default: headline and button beside an app screenshot over a row of feature cards.

OWN-WORLD: Carbonless paper in three plies — white top copy, canary #FFD83D, pink #FF8FB1 — on a pale carbon-blue desk #E9EDF7. Pre-printed form rules and labels in carbon blue #2B3A8F; numbering-machine serials and the PAID/SENT rubber stamps in red #D7263D; typed entries in a typewriter face; headings in a heavy grotesque like a printed form header. Perforated tear lines, stub columns, ruled boxes; flat paper, one soft stack shadow only where sheets overlap.

STORY: A visitor recognises their own invoice book, sees that sending is one tear and getting paid is a stamp, learns it costs US$9/month after 14 days free with payments going straight to their Stripe, and starts the free trial.

FIRST VIEWPORT: Left 40%: no label above it — headline "Do the work. Tear. Get paid." in heavy grotesque, one-line subcopy, primary action "Start free — 14 days" as a filled carbon-blue stub with red serial, price line under it. Right 60%: the three-ply docket stack at life size, slightly rotated, its own pre-printed "TAX INVOICE" header and red serial on the top copy, which is editable (client, line, amount), "Tear off & send" on the perforation, labeled "Example invoice".

FORM: Carbon Copy Docket — position 1 of my ordered list (the owner chose the pick card over the rolled position 4). seed:09c4b34de4071aa2

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Signature interaction and motion grammar: tear (top copy lifts along the perforation and slides off with a slight rotation, 420ms ease-out), stamp (SENT then PAID land with a 1.25→1 scale, 2° tilt and ink settle, 220ms), carbon reveal (the canary copy shows the same entries in carbon blue as they are typed). Every state reachable by keyboard and announced; reduced motion swaps to instant state changes.
