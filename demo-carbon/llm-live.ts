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
    try {
      const ops = await proposeChainOps(persona, manifest, cfg)
      entry.returned = ops
      return ops
    } catch (e) {
      entry.error = String(e)
      throw e
    }
  }
}
