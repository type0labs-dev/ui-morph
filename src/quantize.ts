import type { Intent, Persona, QuantizeRules, Signals } from './types.ts'

// Persona quantizer — deterministic rules, no LLM. Where a threshold does the
// job, a model call is waste (and non-reproducible). The output space is tiny
// on purpose: quantized personas are cache keys, and cache keys must collide
// for the warm path to exist at all.
//
// quantizeExplained() is the same derivation with its reasoning attached:
// every fired rule as a human-readable line. Auditability is a project value —
// explaining built-in derivation is the quantizer's job, not the site's.

export type { QuantizeRules } from './types.ts'

export interface QuantizeExplanation {
  persona: Persona
  /** the rules that fired, in plain words, in derivation order */
  because: string[]
}

function defaultIntent(history: Signals[]): Intent {
  const last = history[history.length - 1]
  if (!last) return 'browse'
  if (last.revisits >= 2) return 'compare'
  if (history.length >= 3) return 'evaluate'
  return 'browse'
}

export function quantizeExplained(history: Signals[], rules: QuantizeRules = {}): QuantizeExplanation {
  const because: string[] = []
  const traits = new Set<string>()
  const painPoints = new Set<string>()

  for (const t of rules.traitsOf?.(history) ?? []) {
    traits.add(t)
    because.push(`trait ${t}: site rule (traitsOf)`)
  }

  const pages = history.length
  const avgDwell = history.reduce((s, x) => s + x.dwellMs, 0) / Math.max(1, pages)
  const avgScroll = history.reduce((s, x) => s + x.scrollDepth, 0) / Math.max(1, pages)
  const clicks = history.reduce((s, x) => s + x.clicked.length, 0)
  const ignored = history.flatMap((x) => x.ignored)

  // reading behavior
  if (avgDwell > 45_000 && avgScroll > 0.7) {
    traits.add('reader')
    because.push(`trait reader: avg dwell ${Math.round(avgDwell / 1000)}s > 45s and avg scroll ${avgScroll.toFixed(2)} > 0.7`)
  }
  if (avgDwell < 10_000 && pages >= 3) {
    traits.add('scanner')
    because.push(`trait scanner: avg dwell ${Math.round(avgDwell / 1000)}s < 10s across ${pages} pages`)
  }
  // interaction behavior
  if (clicks / Math.max(1, pages) >= 2) {
    traits.add('explorer')
    because.push(`trait explorer: ${clicks} clicks over ${pages} page(s) ≥ 2/page`)
  }
  if (history[0] && /google|bing|duckduckgo/.test(history[0].referrer)) {
    traits.add('search-led')
    because.push(`trait search-led: first referrer is a search engine`)
  }
  // friction
  const ctaIgnores = ignored.filter((id) => id.includes('cta'))
  if (ctaIgnores.length >= 2) {
    painPoints.add('ignored-cta')
    because.push(`pain ignored-cta: ${ctaIgnores.length} CTAs seen ≥1s and never clicked`)
  }
  const revisits = history[history.length - 1]?.revisits ?? 0
  if (revisits >= 2) {
    painPoints.add('search-loop')
    because.push(`pain search-loop: current route revisited ${revisits}× this session`)
  }

  // tier reflects how much evidence we hold, not who the person "is"
  const tier = pages >= 4 || painPoints.size > 0 ? 'defined' : pages >= 2 ? 'narrow' : 'generic'
  because.push(
    tier === 'defined'
      ? `tier defined: ${pages >= 4 ? `${pages} pages of history` : 'pain points identified'}`
      : tier === 'narrow'
        ? `tier narrow: ${pages} pages of history`
        : `tier generic: ${pages} page(s) of evidence — no assumptions`,
  )

  const intent = (rules.intentOf ?? defaultIntent)(history)
  because.push(
    rules.intentOf
      ? `intent ${intent}: site rule (intentOf)`
      : intent === 'compare'
        ? `intent compare: current route revisited ${revisits}×`
        : intent === 'evaluate'
          ? `intent evaluate: ${pages} pages deep this session`
          : `intent browse: default for early sessions`,
  )

  return {
    persona: { tier, intent, traits: [...traits].sort(), painPoints: [...painPoints].sort() },
    because,
  }
}

export function quantize(history: Signals[], rules: QuantizeRules = {}): Persona {
  return quantizeExplained(history, rules).persona
}
