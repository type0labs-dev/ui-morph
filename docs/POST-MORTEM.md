# Post-mortem — from POC to persona laboratory (2026-07-09 → 2026-07-10)

What started as "assemble the demonstration that the salesman-at-a-distance
works" ended as a complete e-commerce funnel on a real design system, driven
by a real model, with every decision narrated on camera and a laboratory that
replays hundreds of deterministic personas. This document is the honest
record: what was built, what broke, how each break was caught, and what the
journey proved about the architecture.

## Final state, in numbers

- **Engine**: still one runtime dependency (`zod`); still exactly **five ops**
  (`hide` / `show` / `reorder` / `emphasize` / `swap-variant`) — unchanged
  since the POC through every scenario thrown at it.
- **Core changes across the whole journey**: six, all additive, each
  spec-justified before implementation (`precompile` + `personaLive`,
  `signalsLive`, `swap-variant` attribute fallback, pluggable quantizer rules,
  `quantizeExplained`, similarity read-fallback + `ChainStore.list`), plus two
  defect fixes found by tests (protected zones as signal-invisible; opt-out
  surviving the dying page).
- **Verification**: 52 unit tests (TDD), 9 e2e tests across two deterministic
  suites plus an env-gated live-model suite, all evidence screenshots
  committed per acceptance criterion.
- **Laboratory**: mock batch n=200 → 0 crashes, all four funnel outcomes
  reached, **34% of all page arrivals served by similarity fallback**,
  1,179 ops applied across 7 routes. Live sample n=12 (deepseek-chat via
  OpenRouter) → 172 model-generated ops, exchange p50 5.5s.
- Specs: two SDD documents with 20 acceptance criteria (R1–R8, C9–C20), each
  criterion mapped to a test or committed screenshot, all closed with status
  sections. Zero criteria weakened; every miss became a named gap instead.

## Phases

1. **Walkthrough on the POC store** — objectives with probabilities, path
   derivation, next-page pre-adaptation, token themes, scripted Playwright
   evidence. Proved the loop end-to-end with the deterministic mock.
2. **Carbon rebuild + inspector** — real design system (IBM Carbon web
   components; themes as genuine Carbon token sets selected by the ordinary
   `swap-variant`), and the reasoning made visible: signal→trait rules,
   objective score decomposition, per-op whys.
3. **NOVA 3.0 density** — enterprise-retailer layout (UI Shell, photos,
   deals, articles, newsletter) on original content; the sketch-02
   "technical > social proof" content pattern realized as an on-camera
   reorder.
4. **Act Dona Marta** — search terms as first-party signals, simulated
   stage-3 PROVIDED adapter behind explicit sign-in, product detail page
   reorganizing for a non-technical gift buyer — entirely within the existing
   op vocabulary.
5. **Live cold path** — a real model proposing the ops during navigation,
   with the exchange (quantized persona + manifest in, raw ops out, guard
   verdicts) on camera; settings panel, masked key, opt-in live e2e.
6. **C18: the moving persona** — live simulation quantified why adaptations
   arrived "2–3 pages late"; similarity matching (the roadmap TODO) fixed it.
7. **C19/C20: full funnel + laboratory** — entry page through order
   confirmation, chains per product, cart as first-party evidence, session
   log, seeded persona simulator.
8. **QoL** — reset button, FOUC guard + production build, captured persona
   showcase.

## What broke, and what caught it

The defect catalog is the most valuable part of this record. Every item below
shipped, broke or misbehaved, and was caught by the process — none survived to
"trust me".

