# Demo 2 spec — Carbon store + realtime decision inspector

> SDD artifact: precedes implementation. Builds on [`demo-spec.md`](./demo-spec.md)
> (MVP1, kept as legacy/learning). Evidence lands in `e2e/evidence-carbon/`.

## Why this demo exists

MVP1 proved the pipeline on a hand-rolled CSS store. Two gaps remain for a
convincing, presentable demonstration:

1. **"Variants of a real design system"** was asserted with our own tokens.
   Research (2026-07-10): no ready-made computer-store example exists for
   Carbon/Material/etc — only framework tutorials and React e-commerce
   boilerplates. So we rebuild the NOVA store on **IBM Carbon web components**:
   real components (`cds-*` custom elements), real token themes. Carbon's
   white/g90/g100 themes are token sets emitted as CSS custom properties via
   `@carbon/styles`' `theme()` mixin — which is exactly what the engine's
   attribute-mode `swap-variant` selects between. The op vocabulary does not
   change; the design system underneath becomes real.
2. **The reasoning was invisible.** The HUD showed *state* (persona, ranked
   objectives) but not *why*: which behavior fired which trait, how an
   objective's probability composes, why each mutation was chosen or rejected.
   Demo 2 replaces the HUD with an **Inspector** that narrates enrichment →
   objectives → path → decisions in realtime — sketch
   `02-json-enrichment-progression.png`, live.

## Scenario

Same gamer script as MVP1 (Google → home → specs → laptops → gear teasers →
pre-adapted gear page → warm second session), now on the Carbon store, with the
inspector open telling the story at each step: signals streaming, traits
appearing with their because, `purchase_accessories` climbing to 87% with the
score breakdown visible, the gear route pre-compiling, the guard rejecting
`hide nav` with its reason, and act 2 replaying everything from cache.

## Acceptance criteria

R1–R8: the eight MVP1 criteria ([demo-spec.md](./demo-spec.md)) re-asserted on
the Carbon store by `e2e/carbon.spec.ts`. Plus:

| # | Criterion | Proof |
|---|---|---|
| C9a | Store is built from Carbon custom elements (`cds-button`, `cds-tile`, `cds-tag`, `cds-structured-list`, `cds-accordion` — `:defined`) | e2e assert + screenshots |
| C9b | Themes are Carbon token sets: computed `--cds-background` differs across `default` (white) / `tech-savvy` (g90) / `gamer` (g100 + purple accent overrides); unknown variants still rejected by guard | e2e assert + 3 screenshots `c9-theme-*.png` |
| C10a | Trait appears in the inspector **with its because** right after the causing action, mid-page (`gamer ← clicked gear-*`) | e2e assert + screenshot |
| C10b | Objective probability shows its composition (`base 10 + gamer 60 + technical 10 [+ evaluate 7] = 80/87%`) | e2e assert + screenshot `c10-breakdown.png` |
| C10c | Every applied op is listed with its why; every rejection with the guard's reason | e2e assert + screenshot `c10-decisions.png` |
| C10d | Persona JSON updates live (sketch-02 progression), changed fields highlighted | e2e assert (JSON text changes without navigation) + screenshot |

## Out of scope (deliberate)

- Real-LLM "why" — a model proposal is labeled `model proposal (cold path)`;
  reasons exist only for the deterministic mock, honestly labeled.
- Rebuilding/porting MVP1 (`demo/` stays as-is, its e2e suite becomes the
  regression guard).
- Carbon UI Shell (header/side-nav) and full grid system — heavy, adds nothing
  to the thesis.

## Invariants — unchanged

Inspector consumes demo-side data (`signalsLive`, salesman breakdowns, mock
whys) plus the audit trail. The model still receives exactly: quantized persona
+ page manifest. Mutations still apply only at page boundaries. Consent
gating and cache economics untouched.

## Core changes (additive; TDD; anything beyond is out of bounds)

1. `Morph.signalsLive(): Signals[]` — history + current collector snapshot
   (mirrors `personaLive`). The inspector needs the raw in-flight signals;
   today only the quantized persona is public.
2. `quantizeExplained(history, rules?)` → `{ persona, because: string[] }` —
   the built-in rules that fired, in human-readable form. `quantize()` becomes
   a thin wrapper; signature and determinism intact. Rationale: auditability
   is a project value; explaining built-in derivation is the quantizer's job,
   not the site's (site-vocabulary traits are explained by the site — see
   `explainSiteTraits`).

## Demo-side design

- `demo/salesman.ts` (shared MVP1↔demo2, backward compatible):
  `estimateObjectivesExplained` (parts `{label, points}` per objective;
  `estimateObjectives` wraps it), `explainSiteTraits(history)` (because for
  gamer/technical). SCORING refactored to declarative labeled parts.
