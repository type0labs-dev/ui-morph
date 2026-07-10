import type { Persona, QuantizeRules, Signals } from '../src/types.ts'

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
const GEAR = (id: string) => id.startsWith('gear-')
const SPECCY = (id: string) => id.includes('specs') || id.includes('comparison')

export const DEMO_QUANTIZE: QuantizeRules = {
  traitsOf(history) {
    const clicked = history.flatMap((s) => s.clicked)
    const traits: string[] = []
    if (clicked.some(GEAR)) traits.push('gamer')
    if (clicked.some(SPECCY)) traits.push('technical')
    return traits
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
  return because
}
