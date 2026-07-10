# ui-morph

**Persona-driven UI adaptation for existing websites — consent-first, page-boundary only, constrained to your design system.**

An engine that watches *how* a visitor browses (after they opt in), quantizes that behavior into a small persona, and lets an LLM propose UI mutations for the *next* page view — every one validated against a schema your page declares. The LLM compiles itself out of the runtime: once a persona↔page chain exists, it replays from cache with **zero model calls**.

> **Status: proof of concept.** The core engine works end-to-end (see the demo), the API will move. Built as the reference implementation for the essay [*Generative UI Needs a Seatbelt Too*](https://mauriciojuba.com/articles/generative-ui-needs-boundaries).

## Why this exists

Personalization engines (Optimizely, Dynamic Yield, Adobe Target) pick among variants humans authored. Generative UI (Gemini, Vercel json-render, Thesys C1) builds interfaces for agent chats. Nobody does the middle: **let a model adapt an existing site per visitor, safely**. The reason is that three hard problems sit in the way:

1. **Unstable layouts hurt people.** Decades of HCI research (Findlater & McGrenere, Gajos; Office 2000's adaptive menus) show layout churn destroys spatial memory and trust.
2. **Tracking-based personas are radioactive.** Fingerprinting for personalization requires consent in the EU, full stop.
3. **Per-visitor LLM inference doesn't scale.** A model call per page view is a cost and latency wall.

ui-morph is an existence proof that all three die at the same boundary:

| Problem | Boundary |
|---|---|
| Layout churn | Mutations apply **only at page boundaries**, never mid-session; identical personas replay **identical, deterministic chains** |
| Privacy | **Inert until explicit opt-in** — no listeners, no storage. First-party behavioral signals only. Opt-out erases everything |
| Cost | Personas are **quantized into cache keys**; chains compile once (cold path) and replay forever (warm path). LLM calls decay toward zero |

## How it works

```
signals (consented) ──► quantize ──► persona 4D (tier·intent·traits·pain)
                                          │
                              chain cache hit? ──── yes ──► replay ops. 0 LLM calls.
                                          │ no
                                          ▼
                          LLM proposes ops from the page MANIFEST
                          (never sees the DOM, never sees the visitor)
                                          │
                                          ▼
                          guard(): schema + protected zones + budget
                                          │
                                          ▼
                          chain cached ──► applies on the NEXT page view
```

The page declares what may change (`data-morph` ids + a manifest with roles, variants and `protected` flags). The model can only answer in five ops — `hide`, `show`, `reorder`, `emphasize`, `swap-variant` — and only against declared targets. Anything else is rejected with a reason, and the rejection is written to the audit log.

```ts
import { Morph } from 'ui-morph'

const morph = new Morph({
  intents: ['browse', 'evaluate', 'compare'],
  budget: 5,
  llm: { endpoint: 'http://localhost:11434/v1/chat/completions', model: 'llama3.1' }, // any OpenAI-compatible endpoint
  onAudit: (e) => console.log(`[${e.kind}]`, e.detail),
})

// consent UI is yours; the engine is inert until this:
morph.setConsent(true)

await morph.start({
  route: location.pathname,
  entries: [
    { id: 'nav', role: 'site navigation', protected: true },
    { id: 'hero', role: 'landing hero', variants: ['visual', 'technical'] },
    { id: 'specs', role: 'technical specs table' },
  ],
})
```

## The demos

```bash
git clone https://github.com/Type-zero-labs/ui-morph && cd ui-morph
npm install
npm run demo:carbon           # primary — IBM Carbon store + inspector (dev)
npm run demo:carbon:build && npm run demo:carbon:preview   # production build — zero style flash, best for presenting
npm run demo                  # MVP1 — plain-CSS store + compact HUD (kept as legacy/learning)
```

Start at `/entry.html` (the mock "outside world" page) for the full story. The inspector's settings panel has **⟲ reset demo** — wipes the visitor (consent, chains, cart, searches, session log) and starts you over as a brand-new visitor; the model settings stay. A captured tour of what five contrasting personas each see on the same store lives in [`docs/persona-showcase.md`](./docs/persona-showcase.md); the project retrospective in [`docs/POST-MORTEM.md`](./docs/POST-MORTEM.md).

Both are the same three-page laptop store (home → laptops → gear), same engine. The **Carbon demo (NOVA 3.0)** is the primary one, at enterprise-retailer density — Carbon UI Shell header, photo hero, deals strip, category tiles, six photographed laptops and six gear items, tech-articles section, newsletter band, 4-column footer (free-license photos, credited in `demo-carbon/img/CREDITS.md`; original NOVA content throughout — no real retailer's site, copy or imagery is reproduced). Components are real Carbon custom elements (`@carbon/web-components`) and the themes are genuine Carbon token sets — `default`=white, `tech-savvy`=g90, `gamer`=g100 + purple accent overrides — selected by the engine through the ordinary `swap-variant` op. A technical persona even flips the content pattern on camera: the articles section reorders above the testimonials (sketch 02's `technical > social proof`).

The walkthrough plays **two acts on the same store**:

- **The gamer** — arrives from search, digs into specs, clicks gear: ranked objectives (`purchase_accessories 87%`), the gear page pre-adapts to the `gamer` theme with the compatibility matrix open.
- **Dona Marta** — arrives from a shopping ad for *"laptop fino branco"*, a gift for her granddaughter. Her search terms and a simulated stage-3 PROVIDED profile (explicit sign-in) become traits with visible reasons; `buy_gift_laptop` tops the ranking; and the product detail page **reorganizes itself for her before she opens it**: gallery above the specs (collapsed into an accordion), size comparison shown, white preselected, one emphasized CTA, `comfort` theme (Carbon g10, larger reading scale). Same engine, same five ops — two people, two completely different pages. A docked **inspector** narrates the whole loop in realtime: consented signals streaming, each trait appearing **with the rule that fired it**, objective probabilities decomposed (`base 10 + gamer 60 + technical 10 + evaluate 7 = 87%`), the expected path, the next page pre-adapting while you're still on this one, and every mutation listed with its why — including the mock's deliberate forbidden op (`hide nav`) being rejected by the guard, reason attached.

Everything is scripted and reproducible: `npm run e2e` replays both walkthroughs (cold act, then a fresh session replaying the identical chain with **zero** LLM calls) and drops screenshot evidence in [`e2e/evidence-carbon/`](./e2e/evidence-carbon/) and [`e2e/evidence/`](./e2e/evidence/). Specs with acceptance criteria: [`specs/carbon-demo-spec.md`](./specs/carbon-demo-spec.md), [`specs/demo-spec.md`](./specs/demo-spec.md).

### The full funnel + the persona laboratory

The Carbon store is a complete e-commerce funnel: an engine-less **entry page** (`/entry.html`, a mock search-results page with organic / sponsored-with-`utm_term` / direct inlets) → home → listings → a **sku-parameterized detail page** for all 12 catalog products (chains are keyed per product) → a real demo-side **cart** → checkout → payment → confirmation. Every step is morphable (guest checkout leading for gift buyers, Pix leading for price-aware visitors, upsells hidden for CTA-averse ones), so the outcome space is real: completed purchases per category, comparison, price study, abandonment at any step.

Every session records its whole story — searches, page arrivals with the cache verdict (exact / similar / miss), persona transitions, every cold-path exchange, every op and every funnel event — downloadable from the inspector as JSON (**session log**; nothing leaves the browser).

To study behavior at scale, `npm run sim` drives seed-deterministic generated personas through the funnel (entry channel × search terms × click pattern × dwell profile × funnel depth) and writes per-session logs plus a `summary.json` to `sim-results/`. `npm run sim -- --live --n 12` runs a real-model sample.

### Live cold path

By default the demos use a deterministic mock (reproducible walkthroughs are its job). To watch a **real model generate the adaptations during your navigation**, open the inspector's *settings · cold path* panel in the Carbon demo: paste any OpenAI-compatible endpoint + model + API key (OpenRouter, DeepSeek, a local Ollama…) and hit *use live model*. The COLD PATH section then shows each exchange as it happens — exactly what was sent (the quantized persona + the page manifest, nothing else) and the raw ops the model returned, with the guard's verdicts in the decisions log. Use *clear chains* to watch it generate again: once a chain is cached, the warm path deliberately never calls the model.

Scripted check with a real model: put `OPENROUTER_API_KEY=…` in a local `.env` (gitignored) and run `npm run e2e:live`. The key lives only in your browser's localStorage / local `.env` — never in the repo.

The MVP1 demo still accepts the same config via:

```js
localStorage.setItem('ui-morph:demo:llm', JSON.stringify({
  endpoint: 'https://openrouter.ai/api/v1/chat/completions', model: 'deepseek/deepseek-chat', apiKey: 'sk-…',
}))
```

## Design decisions

- **Consent is structural, not a banner.** Before `setConsent(true)` there are no listeners and no storage; opt-out wipes every byte (history, chains, consent itself).
- **The model never sees the DOM or the visitor.** Cold-path input is the quantized persona plus the page's own manifest. Raw events stay in the browser.
- **Deterministic where determinism does the job.** Signals→persona is threshold rules, not a model (a regex is cheaper than a model call, and reproducible). The LLM only maps persona→ops — the one genuinely fuzzy step.
- **Quantization is the economics.** Persona axes have tiny closed vocabularies *so that* cache keys collide. Colliding keys are what make the warm path exist.
- **Chains die with the page.** Cache keys include a manifest hash; ship a redesign and every stale chain invalidates itself.
- **Server store optional.** Default is localStorage (chains never leave the browser). A `remoteStore` adapter turns chains into collective knowledge — a new visitor who quantizes like a known persona gets the warm path on first visit.

## Non-goals

- Mid-session mutation. Layouts that move under the cursor are the failure mode this exists to prevent.
- Fingerprinting, cross-site identity, third-party enrichment. Out of scope in core, permanently.
- Conversion-hacking. The system prompt optimizes for *reducing friction for this persona*, and the ops vocabulary can't express dark patterns like fake urgency.

## Status & roadmap

- [x] Core engine: signals → quantize → guard → chain cache → DOM apply (tested)
- [x] Demo with live HUD + audit log
- [x] Objective estimation with ranked probabilities + expected-path derivation (demo-side, deterministic)
- [x] Next-page pre-adaptation (`Morph.precompile` — compile route B's chain while the visitor is on route A)
- [x] Persona-tier UI variations as design-token themes (`default` / `tech-savvy` / `gamer`), inside the existing op vocabulary
- [x] Scripted e2e walkthrough with committed screenshot evidence (`npm run e2e`)
- [x] Store rebuilt on a real design system (IBM Carbon web components; themes = Carbon token sets)
- [x] Realtime decision inspector: signal→trait rules, objective score decomposition, per-op whys, guard rejections with reasons (`quantizeExplained` in core)
- [x] Similarity matching between persona keys — deterministic read-fallback: on an exact miss, the nearest cached persona's chain applies (audited with its score) while the exact chain compiles; kills the early-session "persona treadmill"
- [ ] React/Vue store adapters (today: vanilla DOM via `data-morph`)
- [ ] Outcome feedback loop (chains that don't help get evicted)

MIT © [Type Zero Labs](https://github.com/Type-zero-labs)
