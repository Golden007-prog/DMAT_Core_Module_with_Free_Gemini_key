# Changelog

## 2.0.0 — 2026-07-18 · CoreForge covers the complete dMAT

### General Academic Module (new)
- 16 original passages / 105 questions across all eight official topic areas,
  every answer key independently re-verified before shipping; passage-based
  runner with a desktop split view and a mobile passage/question toggle,
  KaTeX math, tables, and themeable SVG figures.
- Topic drills, timed sets, the full 90:00 GAM exam (balanced blueprint draw,
  labeled as modeled on the official samples), and the complete ~3.5-hour
  full-dMAT simulation: Core → official 30-minute module break → GAM, with a
  combined per-module result and a clearly-labeled indicative 0–200 figure.
- Review, mistakes notebook, same-seed retries, analytics (accuracy by topic
  area, GAM pacing), points, leagues, and achievements all understand GAM.
- Optional Gemini generation of brand-new passages (own key), firewalled by
  the same validator as the seed bank plus an anti-plagiarism overlap check;
  validated passages persist offline and feed a community passage pool.
  Everything falls back to the built-in bank with no key and no cloud.

### "Do I need the dMAT?" (new)
- Public `/dmat-info` page with the complete official v1.0 affected-fields
  list (all 129 Engineering branches, every Commerce and Business entry, and
  the separate-assessment / not-automatically-covered sections) as a fuzzy
  checker that never tells anyone they are "safe", plus dates, fees,
  exemptions, timeline, and FAQ.

### Site-wide
- Two-module navigation (TopBar module switcher, reordered bottom tabs),
  rewritten landing page, per-route titles, Open Graph / JSON-LD / sitemap.
- Route-level code splitting (KaTeX and the passage bank load on demand,
  react/supabase vendor chunks), skeleton loading states, error-retry states,
  Settings reorganized into six anchored sections.
- Accessibility pass: AA-contrast dark-mode accent text token, once-only
  screen-reader timer warnings, working skip-to-content focus, heading-order
  repairs, 44 px touch targets, ≥16 px inputs.
- Mobile: card-list history, five-viewport Playwright matrix asserting zero
  horizontal overflow and strict tap-target sizes.
- Brand illustrations (flat editorial, magenta/plum) on the landing page, GAM
  hub, and empty states; runtime-cached WebP ≤ 53 KB each.
- Weekly rankings gain Core / General Academic / Combined views.

### Fixed
- "Skip break" in staged runs could bounce back to Home instead of starting
  the next stage (stray redirect-guard race).
- Screen readers were read the entire countdown every second during the
  final minute; now a single announcement at 5:00 and 1:00.
- README claimed the India requirement covers "computer science" degrees;
  corrected to the three official field groups with the standalone-CS nuance.
