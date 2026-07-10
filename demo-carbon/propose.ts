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
  else if (theme === 'tech-savvy')
    out.push({ op: { op: 'swap-variant', target: 'theme', variant: 'tech-savvy' }, why: 'technical/reader trait → g90 tokens, data-first' })

  const technical = persona.traits.includes('technical') || persona.traits.includes('reader') || persona.intent === 'compare'
  if (technical) {
    out.push({ op: { op: 'swap-variant', target: 'hero', variant: 'technical' }, why: 'technical persona → numbers, not adjectives' })
    if (has('comparison')) out.push({ op: { op: 'show', target: 'comparison' }, why: 'technical persona → comparison data upfront' })
    if (has('compat-table')) out.push({ op: { op: 'show', target: 'compat-table' }, why: 'technical persona → compatibility matrix upfront' })
    if (has('specs-teaser')) out.push({ op: { op: 'emphasize', target: 'specs-teaser', level: 'strong' }, why: 'technical persona → specs are the hook' })
  }
  if (persona.traits.includes('gamer') && has('gear-grid'))
    out.push({ op: { op: 'emphasize', target: 'gear-grid', level: 'strong' }, why: 'gamer trait → gear first' })
  if (persona.painPoints.includes('ignored-cta') && has('promo-banner'))
    out.push({ op: { op: 'hide', target: 'promo-banner' }, why: 'ignored-cta pain → cut promotional noise' })
  if (persona.intent === 'compare' && has('reviews'))
    out.push({ op: { op: 'reorder', target: 'reviews', before: 'promo-banner' }, why: 'compare intent → social proof higher' })
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