- `demo-carbon/` (new primary demo, `npm run demo:carbon`):
  - Same three routes, same manifests and `data-morph` ids as MVP1 (imported
    from a shared module) — light-DOM wrappers keep the collector/applier
    contract; shadow-DOM click retargeting delivers host elements.
  - `styles.scss`: `@use '@carbon/styles'`; `body` = `$white`;
    `body[data-morph-variant-active='tech-savvy']` = `$g90`;
    `'gamer'` = `$g100` + purple accent token overrides (a custom theme inside
    the DS grammar).
  - `inspector.ts`: docked, collapsible panel — SIGNALS (live, 500ms) →
    PERSONA (progressive JSON, change flash, core + site becauses) →
    OBJECTIVES (bars + expandable breakdown) → PATH & PRE-ADAPT (chain key,
    compiling/ready) → DECISIONS (applied ops with why; rejections with guard
    reason) → AUDIT. The mock cold path builds `[{op, why}]` internally; the
    engine receives bare ops (contract unchanged), the inspector receives the
    whys.

## New dependencies (all demo/dev; the shipped library keeps zod as its only runtime dep)

- `@carbon/web-components` — the point of the demo: real DS components.
- `@carbon/styles` — token themes for the `theme()` mixin.
- `sass` — required to compile `@carbon/styles` SCSS under vite.

## Verify-before-implement probes (before page code)

1. Minimal vite page: `cds-button` + `styles.scss` with three `theme()` zones
   compiles; computed `--cds-background` differs per zone.
2. Click inside a Carbon component (shadow DOM) → collector registers the
   wrapper's `data-morph` (event retargeting).
3. Lit rendering under Playwright `page.clock` (renders are microtask-driven,
   expected immune to the fake clock) — probed before writing the full suite.

## Honest-partial rule

Same as MVP1: unmet criterion ⇒ named gap in this spec, never a weakened
criterion.

## NOVA 3.0 — density update (2026-07-10)

The store grows to enterprise-retailer density (the Dell/Lenovo *class* of
layout — original NOVA content only; cloning a real retailer's site, copy,
imagery or brand is explicitly out of bounds). New criteria:

| # | Criterion | Proof |
|---|---|---|
| C11 | Density on a real DS: header is Carbon UI Shell (`cds-header` + nav, protected); home has ≥8 distinct sections (photo hero, deals strip, category tiles, featured grid, specs, tech articles, testimonials, newsletter, 4-column protected footer); products/gear list 6 photographed items each with tags/prices | e2e asserts (`cds-header` defined, section/img counts) + screenshots |
| C12 | Content pattern on camera (sketch 02's `technical > social proof`): technical persona ⇒ `reorder articles-teaser before testimonials`, applied at the page boundary, why visible in the inspector; `ignored-cta` also hides the newsletter band | e2e DOM-order assert + inspector why assert + screenshot |

Supporting decisions:
- **Photos**: free-license (Unsplash license / CC0) images, downloaded once,
  compressed and committed under `demo-carbon/img/`, each credited in
  `demo-carbon/img/CREDITS.md`. No hotlinking — e2e stays offline and
  deterministic.
- **Mutation budget raised to 7 for this demo** (config value, not engine
  change): the denser vocabulary makes 6 legitimate ops common for a
  defined-tier persona (theme, hero, comparison/compat, specs emphasis, gear
  emphasis, promo+newsletter hides); 5 was silently truncating honest chains.
- Manifests: `demo-carbon` gets its own manifest module; MVP1's stays frozen.
  The manifest-hash change kills the old Carbon-store chains automatically —
  that is the designed behavior, not a migration.
- R1–R8, C9, C10 remain in force and green.

## Status — NOVA 3.0 (2026-07-10)

C11 and C12 met, R1–R8 + C9/C10 still green after the density rebuild
(`npm run e2e` 5/5 across 3 consecutive full runs). Photos committed and
credited per file. Known limitation, on record instead of hidden: the gear
cards use generic free-license tech photography — the free pool has no true
dock/hub product shots. Budget 7 in effect for this demo per the
justification above.

## Status (2026-07-10)

All criteria met (R1–R8 regression + C9a/b + C10a–d) — no gaps. All three
probes passed before page code (tokens per zone `#ffffff/#262626/#161616`,
shadow-DOM click retargeting to the `data-morph` host, Lit rendering under the
fake clock). `npm test` 31/31; `npm run e2e` 5/5 (both suites) across 6
consecutive runs; evidence committed.

One finding fed back by visual review of the evidence: **Carbon's CSS reset
sets `display` on elements, and any author rule beats the UA's
`[hidden] { display: none }`** — which silently disabled the engine's
hide/show ops on the Carbon pages. Fixed with an explicit `[hidden]`
reassertion in `demo-carbon/styles.scss` and pinned by an assertion in the
default-theme test. Integration note for real adopters: a host page's CSS
reset can defeat `hidden`; the applier's contract assumes it holds.
