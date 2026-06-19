# InvoiceFlow page.tsx — Mobile Responsiveness Fixes Needed

These issues are in `src/app/page.tsx` and require manual changes (not component files).

---

## 1. FAQ Accordion — Touch Target Too Small (LOW severity, accessibility)

**Location:** Lines 754-773 (FAQ `<details>` / `<summary>` elements)

**Issue:** The `<summary>` elements have no explicit padding or min-height. Their clickable area is only ~24px tall (equal to the text line-height), which is well under the 44px minimum touch target. While the parent `<details>` has `py-5`, that padding is outside the interactive `<summary>` element, so it doesn't count toward the touch target.

**Fix:**
```tsx
// Line 758 — Add py-3 and/or min-h-[44px] to the summary
<summary className="flex cursor-pointer items-center justify-between gap-4 text-left py-3 min-h-[44px]">
```

---

## 2. "Pro Tip" Banner — May Overflow at 375px (MEDIUM severity)

**Location:** Lines 114-124 (asymmetric dominance visual cue in `PricingToggleSection`)

**Issue:** The "Pro tip" box uses `inline-flex` with `px-5 py-3` and contains a long text string that won't wrap. At 375px viewport width (343px usable after section `px-4`), the tip box with its padding will be ~310px, and the text inside may overflow if it's wider than that. The `inline-flex` prevents wrapping.

**Fix:**
```tsx
// Line 115 — Change inline-flex to flex and add flex-wrap
<div className="flex flex-wrap items-center gap-2 rounded-lg bg-gray-50 dark:bg-[#1A1A1E] px-5 py-3 border border-gray-100 dark:border-gray-800">
```

Or alternatively, wrap the text in a `<span>` that can break:
```tsx
<p className="text-sm text-gray-600 dark:text-gray-400 text-balance">
```

---

## 3. Feature Card Description Text — Below 16px (LOW severity)

**Location:** Lines 527-528, 544-545, 561-562, 578-579 (feature card descriptions)

**Issue:** Feature card descriptions use `text-sm` (14px), which is below our 16px minimum for readable body text on mobile without zoom.

**Fix:**
```tsx
// Change text-sm to text-base (or text-sm sm:text-base) on all feature description <p> tags
// Example — line 527:
<p className="mt-2 text-base text-gray-600 dark:text-gray-400 leading-relaxed">
```

Apply to all four feature card description paragraphs.

---

## 4. Live Social Proof Counter — 14px Text (LOW severity)

**Location:** Line 97 (in `live-social-proof.tsx` component but rendered in page.tsx context)

**Issue:** `text-sm` (14px) for the "freelancers joined this week" text. Since this is a small badge/counter, it's acceptable but worth noting.

**Fix:** Change `text-sm` to `text-base` if you want strict adherence to the 16px rule.

---

## 5. Hero "No credit card" Disclaimer — 14px Text (LOW severity)

**Location:** Line 360-362

**Issue:** `text-sm text-gray-400` — the disclaimer text is 14px. This is auxiliary/legal text and conventionally smaller, so it's acceptable.

---

## Summary of Recommended Changes

| # | Issue | Lines | Priority | Effort |
|---|-------|-------|----------|--------|
| 1 | FAQ summary touch target | 758 | Low | 1 line |
| 2 | Pro tip box overflow | 115 | Medium | 1 class change |
| 3 | Feature card text size | 527-579 | Low | 4 occurrences |
| 4 | Social proof counter text | 97 | Low | Already in component file |
| 5 | Hero disclaimer text | 360 | Low | Acceptable as-is |
