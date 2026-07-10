import './styles.scss'
import '@carbon/web-components/es/components/ui-shell/index.js'
import '@carbon/web-components/es/components/button/index.js'
import '@carbon/web-components/es/components/tile/index.js'
import '@carbon/web-components/es/components/tag/index.js'
import '@carbon/web-components/es/components/structured-list/index.js'
import '@carbon/web-components/es/components/accordion/index.js'
import '@carbon/web-components/es/components/notification/index.js'

import { Morph, personaKey, type AuditEvent, type LlmConfig } from '../src/index.ts'
import { coldPathExchanges, livePropose } from './llm-live.ts'
import { DEMO_QUANTIZE, estimateObjectives, nextRoute } from '../demo/salesman.ts'
import { MANIFESTS } from './manifests.ts'
import { mockPropose } from './propose.ts'
import { mountInspector } from './inspector.ts'
import { ingestSearchFromUrl, mountSearchBox } from './search.ts'
import { mountSignIn } from './provided.ts'

// Demo 2 wiring: the same engine and manifests as MVP1, on a real design
// system (IBM Carbon), narrated by the inspector instead of the compact HUD.

// Real LLM config lives in localStorage ('ui-morph:demo:llm') — set it in the
// inspector's settings panel. Any OpenAI-compatible endpoint works.
const llmRaw = localStorage.getItem('ui-morph:demo:llm')
let llmCfg: LlmConfig | null = null
try {
  const parsed = llmRaw ? (JSON.parse(llmRaw) as LlmConfig) : null
  llmCfg = parsed?.endpoint && parsed.model ? parsed : null
} catch {
  llmCfg = null
}

const auditLog: AuditEvent[] = []
Object.assign(window, { __audit: auditLog }) // e2e walkthrough reads the trail here

let renderInspector: () => void = () => {}

const morph = new Morph({
  intents: ['browse', 'evaluate', 'compare'],
  // 7, not the engine's default 5: the denser 3.0 vocabulary makes six
  // legitimate ops common for a defined persona (see carbon-demo-spec)
  budget: 7,
  quantize: DEMO_QUANTIZE,
  // live: same engine path as cfg.llm, wrapped so the exchange lands in the
  // inspector — the model's ops pass through verbatim
  propose: llmCfg ? livePropose(llmCfg) : mockPropose,
  onAudit(e) {
    auditLog.push(e)
    renderInspector()
  },
})

const manifest = MANIFESTS[location.pathname] ?? MANIFESTS['/index.html']!
const route = manifest.route

// ── consent banner ──
function mountConsent() {
  if (morph.consented) return
  const el = document.createElement('div')
  el.id = 'morph-consent'
  el.innerHTML = `
    <p><strong>This demo adapts its UI to how you browse.</strong><br/>
    Opt in and it will watch scroll depth, dwell time and clicks — first-party only,
    stored in your browser, erased the moment you opt out. Decline and the site is
    a plain static page.</p>
    <div class="row"><button class="yes">ADAPT FOR ME</button><button class="no">STAY STATIC</button></div>`
  el.querySelector('.yes')!.addEventListener('click', () => {
    morph.setConsent(true)
    el.remove()
    void morph.start(manifest)
  })
  el.querySelector('.no')!.addEventListener('click', () => el.remove())
  document.body.appendChild(el)
}

// ── the salesman loop: predict the path, pre-adapt the next page ──
let lastPrediction = ''
function predictAndPreadapt() {
  if (!morph.consented) return
  const p = morph.personaLive()
  const next = nextRoute(estimateObjectives(p), route)
  if (!next || !MANIFESTS[next]) return
  const prediction = `${personaKey(p)}→${next}`
  if (prediction === lastPrediction) return
  lastPrediction = prediction
  void morph.precompile(MANIFESTS[next]!)
}

ingestSearchFromUrl() // ad-landing ?utm_term → site-owned first-party store
renderInspector = mountInspector({
  morph,
  route,
  auditLog,
  coldPath: llmCfg ? `${llmCfg.model} · live` : 'mock model (authored rules)',
  live: !!llmCfg,
  exchanges: coldPathExchanges,
})
mountSearchBox()
mountSignIn()
mountConsent()
if (morph.consented) void morph.start(manifest)

setInterval(() => {
  renderInspector() // signals/persona/objectives evolve live
  predictAndPreadapt()
}, 500)
