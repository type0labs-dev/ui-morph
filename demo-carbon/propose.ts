import type { MutationOp, PageManifest, Persona } from '../src/index.ts'
import { themeFor } from '../demo/salesman.ts'

// Mock cold path with its reasoning attached. The ENGINE receives bare ops —
// its contract (and the invariants) don't change. The whys are demo-side
// bookkeeping for the inspector, persisted per (route, op) so the page that
// APPLIES a chain can still explain ops chosen on an earlier page.

const WHYS_KEY = 'ui-morph:demo:whys'

interface ProposedOp {
  op: Record<string, unknown>
  why: string
}

function decide(persona: Persona, manifest: PageManifest): ProposedOp[] {
  const has = (id: string) => manifest.entries.some((e) => e.id === id)
  const out: ProposedOp[] = [
    { op: { op: 'hide', target: 'nav' }, why: 'deliberate forbidden op — shows the guard working' },
  ]

  const theme = themeFor(persona)
  if (theme === 'gamer') out.push({ op: { op: 'swap-variant', target: 'theme', variant: 'gamer' }, why: 'gamer trait → g100 tokens + purple accents' })
  else if (theme === 'comfort')
    out.push({ op: { op: 'swap-variant', target: 'theme', variant: 'comfort' }, why: 'comfort trait → larger type, stronger contrast' })
  else if (theme === 'tech-savvy')
    out.push({ op: { op: 'swap-variant', target: 'theme', variant: 'tech-savvy' }, why: 'technical/reader trait → g90 tokens, data-first' })

  // act 2 — the gift buyer who searched "thin, white"
  const giftish = persona.traits.includes('gift-buyer') || persona.traits.includes('thin-focus') || persona.traits.includes('color-white')
  const nonTechnical = giftish && !persona.traits.includes('technical') && !persona.traits.includes('reader')
  if (giftish) {
    if (has('card-13-air')) out.push({ op: { op: 'emphasize', target: 'card-13-air', level: 'strong' }, why: 'thinnest white model — exactly what she searched for' })
    if (has('gallery') && has('specs-detail'))
      out.push({ op: { op: 'reorder', target: 'gallery', before: 'specs-detail' }, why: 'she buys with her eyes — images before data' })
    if (has('size-compare')) out.push({ op: { op: 'show', target: 'size-compare' }, why: 'searched "fino" — show how thin, against everyday objects' })
    if (persona.traits.includes('color-white') && has('color-picker'))
      out.push({ op: { op: 'swap-variant', target: 'color-picker', variant: 'white' }, why: 'searched "branco" — preselect white' })
    if (has('cta-buy')) out.push({ op: { op: 'emphasize', target: 'cta-buy', level: 'strong' }, why: 'one obvious next step, no hunting' })
  }
  if (persona.traits.includes('price-aware') && has('deals-strip'))
    out.push({ op: { op: 'emphasize', target: 'deals-strip', level: 'strong' }, why: 'price-aware search → deals front and center' })
  if (nonTechnical) {
    if (has('specs-detail')) out.push({ op: { op: 'swap-variant', target: 'specs-detail', variant: 'collapsed' }, why: 'specs are noise for this persona — fold them away' })
    if (has('articles-teaser')) out.push({ op: { op: 'hide', target: 'articles-teaser' }, why: 'benchmark articles do not help a gift buyer' })
  }

  const technical = persona.traits.includes('technical') || persona.traits.includes('reader') || persona.intent === 'compare'
  if (technical) {
    out.push({ op: { op: 'swap-variant', target: 'hero', variant: 'technical' }, why: 'technical persona → numbers, not adjectives' })
    if (has('comparison')) out.push({ op: { op: 'show', target: 'comparison' }, why: 'technical persona → comparison data upfront' })
    if (has('compat-table')) out.push({ op: { op: 'show', target: 'compat-table' }, why: 'technical persona → compatibility matrix upfront' })
    if (has('specs-teaser')) out.push({ op: { op: 'emphasize', target: 'specs-teaser', level: 'strong' }, why: 'technical persona → specs are the hook' })
  }
  if (technical && has('articles-teaser') && has('testimonials'))
    out.push({
      op: { op: 'reorder', target: 'articles-teaser', before: 'testimonials' },
      why: 'preferred content pattern: technical > social proof (sketch 02)',
    })
  if (persona.traits.includes('gamer') && has('gear-grid'))
    out.push({ op: { op: 'emphasize', target: 'gear-grid', level: 'strong' }, why: 'gamer trait → gear first' })
  if (persona.painPoints.includes('ignored-cta')) {
    if (has('promo-banner')) out.push({ op: { op: 'hide', target: 'promo-banner' }, why: 'ignored-cta pain → cut promotional noise' })
    if (has('newsletter')) out.push({ op: { op: 'hide', target: 'newsletter' }, why: 'ignored-cta pain → this visitor does not want CTAs' })
  }
  if (persona.intent === 'compare' && has('reviews'))
    out.push({ op: { op: 'reorder', target: 'reviews', before: 'promo-banner' }, why: 'compare intent → social proof higher' })

  // funnel steps
  if (persona.painPoints.includes('ignored-cta') && has('upsell'))
    out.push({ op: { op: 'hide', target: 'upsell' }, why: 'ignored-cta pain → no cross-sell pressure at the cart' })
  if (persona.traits.includes('comfort') && has('shipping-note'))
    out.push({ op: { op: 'swap-variant', target: 'shipping-note', variant: 'detailed' }, why: 'comfort persona → reassurance spelled out in full' })
  if ((persona.traits.includes('gift-buyer') || persona.traits.includes('comfort')) && has('signup-step'))
    out.push({ op: { op: 'swap-variant', target: 'signup-step', variant: 'guest' }, why: 'gift/comfort buyer → no account friction, guest checkout first' })
  if (persona.traits.includes('price-aware') && has('payment-methods'))
    out.push({ op: { op: 'swap-variant', target: 'payment-methods', variant: 'pix' }, why: 'price-aware → the 5%-off method leads' })
  else if (persona.traits.includes('comfort') && has('payment-methods'))
    out.push({ op: { op: 'swap-variant', target: 'payment-methods', variant: 'installments' }, why: 'comfort persona → predictable monthly amounts' })
  if (persona.traits.includes('gamer') && has('next-steps'))
    out.push({ op: { op: 'swap-variant', target: 'next-steps', variant: 'more-gear' }, why: 'gamer → the setup is never finished' })
  return out
}

function whyStore(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(WHYS_KEY) ?? '{}') as Record<string, string>
  } catch {
    return {}
  }
}

export function whyKey(route: string, op: unknown): string {
  return `${route}|${JSON.stringify(op)}`
}

/** Why was this (route, op) chosen? Falls back honestly for real-LLM chains. */
export function whyFor(route: string, op: MutationOp | Record<string, unknown>): string {
  return whyStore()[whyKey(route, op)] ?? 'model proposal (cold path)'
}

/** Engine-facing propose: bare ops out, whys persisted for the inspector. */
export async function mockPropose(persona: Persona, manifest: PageManifest): Promise<unknown> {
  await new Promise((r) => setTimeout(r, 300)) // pretend to think
  const proposed = decide(persona, manifest)
  const store = whyStore()
  for (const { op, why } of proposed) store[whyKey(manifest.route, op)] = why
  localStorage.setItem(WHYS_KEY, JSON.stringify(store))
  return proposed.map(({ op }) => op)
}
