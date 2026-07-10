# Demo spec — the salesman-at-a-distance, end to end

> SDD artifact: this spec precedes the implementation. Every claim below is
> either covered by a unit test, asserted by the e2e walkthrough, or explicitly
> listed as out of scope. Evidence lands in `e2e/evidence/` and is committed.

## The scenario (the TV family, translated to the NOVA store)

In [VISION.md](../docs/VISION.md) a salesman watches a family talk near the TVs
and knows what to show them before they ask. The demo replays that story in the
NOVA laptop store:

A visitor lands on NOVA's home page from a Google search. They skip the
"magical" visual hero, go straight for the specs teaser, open the side-by-side
comparison on the laptops page, and click the gamer items — headset, GPU dock.
The salesman-at-a-distance has already formed its read:

- **traits** accumulate live: `search-led`, `explorer`, `gamer` (site-defined
  vocabulary) — visible in the HUD as they form;
- **objectives** are estimated with probabilities, ranked:
  `purchase_accessories 87% · compare_specs 40% · purchase_laptop 31% · …`;
- the **expected path** is derived from the top objective:
  `products → accessories`;
- **before** the visitor clicks ACCESSORIES, the accessories page has already
  been compiled and cached for their persona: `gamer` token theme, compatible
  peripherals emphasized, technical comparison visible. On the page change — and
  only on the page change — it applies.

No questions asked. Mid-scene, the mock cold path deliberately tries
`hide nav`; the guard rejects it on camera, in the audit log. A second visitor
who behaves the same way quantizes to the same persona and receives the
identical chain from cache — **zero LLM calls**.

## Acceptance criteria

Each criterion names its proof. "Screenshot" means a committed file in
`e2e/evidence/` produced by `npm run e2e`.

| # | Criterion | Proof |
|---|---|---|
| 1 | Before opt-in: zero `ui-morph:*` keys in storage; declining keeps the site fully static | e2e assert + screenshot `01-preconsent.png` |
| 2 | HUD shows tier / intent / traits evolving **live** during navigation (not only after page change) | e2e asserts trait appears mid-page; screenshots `02-persona-*.png` |
| 3 | HUD ranks ≥3 objectives with probabilities; top-1 matches the scripted behavior (`purchase_accessories` for the gamer script) | e2e text assert + screenshot `03-objectives.png` |
| 4 | While still on route A, the audit shows `chain-compiled` **for route B**; navigating to B applies the ops on load | e2e asserts audit order (compile-for-B before nav); screenshots `04-preadapt-before.png` / `04-preadapt-after.png` |
| 5 | Three scripted sessions yield the three token themes — `default` / `tech-savvy` / `gamer` — via `swap-variant` against the manifest; a variant not in the manifest is rejected | unit test (guard) + 3 screenshots `05-theme-*.png` |
| 6 | Guard on camera: every cold compile logs `op-rejected … "nav" is protected` | e2e assert + screenshot `06-guard.png` |
| 7 | Warm path: a fresh session with the same script produces the same persona key, replays the identical chain (`chain-hit … 0 LLM calls`), and compiles nothing new | e2e assert (audit has `chain-hit`, no new `chain-compiled`; applied ops equal act-1 chain) + screenshot `07-warm.png` |
| 8 | `npm test` green: the 8 existing unit tests plus new ones (precompile, applier variant fallback, traitsOf, objectives, path, theme mapping) | CI-style output pasted in PR/commit notes |

## Out of scope (deliberate)

- **Real-LLM evidence.** The deterministic mock *is* the proof (reproducible);
  pointing the demo at Ollama/OpenAI stays a documented option, not a criterion.
- React/Vue store adapters; `remoteStore` similarity matching.
- Data stages 3–4 (PROVIDED / ENRICHED) — consent-gated adapters, not core, per VISION.
- Outcome feedback loop; mobile layouts.

## Invariants — how the demo preserves each one

1. **Consent is structural.** Untouched: engine stays inert pre-opt-in; e2e
   criterion 1 proves it from the outside.
2. **Mutations only at page boundaries.** Pre-adaptation only *caches* a chain
   for route B; nothing on the live page moves. The chain applies when B loads.
3. **The model never sees the DOM or the visitor.** The cold path (including
   the new `precompile`) receives exactly the quantized persona and route B's
   manifest — no raw events, no DOM, no identifiers.
4. **The LLM compiles itself out of the runtime.** Criterion 7: identical
   persona → cache replay, zero calls.

## Core changes (additive; anything beyond these is out of bounds)

The core is built on, not rewritten. Three small additions, each justified:

1. `Morph.precompile(manifest)` + `Morph.personaLive()` (`src/index.ts`) —
   pre-adaptation needs to compile for a route other than the current one
   (today `compile` is private and bound to the current route), and live HUD /
   prediction need the in-flight page's signals (today the persona only
   updates on `pagehide` flush). Both reuse existing private paths; guard and
   audit behavior unchanged.
2. `swap-variant` attribute fallback (`src/apply.ts`) — child-variant lookup
   scoped to `:scope > [data-morph-variant]`; when an entry has no child
   variants the op sets `data-morph-variant-active="<variant>"` on the element.
   This is what lets a token theme be expressed **inside the existing closed
   vocabulary** (`<body data-morph="theme">` + manifest variants + CSS custom
   properties) — no new op, no theme engine, guard still validates variant
   names against the manifest.
3. `QuantizeRules.traitsOf?(history)` + `MorphConfig.quantize?`
   (`src/quantize.ts`, `src/types.ts`) — "gamer" is site vocabulary (clicks on
   site-specific ids), not a generic rule; the quantizer needs the same
   extension point intents already have.

## Demo-side design (site-specific, therefore not core)

- `demo/salesman.ts` — pure, unit-tested: `estimateObjectives(persona)`
  (deterministic priors + trait/intent/pain boosts, normalized, ranked),
  `derivePath(objectives, route)` / `nextRoute(...)` (objective → route
  sequence map), `themeFor(persona)` (`default` / `tech-savvy` / `gamer`).
- `demo/accessories.html` — third page (headset, GPU dock, hub). With two pages
  "expected path" is trivial; three routes make the ranking and the path fork
  real (this is sketch `04-predicting-the-path.png`'s
  `purchase_accessories 87%` scene).
- `demo/main.ts` — after `start()`: the 2s HUD loop uses `personaLive()`,
  renders objectives (probability bars), predicted path and pre-adaptation
  status, and triggers `morph.precompile(MANIFESTS[nextRoute])` when the
  prediction changes. The mock cold path picks the theme via `themeFor` and
  keeps emitting the `hide nav` guard bait.
- `demo/style.css` — design tokens become CSS custom properties; the three
  themes are token sets selected by `body[data-morph-variant-active=…]`.

## New dependency justification (required by process)

- **`@playwright/test` (devDependency).** The acceptance criteria demand
  scripted, reproducible, screenshot-producing end-to-end evidence. A manual
  browser session is not committable and not reproducible by a reviewer;
  `npm run e2e` is. Dev-only; the shipped library still has `zod` as its sole
  runtime dependency. `page.clock` is also the only sane way to hit the
  quantizer's 45s/10s dwell thresholds without multi-minute test runs.

## Honest-partial rule

If a criterion cannot be met, this spec gets a "Gaps" section naming it and
why — the criterion is never silently weakened.
