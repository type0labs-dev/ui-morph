import type { Persona, QuantizeRules, Signals } from '../src/types.ts'

// The salesman-at-a-distance, demo half: NOVA-store vocabulary on top of the
// generic engine. Deterministic on purpose — objectives, paths and themes are
// site rules the engine replays, not model output (the LLM only ever maps
// persona → ops in the cold path).

export type Theme = 'default' | 'tech-savvy' | 'gamer' | 'comfort'

// ── site-owned first-party stores (act 2: Dona Marta) ────────────────────────
// The store's own search box / ad-landing terms and the simulated stage-3
// PROVIDED profile live in site storage — site vocabulary reads them the same
// way it reads clicks. Guarded: absent in node tests and in the MVP1 demo.

export interface ProvidedProfile {
  name?: string
  ageRange?: string
  prefs?: string[]
  history?: string[]
}

export function searchTerms(): string {
  try {
    return sessionStorage.getItem('nova:search-terms') ?? ''
  } catch {
    return ''
  }
}

export function providedProfile(): ProvidedProfile | null {
  try {
    return JSON.parse(localStorage.getItem('nova:provided') ?? 'null') as ProvidedProfile | null
  } catch {
    return null
  }
}

const THIN = /fino|slim|thin/i
const WHITE = /branco|white/i
const GIFT = /presente|gift/i
const PRICE = /barato|cheap|budget|promo|deal|desconto|oferta/i
const TERM_RULES = [THIN, WHITE, GIFT, PRICE]

function cartItems(): number {
  try {
    const c = JSON.parse(localStorage.getItem('nova:cart') ?? '{}') as Record<string, number>
    return Object.values(c).reduce((s, q) => s + q, 0)
  } catch {
    return 0
  }
}

/** Search tokens no rule consumed — lost evidence, surfaced instead of silent. */
export function unmappedSearchTerms(): string[] {
  const tokens = searchTerms().toLowerCase().split(/\s+/).filter(Boolean)
  return [...new Set(tokens.filter((t) => !TERM_RULES.some((r) => r.test(t))))]
}

export interface RankedObjective {
  id: string
  /** independent likelihood estimate, 0..1 */
  p: number
}

export interface ExplainedObjective extends RankedObjective {
  /** the score parts that fired — probability decomposed for the inspector */
  parts: { label: string; points: number }[]
}

const has = (p: Persona, trait: string) => p.traits.includes(trait)

// ponytail: additive scores masquerading as probabilities — good enough for a
// demo estimator; a real one would be fit on outcome data
interface ScorePart {
  label: string
  points: number
  when: (p: Persona) => boolean
}
const always = () => true
const SCORING: Record<string, ScorePart[]> = {
  complete_purchase: [
    { label: 'base rate', points: 3, when: always },
    // dominates every browsing objective: a full cart means the job is now
    // "finish", not "shop" (calibrated: gift persona peaks at 70 without it)
    { label: 'items in cart', points: 72, when: (p) => has(p, 'cart-holder') },
    { label: 'gift deadline pressure', points: 5, when: (p) => has(p, 'gift-buyer') && has(p, 'cart-holder') },
  ],
  hunt_deals: [
    { label: 'base rate', points: 8, when: always },
    { label: 'price-aware trait', points: 45, when: (p) => has(p, 'price-aware') },
    { label: 'search-led trait', points: 5, when: (p) => has(p, 'search-led') },
  ],
  buy_gift_laptop: [
    { label: 'base rate', points: 5, when: always },
    { label: 'gift-buyer trait', points: 40, when: (p) => has(p, 'gift-buyer') },
    { label: 'thin/white product focus', points: 25, when: (p) => has(p, 'thin-focus') || has(p, 'color-white') },
    { label: 'comfort trait', points: 10, when: (p) => has(p, 'comfort') },
  ],
  purchase_accessories: [
    { label: 'base rate', points: 10, when: always },
    { label: 'gamer trait', points: 60, when: (p) => has(p, 'gamer') },
    { label: 'technical trait', points: 10, when: (p) => has(p, 'technical') },
    { label: 'evaluate intent', points: 7, when: (p) => p.intent === 'evaluate' },
  ],
  compare_specs: [
    { label: 'base rate', points: 15, when: always },
    { label: 'compare intent', points: 30, when: (p) => p.intent === 'compare' },
    { label: 'technical/reader trait', points: 15, when: (p) => has(p, 'technical') || has(p, 'reader') },
  ],
  purchase_laptop: [
    { label: 'base rate', points: 25, when: always },
    { label: 'evaluate intent', points: 10, when: (p) => p.intent === 'evaluate' },
    { label: 'reader trait', points: 5, when: (p) => has(p, 'reader') },
    { label: 'gamer trait (already owns one)', points: -10, when: (p) => has(p, 'gamer') },
  ],
  contact_support: [
    { label: 'base rate', points: 5, when: always },
    { label: 'search-loop pain', points: 10, when: (p) => p.painPoints.includes('search-loop') },
  ],
  check_order_status: [{ label: 'base rate', points: 2, when: always }],
}

export function estimateObjectivesExplained(persona: Persona): ExplainedObjective[] {
  return Object.entries(SCORING)
    .map(([id, rules]) => {
      const parts = rules.filter((r) => r.when(persona)).map(({ label, points }) => ({ label, points }))
      const sum = parts.reduce((s, x) => s + x.points, 0)
      return { id, p: Math.min(95, Math.max(1, sum)) / 100, parts }
    })
    .sort((a, b) => b.p - a.p)
}

