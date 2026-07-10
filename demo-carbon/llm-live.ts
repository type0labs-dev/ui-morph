import { proposeChainOps } from '../src/llm.ts'
import type { LlmConfig, PageManifest, Persona } from '../src/index.ts'

// Live cold path with the exchange captured for the inspector. The engine
// contract is untouched: this is cfg.propose returning the model's ops
// verbatim — the capture is a demo-side side channel, read-only, and the
// inspector renders it so the generation happens ON CAMERA:
// sent = quantized persona + manifest (nothing else), returned = raw ops.

export interface ColdPathExchange {
  at: number
  route: string
  model: string
  persona: Persona
  manifestEntries: number
  /** the model's parsed response (post fence-stripping), exactly what guard() receives */
  returned?: unknown
  error?: string
}

const exchanges: ColdPathExchange[] = []

export function coldPathExchanges(): ColdPathExchange[] {
  return exchanges
}

// ── interrupted-compile detection (C18d) ─────────────────────────────────────
// A fetch dies with its page. Calls mark themselves in sessionStorage and
// unmark on resolve — whatever is still marked when the NEXT page loads was
// killed by navigation, and the inspector says so instead of staying silent.

const INFLIGHT_KEY = 'nova:coldpath-inflight'

type InflightMap = Record<string, { model: string; at: number }>

function readInflight(): InflightMap {
  try {
    return JSON.parse(sessionStorage.getItem(INFLIGHT_KEY) ?? '{}') as InflightMap
  } catch {
    return {}
  }
}

// captured once at page load, then cleared: these died with the previous page
const interrupted = Object.entries(readInflight()).map(([route, v]) => ({ route, model: v.model }))
sessionStorage.removeItem(INFLIGHT_KEY)

export function interruptedCompiles(): { route: string; model: string }[] {
  return interrupted
}

function mark(route: string, model: string): void {
  const m = readInflight()
  m[route] = { model, at: Date.now() }
  sessionStorage.setItem(INFLIGHT_KEY, JSON.stringify(m))
}

function unmark(route: string): void {
  const m = readInflight()
  delete m[route]
  sessionStorage.setItem(INFLIGHT_KEY, JSON.stringify(m))
}

export function livePropose(cfg: LlmConfig) {
  return async (persona: Persona, manifest: PageManifest): Promise<unknown> => {
    const entry: ColdPathExchange = {
      at: Date.now(),
      route: manifest.route,
      model: cfg.model,
      persona,
      manifestEntries: manifest.entries.length,
    }
    exchanges.push(entry)
    mark(manifest.route, cfg.model)
    try {
      const ops = await proposeChainOps(persona, manifest, cfg)
      entry.returned = ops
      unmark(manifest.route) // success only — a navigation abort REJECTS during
      // teardown, and unmarking there would erase the very evidence the next
      // page needs to report the interruption (measured: marks died ~100ms
      // into navigation). Errors also leave the mark: the call was lost either way.
      return ops
    } catch (e) {
      entry.error = String(e)
      throw e
    }
  }
}
