# Working on InvoiceFlow

Read PRODUCT.md for application truth and DESIGN.md for the approved visual system.

For frontend work, project-local guidance is available in .agents/skills:
- emil-design-eng/SKILL.md: interaction and motion craft.
- impeccable/SKILL.md: hierarchy, visual quality and interface review.
- taste-skill/SKILL.md: distinctive page/app composition and rendered inspection.
- frontend-design/SKILL.md: deliberate typography, layout and copy.

Preserve working financial behavior, ownership checks, public invoice links, keyboard navigation and draft contents during design work. Demonstration figures must be labeled as examples; workspace numbers come from the database.

Use Node22 and pinned pnpm. Verify changes with lint, typecheck, relevant unit/integration tests, a production build and actual browser workflows (`pnpm run test:browser`). Database and browser tests require only the disposable local invoiceflow_test database. Never point them at production. CI runs Chromium workflows after building.

The current redesign is being completed without delegation, as requested. Production releases go through GitHub main and Vercel's linked integration, not a direct sandbox deployment.