export function estimateObjectives(persona: Persona): RankedObjective[] {
  return estimateObjectivesExplained(persona).map(({ id, p }) => ({ id, p }))
}

/** Predicted detail page for this persona — site affinity rules, deterministic. */
export function predictSku(persona: Persona): string {
  if (has(persona, 'thin-focus') || has(persona, 'color-white') || has(persona, 'gift-buyer') || has(persona, 'comfort'))
    return 'nova-13-air'
  if (has(persona, 'gamer')) return 'gear-controller'
  if (has(persona, 'technical') || has(persona, 'reader')) return 'nova-15-pro'
  if (has(persona, 'price-aware')) return 'nova-15' // the -20% flagship deal
  return 'nova-15' // best seller
}

// expected page sequence per objective — the demo site's map, home → goal.
// '{detail}' is filled with the persona's predicted sku at derive time.
const FUNNEL = ['/cart.html', '/checkout.html', '/payment.html', '/done.html']
const PATHS: Record<string, string[]> = {
  complete_purchase: ['/index.html', '/products.html', '{detail}', ...FUNNEL],
  hunt_deals: ['/index.html', '/products.html'],
  buy_gift_laptop: ['/index.html', '/products.html', '{detail}', ...FUNNEL],
  purchase_accessories: ['/index.html', '/products.html', '/accessories.html', '{detail}', ...FUNNEL],
  compare_specs: ['/index.html', '/products.html'],
  purchase_laptop: ['/index.html', '/products.html', '{detail}', ...FUNNEL],
  contact_support: ['/index.html'],
  check_order_status: ['/index.html'],
}

const pathOf = (route: string) => route.split('?')[0]!

/**
 * Remaining expected sequence after the current route, for the top objective.
 * Steps match by pathname (the detail step is sku-parameterized); the persona,
 * when given, fills '{detail}' with its predicted sku.
 */
export function derivePath(objectives: RankedObjective[], currentRoute: string, persona?: Persona): string[] {
  const sku = persona ? predictSku(persona) : 'nova-15'
  const seq = (PATHS[objectives[0]?.id ?? ''] ?? []).map((s) => (s === '{detail}' ? `/product.html?sku=${sku}` : s))
  const at = seq.findIndex((s) => pathOf(s) === pathOf(currentRoute))
  return at === -1 ? seq : seq.slice(at + 1)
}

export function nextRoute(objectives: RankedObjective[], currentRoute: string, persona?: Persona): string | null {
  return derivePath(objectives, currentRoute, persona)[0] ?? null
}

/** Persona → design-system theme tier. Variants of ONE system, never free generation. */
export function themeFor(persona: Persona): Theme {
  if (has(persona, 'gamer')) return 'gamer'
  if (has(persona, 'comfort')) return 'comfort'
  if (has(persona, 'technical') || has(persona, 'reader')) return 'tech-savvy'
  return 'default'
}

// Site trait vocabulary: which clicks mean what, in THIS store.
const GEAR = (id: string) => id.startsWith('gear-')
const SPECCY = (id: string) => id.includes('specs') || id.includes('comparison')

export const DEMO_QUANTIZE: QuantizeRules = {
  traitsOf(history) {
    const clicked = history.flatMap((s) => s.clicked)
    const traits = new Set<string>()
    if (clicked.some(GEAR)) traits.add('gamer')
    if (clicked.some(SPECCY)) traits.add('technical')
    const terms = searchTerms()
    if (THIN.test(terms)) traits.add('thin-focus')
    if (WHITE.test(terms)) traits.add('color-white')
    if (GIFT.test(terms)) traits.add('gift-buyer')
    if (PRICE.test(terms)) traits.add('price-aware')
    const provided = providedProfile()
    if (provided?.prefs?.includes('large-text')) traits.add('comfort')
    if (provided?.history?.includes('gifts')) traits.add('gift-buyer')
    if (cartItems() > 0) traits.add('cart-holder')
    return [...traits]
  },
}

/** The site-rule counterpart of quantizeExplained's `because` lines. */
export function explainSiteTraits(history: Signals[]): string[] {
  const clicked = history.flatMap((s) => s.clicked)
  const because: string[] = []
  const gear = clicked.filter(GEAR)
  if (gear.length) because.push(`trait gamer: clicked ${[...new Set(gear)].join(', ')}`)
  const speccy = clicked.filter(SPECCY)
  if (speccy.length) because.push(`trait technical: clicked ${[...new Set(speccy)].join(', ')}`)
  const terms = searchTerms()
  if (THIN.test(terms)) because.push(`trait thin-focus: searched "${terms}"`)
  if (WHITE.test(terms)) because.push(`trait color-white: searched "${terms}"`)
  if (GIFT.test(terms)) because.push(`trait gift-buyer: searched "${terms}"`)
  if (PRICE.test(terms)) because.push(`trait price-aware: searched "${terms}"`)
  const provided = providedProfile()
  if (provided?.prefs?.includes('large-text')) because.push(`trait comfort: PROVIDED adapter — prefers larger text`)
  if (provided?.history?.includes('gifts')) because.push(`trait gift-buyer: PROVIDED adapter — gift purchase history`)
  const inCart = cartItems()
  if (inCart > 0) because.push(`trait cart-holder: ${inCart} item(s) in cart`)
  return because
}
