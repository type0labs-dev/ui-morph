// Persona-key similarity — the read side of the "similarity matching" roadmap
// item. Deterministic and explainable on purpose: a rule, not a model.
//
// Shape of the problem (measured, 2026-07-10 live simulation): early-session
// personas only GROW — every page adds traits/pain and can bump tier/intent —
// so a chain keyed at compile time goes stale by the revisit ("the persona
// treadmill"). Containment must therefore score high (the younger persona's
// evidence fully inside the grown one), while CONFLICTING evidence (gamer vs
// gift-buyer) must score low.
//
// Per-axis:
//   traits/pain — overlap coefficient |A∩B| / min(|A|,|B|); an empty side
//                 counts as contained (1): absence of evidence is not
//                 conflicting evidence.
//   intent      — equal or not.
//   tier        — adjacency on generic < narrow < defined.
// Weights favor traits (they drive most ops).

const TIERS = ['generic', 'narrow', 'defined']

const setOf = (axis: string): Set<string> => new Set(axis === '-' || axis === '' ? [] : axis.split('+'))

function overlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 1
  let both = 0
  for (const x of a) if (b.has(x)) both++
  return both / Math.min(a.size, b.size)
}

/** Similarity in [0,1] between two persona keys (`tier|intent|traits|pain`). */
export function personaSimilarity(keyA: string, keyB: string): number {
  if (keyA === keyB) return 1
  const [tierA = '', intentA = '', traitsA = '-', painA = '-'] = keyA.split('|')
  const [tierB = '', intentB = '', traitsB = '-', painB = '-'] = keyB.split('|')

  const traits = overlap(setOf(traitsA), setOf(traitsB))
  const pain = overlap(setOf(painA), setOf(painB))
  const intent = intentA === intentB ? 1 : 0
  const tier = 1 - Math.abs(TIERS.indexOf(tierA) - TIERS.indexOf(tierB)) / 2

  return 0.55 * traits + 0.15 * pain + 0.15 * intent + 0.15 * tier
}
