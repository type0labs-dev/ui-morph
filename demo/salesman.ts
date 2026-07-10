import type { Persona, QuantizeRules } from '../src/types.ts'

// The salesman-at-a-distance, demo half: NOVA-store vocabulary on top of the
// generic engine. Deterministic on purpose — objectives, paths and themes are
// site rules the engine replays, not model output (the LLM only ever maps
// persona → ops in the cold path).

export type Theme = 'default' | 'tech-savvy' | 'gamer'

export interface RankedObjective {
  id: string
  /** independent likelihood estimate, 0..1 */
  p: number
}

const has = (p: Persona, trait: string) => p.traits.includes(trait)

// ponytail: additive scores masquerading as probabilities — good enough for a
// demo estimator; a real one would be fit on outcome data
const SCORING: Record<string, (p: Persona) => number> = {
  purchase_accessories: (p) => 10 + (has(p, 'gamer') ? 60 : 0) + (has(p, 'technical') ? 10 : 0) + (p.intent === 'evaluate' ? 7 : 0),
  compare_specs: (p) => 15 + (p.intent === 'compare' ? 30 : 0) + (has(p, 'technical') || has(p, 'reader') ? 15 : 0),
  purchase_laptop: (p) => 25 + (p.intent === 'evaluate' ? 10 : 0) + (has(p, 'reader') ? 5 : 0) - (has(p, 'gamer') ? 10 : 0),
  contact_support: (p) => 5 + (p.painPoints.includes('search-loop') ? 10 : 0),
  check_order_status: () => 2,
}

export function estimateObjectives(persona: Persona): RankedObjective[] {
  return Object.entries(SCORING)
    .map(([id, score]) => ({ id, p: Math.min(95, Math.max(1, score(persona))) / 100 }))
    .sort((a, b) => b.p - a.p)
}

// expected page sequence per objective — the demo site's map, home → goal
const PATHS: Record<string, string[]> = {
  purchase_accessories: ['/index.html', '/products.html', '/accessories.html'],
  compare_specs: ['/index.html', '/products.html'],
  purchase_laptop: ['/index.html', '/products.html'],
  contact_support: ['/index.html'],
  check_order_status: ['/index.html'],
}

/** Remaining expected sequence after the current route, for the top objective. */
export function derivePath(objectives: RankedObjective[], currentRoute: string): string[] {
  const seq = PATHS[objectives[0]?.id ?? ''] ?? []
  const at = seq.indexOf(currentRoute)
  return at === -1 ? seq : seq.slice(at + 1)
}

export function nextRoute(objectives: RankedObjective[], currentRoute: string): string | null {
  return derivePath(objectives, currentRoute)[0] ?? null
}

/** Persona → design-system theme tier. Variants of ONE system, never free generation. */
export function themeFor(persona: Persona): Theme {
  if (has(persona, 'gamer')) return 'gamer'
  if (has(persona, 'technical') || has(persona, 'reader')) return 'tech-savvy'
  return 'default'
}

// Site trait vocabulary: which clicks mean what, in THIS store.
export const DEMO_QUANTIZE: QuantizeRules = {
  traitsOf(history) {
    const clicked = history.flatMap((s) => s.clicked)
    const traits: string[] = []
    if (clicked.some((id) => id.startsWith('gear-'))) traits.push('gamer')
    if (clicked.some((id) => id.includes('specs') || id.includes('comparison'))) traits.push('technical')
    return traits
  },
}