| # | Defect | Caught by |
|---|---|---|
| 1 | Carbon's CSS reset beat the UA's `[hidden]` rule — the engine's hide/show ops silently stopped working on the Carbon pages | **Visual review of evidence screenshots** (a "hidden" section visible in the default-theme shot) |
| 2 | Nav clicks registered as behavioral evidence at the pagehide flush, flipping traits after the last pre-compile → cache key mismatch on arrival | **e2e determinism assert** (act-2 chain equality failing) |
| 3 | Warm pre-adaptations were invisible (`precompile` returned silently on cache hit) | Designing the e2e walkthrough — an assert had nothing to observe |
| 4 | `sessionStorage.clear()` before navigating: the dying page's flush repopulated the history, corrupting the fresh-session persona | e2e act-2 failure; fixed by modeling a new session as a **new tab** |
| 5 | Budget 5 silently truncated honest 6-op chains once the store got dense | Op counting during the 3.0 spec review; raised to 7 **with written justification** |
| 6 | Early-session "persona treadmill": exact-key caching perpetually missed because the persona grows every page; in-flight compiles die on navigation | **5-persona live simulation** (sessions B/E: two visits later, still zero ops) → similarity read-fallback + precompile fan-out |
| 7 | Navigation-aborted fetches REJECT during teardown, so the `finally` unmark erased the very interruption evidence the next page needed | Live validation of the interruption UI (marks measured dying ~100ms into navigation) |
| 8 | The simulator's fake clock compressed wall time to ~0 — the first live batch measured nothing (58/58 misses, 0 ops) because every real model call died in flight | **The batch's own summary.json** — numbers too broken to be true |
| 9 | A gift persona (70) outranked `complete_purchase` (63) even with a full cart | **Funnel e2e** failing on the cart page; calibration pinned in TDD |
| 10 | Opt-out didn't survive the dying page: pagehide flush re-created signals + visit counter right after the erase — a real privacy hole in core | **Reset-button e2e** (leftover keys after reset) |
| 11 | Two stock photos attributed to the wrong subjects (flatlay as a laptop, laptop as a headset) | Visual review of the rendered store |
| 12 | Dev-mode FOUC (~220ms warm / ~1s cold of raw HTML) — CSS injected by JS after the module graph | **User report → measured** with a paint probe; inline guard + multi-page production build (23ms) |

**The dominant defect class — 4 of 12 (#2, #4, #7, #10) — is page-death
races**: `pagehide`, aborted fetches and teardown microtasks all run *after*
the code thinks the page is done. In an architecture whose core rule is "act
only at page boundaries", the boundary itself is the hostile edge. Every one
of these was invisible in unit tests and surfaced only by driving real
navigations.

Honorable mention, not a defect: with the same gift persona, the live model
**diverged from the authored mock** (kept the visual hero, hid the comparison,
hid the size demo the mock shows). That divergence is the proof the generation
is real — and the guard's whole reason to exist.

## What worked

- **Spec before plan, plan before code.** Twenty acceptance criteria, each
  with a named proof, kept "done" honest. The two spec documents read today as
  an accurate history, because misses were recorded as gaps instead of erased.
- **TDD where there was logic.** 52 tests, every one watched failing first.
  The calibration bugs (#9) and API regressions were caught at the cheapest
  possible moment.
- **Verify-before-implement probes.** Carbon theming, shadow-DOM click
  retargeting and Lit-under-fake-clock were each proven with a throwaway probe
  before a single page was written. Zero rework followed.
- **Evidence over narration.** Committed screenshots per criterion meant
  visual review was part of the loop — it caught #1 and #11, which no assert
  was looking for.
- **The simulation habit.** Both major behavioral findings (#6, #8) came from
  running populations, not from reasoning about individuals.
- **Deterministic mock as the contract, live model as the sample.** The suites
  stay reproducible forever; reality gets checked on demand without poisoning
  CI with nondeterminism.

## What the journey proved about the thesis

1. **The closed vocabulary held.** Gift buyers, gamers, deal hunters,
   comparators, checkout steps, color pre-selection, accessibility theming —
   nothing ever needed a sixth op. Density came from manifests (site
   vocabulary), never from engine power.
2. **The invariants were never the obstacle.** Consent-structural, page-
   boundary-only, model-sees-persona-only, LLM-compiles-itself-out — every new
   scenario fit inside them, and twice the invariants *found* the bugs (#10
   directly, #6 by making the cost of misses visible).
3. **Quantization is load-bearing.** The persona treadmill showed exact-key
   caching alone is not enough early in a session; deterministic similarity
   over quantized keys (not a model call) closed the gap while keeping replay
   auditable.
4. **Explainability was cheap because the system is rules + one fuzzy step.**
   Every trait, score part and op carries its reason; only genuine model
   proposals fall back to "model proposal (cold path)" — honestly labeled.

## Known debts / next

- React/Vue store adapters; outcome feedback loop (chains that don't help get
  evicted) — still open roadmap items.
- Search-vocabulary backlog: the laboratory surfaced 12 unmapped terms
  (faculdade, tela grande, ultrabook…) — each is a candidate trait/objective.
- `Signals.route` is pathname-only, so revisit counting aggregates across all
  products on the detail template (documented in C19b).
- Gear-card photos are generic tech shots (free-license pool has no true
  dock/hub subjects).
- The live e2e project is opt-in and single-run by design; a transient network
  failure was observed and is expected — determinism belongs to the mock
  suites.

## One-line summary

The salesman-at-a-distance works, on camera, at funnel scale — and the
process that got it there (spec → plan → TDD → probes → evidence → simulate)
caught twelve real defects before any user had to.
