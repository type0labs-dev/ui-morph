import { Morph, personaKey, type AuditEvent, type PageManifest, type Persona } from '../src/index.ts'
import { DEMO_QUANTIZE, derivePath, estimateObjectives, nextRoute, themeFor } from './salesman.ts'
import { MANIFESTS } from './manifests.ts'

// Demo wiring: three-page store + consent banner + live HUD.
// Cold path: real LLM if you point it at one (see README), else a mock model
// that also emits one FORBIDDEN op ("hide nav") so you can watch the guard
// reject it in the audit log — the seatbelt, on camera.

// Mock cold path: deterministic, persona-aware, and deliberately tries one
// protected op so the guard has something to catch.
async function mockPropose(persona: Persona, manifest: PageManifest): Promise<unknown> {
  await new Promise((r) => setTimeout(r, 300)) // pretend to think
  const has = (id: string) => manifest.entries.some((e) => e.id === id)
  const ops: unknown[] = [{ op: 'hide', target: 'nav' }] // ← guard bait

  const theme = themeFor(persona)
  if (theme !== 'default') ops.push({ op: 'swap-variant', target: 'theme', variant: theme })

  const technical = persona.traits.includes('technical') || persona.traits.includes('reader') || persona.intent === 'compare'
  if (technical) {
    ops.push({ op: 'swap-variant', target: 'hero', variant: 'technical' })
    if (has('comparison')) ops.push({ op: 'show', target: 'comparison' })
    if (has('compat-table')) ops.push({ op: 'show', target: 'compat-table' })
    if (has('specs-teaser')) ops.push({ op: 'emphasize', target: 'specs-teaser', level: 'strong' })
  }
  if (persona.traits.includes('gamer') && has('gear-grid')) ops.push({ op: 'emphasize', target: 'gear-grid', level: 'strong' })
  if (persona.painPoints.includes('ignored-cta') && has('promo-banner')) ops.push({ op: 'hide', target: 'promo-banner' })
  return ops
}

// Real LLM config via localStorage (see README):
//   localStorage.setItem('ui-morph:demo:llm', JSON.stringify({ endpoint: 'http://localhost:11434/v1/chat/completions', model: 'llama3.1' }))
const llmRaw = localStorage.getItem('ui-morph:demo:llm')

const auditLog: AuditEvent[] = []
Object.assign(window, { __audit: auditLog }) // e2e walkthrough reads the trail here
const morph = new Morph({
  intents: ['browse', 'evaluate', 'compare'],
  budget: 5,
  quantize: DEMO_QUANTIZE,
  ...(llmRaw ? { llm: JSON.parse(llmRaw) } : { propose: mockPropose }),
  onAudit(e) {
    auditLog.push(e)
    renderHud()
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
// Re-runs whenever the live persona or the predicted route changes; precompile
// itself dedupes against the chain cache, so ticks are cheap. Nothing on THIS
// page mutates — the compiled chain applies when the next route loads.
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

// ── HUD ──
function mountHud() {
  const el = document.createElement('aside')
  el.id = 'morph-hud'
  document.body.appendChild(el)
  renderHud()
}

function renderHud() {
  const el = document.getElementById('morph-hud')
  if (!el) return
  const p = morph.consented ? morph.personaLive() : morph.persona()
  const objectives = estimateObjectives(p)
  const path = derivePath(objectives, route)
  const next = path[0]
  const preadapted =
    next && auditLog.some((e) => (e.kind === 'chain-compiled' || e.kind === 'chain-hit') && e.detail.includes(next))
  el.innerHTML = `
    <h4>UI-MORPH · LIVE</h4>
    <div class="block">
      <div><span class="k">consent</span> <span class="v">${morph.consented ? 'granted' : '—'}</span></div>
      <div><span class="k">tier</span> <span class="v">${p.tier}</span></div>
      <div><span class="k">intent</span> <span class="v">${p.intent}</span></div>
      <div><span class="k">traits</span> <span class="v">${p.traits.join(', ') || '—'}</span></div>
      <div><span class="k">pain</span> <span class="v">${p.painPoints.join(', ') || '—'}</span></div>
      <div><span class="k">theme</span> <span class="v">${themeFor(p)}</span></div>
      <div><span class="k">key</span> <span class="v">${personaKey(p)}</span></div>
      <div><span class="k">cold path</span> <span class="v">${llmRaw ? 'real LLM' : 'mock model'}</span></div>
    </div>
    <div class="block" data-hud="objectives">
      <div class="k">objectives (estimated)</div>
      ${objectives
        .map(
          (o) => `<div class="obj"><span>${o.id}</span><span class="v">${Math.round(o.p * 100)}%</span>
            <span class="bar"><i style="width:${Math.round(o.p * 100)}%"></i></span></div>`,
        )
        .join('')}
    </div>
    <div class="block" data-hud="path">
      <div class="k">expected path</div>
      <div class="path">${path.length ? [route, ...path].join(' → ') : `${route} (at goal)`}</div>
      <div><span class="k">next page</span> <span class="v">${next ? `${next} ${preadapted ? '· pre-adapted ✓' : '· compiling…'}` : '—'}</span></div>
    </div>
    <div class="block">
      ${auditLog.slice(-14).map((e) => `<span class="log ${e.kind}">[${e.kind}] ${e.detail}</span>`).join('')}
      ${auditLog.length === 0 ? '<span class="log">no events yet — opt in, browse, navigate</span>' : ''}
    </div>`
}

mountHud()
mountConsent()
if (morph.consented) void morph.start(manifest)
setInterval(() => {
  renderHud() // persona evolves live with dwell/scroll/clicks
  predictAndPreadapt()
}, 2000)
