import { personaSimilarity } from './similarity.ts'
import type { Chain, ChainStore } from './types.ts'

// The chain cache is where the economics live: every hit is a page the LLM
// never sees. Keyed by (persona tuple, route, manifest hash) — change the
// page or the design system and the chain dies with it.

const PREFIX = 'ui-morph:chain:'

export function chainKey(personaKey: string, route: string, manifestHash: string): string {
  return `${PREFIX}${personaKey}:${route}:${manifestHash}`
}

/**
 * Similarity read-fallback: among cached chains for the SAME route+manifest,
 * the nearest persona above the threshold. Deterministic (score, then
 * lexicographic key). Requires store.list — stores without it return null.
 */
export async function nearestChain(
  store: ChainStore,
  personaKey: string,
  route: string,
  manifestHash: string,
  threshold: number,
): Promise<{ chain: Chain; key: string; score: number } | null> {
  if (!store.list || threshold >= 1) return null
  const suffix = `:${route}:${manifestHash}`
  const exact = chainKey(personaKey, route, manifestHash)
  let best: { key: string; score: number } | null = null
  for (const key of await store.list(PREFIX)) {
    if (!key.endsWith(suffix) || key === exact) continue
    const candidate = key.slice(PREFIX.length, -suffix.length)
    const score = personaSimilarity(personaKey, candidate)
    if (score < threshold) continue
    if (!best || score > best.score || (score === best.score && key < best.key)) best = { key, score }
  }
  if (!best) return null
  const chain = await store.get(best.key)
  return chain ? { chain, key: best.key, score: best.score } : null
}

/** Default store: localStorage. Client-only — chains never leave the browser. */
export function localStore(): ChainStore {
  return {
    async get(key) {
      const raw = localStorage.getItem(key)
      if (!raw) return null
      try {
        return JSON.parse(raw) as Chain
      } catch {
        localStorage.removeItem(key)
        return null
      }
    },
    async put(key, chain) {
      localStorage.setItem(key, JSON.stringify(chain))
    },
    async list(prefix) {
      return Object.keys(localStorage).filter((k) => k.startsWith(prefix))
    },
  }
}

/**
 * Optional server-backed store. Chains become collective knowledge: a visitor
 * similar to one already mapped gets the warm path on first visit. Endpoint
 * contract: GET /chains/:key → Chain|404, PUT /chains/:key ← Chain.
 */
export function remoteStore(baseUrl: string): ChainStore {
  return {
    async get(key) {
      const res = await fetch(`${baseUrl}/chains/${encodeURIComponent(key)}`)
      return res.ok ? ((await res.json()) as Chain) : null
    },
    async put(key, chain) {
      await fetch(`${baseUrl}/chains/${encodeURIComponent(key)}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(chain),
      })
    },
  }
}
