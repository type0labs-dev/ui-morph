import { quantizeExplained, type AuditEvent, type Morph } from '../src/index.ts'
import { DEMO_QUANTIZE, derivePath, estimateObjectivesExplained, explainSiteTraits, providedProfile, searchTerms, themeFor, unmappedSearchTerms } from '../demo/salesman.ts'
import { whyFor } from './propose.ts'
import { interruptedCompiles, type ColdPathExchange } from './llm-live.ts'

// The inspector: the salesman's reasoning, narrated live. Everything shown is
// demo-side data (raw consented signals, deterministic rule traces, cold-path
// exchanges, mock whys) plus the audit trail — the model itself still sees
// only persona + manifest, and nothing here feeds back into it.
//
// Structure: a static shell (header + settings form, built once so inputs
// survive) around a .live region re-rendered every tick.

interface InspectorCtx {
  morph: Morph
  route: string
  auditLog: AuditEvent[]
  coldPath: string
  live: boolean
  exchanges: () => ColdPathExchange[]
}

const LLM_KEY = 'ui-morph:demo:llm'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
const escAttr = (s: string) => esc(s).replace(/"/g, '&quot;')

const chainKeys = () => Object.keys(localStorage).filter((k) => k.startsWith('ui-morph:chain:'))

export function mountInspector(ctx: InspectorCtx): () => void {
  const el = document.createElement('aside')
  el.id = 'morph-inspector'
  document.body.appendChild(el)

  const changedAt = new Map<string, number>() // persona field → last change time
  const prev = new Map<string, string>()

  const flash = (field: string, value: string): string => {
    if (prev.get(field) !== value) {
      if (prev.has(field)) changedAt.set(field, Date.now())
      prev.set(field, value)
    }
    return Date.now() - (changedAt.get(field) ?? 0) < 1600 ? ' changed' : ''
  }

  // ── static shell ──
  let cfg: { endpoint?: string; model?: string; apiKey?: string } = {}
  try {
    cfg = JSON.parse(localStorage.getItem(LLM_KEY) ?? '{}') as typeof cfg
  } catch {
    /* ignore */
  }
  el.innerHTML = `
    <header><h4>UI-MORPH · INSPECTOR</h4><button class="toggle" title="collapse">▶</button></header>
    <span class="rail" hidden>UI-MORPH · INSPECTOR</span>
    <div class="live"></div>
    <section class="settings" data-insp="settings">
      <h5>settings · cold path</h5>
      <div class="frow"><label>endpoint</label><input name="endpoint" value="${escAttr(cfg.endpoint ?? 'https://openrouter.ai/api/v1/chat/completions')}" /></div>
      <div class="frow"><label>model</label><input name="model" value="${escAttr(cfg.model ?? 'deepseek/deepseek-chat')}" /></div>
      <div class="frow"><label>api key</label><input name="apiKey" type="password" value="${escAttr(cfg.apiKey ?? '')}" placeholder="sk-…" /></div>
      <div class="btns">
        <button class="use-live">use live model</button>
        <button class="use-mock">use mock</button>
        <button class="clear-chains">clear chains (<span class="chain-count">0</span>)</button>
      </div>
      <div class="dim">key lives in this browser's localStorage only, masked everywhere — sent to nothing but your endpoint. clear chains to watch the cold path generate again (the warm path hides it by design).</div>
    </section>`

  const liveEl = el.querySelector<HTMLElement>('.live')!
  const rail = el.querySelector<HTMLElement>('.rail')!

  el.querySelector('.toggle')!.addEventListener('click', () => {
    const collapsed = el.classList.toggle('collapsed')
    rail.hidden = !collapsed
    document.documentElement.style.setProperty('--inspector-width', collapsed ? '36px' : '400px')
  })

  const input = (name: string) => el.querySelector<HTMLInputElement>(`.settings input[name="${name}"]`)!.value.trim()
  el.querySelector('.use-live')!.addEventListener('click', () => {
    localStorage.setItem(LLM_KEY, JSON.stringify({ endpoint: input('endpoint'), model: input('model'), apiKey: input('apiKey') }))
    location.reload()
  })
  el.querySelector('.use-mock')!.addEventListener('click', () => {
    localStorage.removeItem(LLM_KEY)
    location.reload()
  })
  el.querySelector('.clear-chains')!.addEventListener('click', () => {
    chainKeys().forEach((k) => localStorage.removeItem(k))
    location.reload()
  })

  // ── live region ──
  function render() {
    el.querySelector('.chain-count')!.textContent = String(chainKeys().length)

    const consented = ctx.morph.consented
    const signals = consented ? ctx.morph.signalsLive() : []
    const current = signals[signals.length - 1]
    const { persona, because: coreBecause } = quantizeExplained(signals, DEMO_QUANTIZE)
    // site-vocabulary traits get their specific because; drop the generic core line
    const because = [...explainSiteTraits(signals), ...coreBecause.filter((b) => !b.includes('(traitsOf)'))]
    const objectives = estimateObjectivesExplained(persona)
    const path = derivePath(objectives, ctx.route)
    const next = path[0]
    const preadapted =
      next && ctx.auditLog.some((e) => (e.kind === 'chain-compiled' || e.kind === 'chain-hit') && e.detail.includes(next))

    const applied = ctx.auditLog.filter((e) => e.kind === 'op-applied')
    const rejected = ctx.auditLog.filter((e) => e.kind === 'op-rejected')
    const opOf = (detail: string): string => detail.match(/\{.*\}$/)?.[0] ?? detail
    const reasonOf = (detail: string): string => detail.replace(/:?\s*\{.*\}$/, '')

    // remember which <details> the user opened before we re-render
    const open = new Set([...liveEl.querySelectorAll('details[open]')].map((d) => d.getAttribute('data-key')))

    const last = ctx.exchanges()[ctx.exchanges().length - 1]

    liveEl.innerHTML = `
      <section data-insp="signals">
        <h5>1 · signals <span class="dim">(consented, first-party)</span></h5>
        ${
          !consented
            ? '<div class="dim">engine inert — no consent, no listeners, no storage</div>'
            : !current
              ? '<div class="dim">collecting…</div>'
              : `<div class="kv"><span>session</span><b>${signals.length} page(s)</b></div>
                 <div class="kv"><span>dwell</span><b>${Math.round(current.dwellMs / 1000)}s</b></div>
                 <div class="kv"><span>scroll</span><b>${Math.round(current.scrollDepth * 100)}%</b></div>
                 <div class="kv"><span>clicked</span><b>${current.clicked.map(esc).join(', ') || '—'}</b></div>
                 <div class="kv"><span>ignored ≥1s</span><b>${current.ignored.length} element(s)</b></div>`
        }
      </section>

      <section data-insp="provided">
        <h5>1b · search & provided <span class="dim">(site-owned, first-party)</span></h5>
        <div class="kv"><span>search terms</span><b>${esc(searchTerms()) || '—'}</b></div>
        ${(() => {
          const lost = unmappedSearchTerms()
          return lost.length
            ? `<div class="warn" data-insp="unmapped">unmapped — lost evidence: ${lost.map(esc).join(', ')} <span class="dim">(no site rule consumes these)</span></div>`
            : ''
        })()}
        ${(() => {
          const profile = providedProfile()
          return profile
            ? `<div class="kv"><span>PROVIDED adapter</span><b>${esc(profile.name ?? '?')} · ${esc(profile.ageRange ?? '?')} · prefs: ${esc((profile.prefs ?? []).join(', '))} · history: ${esc((profile.history ?? []).join(', '))}</b></div>
               <div class="dim">stage-3 adapter, simulated — explicit sign-in = adapter consent; core never sees it</div>`
            : `<div class="dim">not signed in — behavioral + search signals only</div>`
        })()}
      </section>

      <section data-insp="persona">
        <h5>2 · persona <span class="dim">(quantized — this is ALL the model ever sees)</span></h5>
        <pre class="json">{
  "tier": <span class="v${flash('tier', persona.tier)}">"${persona.tier}"</span>,
  "intent": <span class="v${flash('intent', persona.intent)}">"${persona.intent}"</span>,
  "traits": <span class="v${flash('traits', persona.traits.join())}">[${persona.traits.map((t) => `"${t}"`).join(', ')}]</span>,
  "painPoints": <span class="v${flash('pain', persona.painPoints.join())}">[${persona.painPoints.map((t) => `"${t}"`).join(', ')}]</span>
}</pre>
        <div class="because" data-insp="because">${because.map((b) => `<div>← ${esc(b)}</div>`).join('')}</div>
      </section>

      <section data-insp="objectives">
        <h5>3 · objectives <span class="dim">(estimated · theme ${themeFor(persona)})</span></h5>
        ${objectives
          .map((o, i) => {
            const pct = Math.round(o.p * 100)
            const parts = `<div class="parts">${o.parts.map((x) => `<div><span>${esc(x.label)}</span><b>${x.points > 0 ? '+' : ''}${x.points}</b></div>`).join('')}</div>`
            const row = `<span>${o.id}</span><b>${pct}%</b><span class="bar"><i style="width:${pct}%"></i></span>`
            // top objective: breakdown always visible — it's the story
            if (i === 0) return `<div class="obj-top"><div class="summary-row">${row}</div>${parts}</div>`
            return `<details data-key="obj-${o.id}" ${open.has(`obj-${o.id}`) ? 'open' : ''}>
              <summary>${row}</summary>${parts}
            </details>`
          })
          .join('')}
      </section>

      <section data-insp="path">
        <h5>4 · expected path → pre-adaptation</h5>
        <div class="path">${[ctx.route, ...path].map(esc).join(' → ')}${path.length ? '' : ' <span class="dim">(at goal)</span>'}</div>
        ${next ? `<div class="kv"><span>next page</span><b>${next} ${preadapted ? '· pre-adapted ✓' : '· compiling…'}</b></div>` : ''}
        <div class="kv"><span>chain key</span><b class="dim">${esc(`${persona.tier}|${persona.intent}|${persona.traits.join('+') || '-'}|${persona.painPoints.join('+') || '-'}`)}</b></div>
      </section>

      <section data-insp="coldpath">
        <h5>4b · cold path <span class="dim">(who proposes the ops)</span></h5>
        <div class="kv"><span>source</span><b>${esc(ctx.coldPath)}</b></div>
        ${interruptedCompiles()
          .map((i) => `<div class="warn">⚠ compile for ${esc(i.route)} (${esc(i.model)}) interrupted by navigation — retries when predicted again</div>`)
          .join('')}
        ${
          !ctx.live
            ? '<div class="dim">deterministic mock — authored rules, reproducible. switch to a live model in settings ↓</div>'
            : !last
              ? '<div class="dim">no model call yet this page — it fires when a missing chain is predicted</div>'
              : `<div class="xchg">
                   <div class="kv"><span>compiling for</span><b>${esc(last.route)} · ${esc(last.model)}</b></div>
                   <div class="xlabel">sent → <span class="dim">(persona + manifest, nothing else)</span></div>
                   <pre class="json">${esc(JSON.stringify(last.persona))} + manifest (${last.manifestEntries} entries)</pre>
                   <div class="xlabel">model returned →</div>
                   ${
                     last.error
                       ? `<div class="op no">✗ ${esc(last.error)}</div>`
                       : last.returned === undefined
                         ? '<div class="dim">thinking…</div>'
                         : `<pre class="json">${esc(JSON.stringify(last.returned, null, 1))}</pre>`
                   }
                   <div class="dim">↓ guard verdicts land in decisions / audit</div>
                 </div>`
        }
      </section>

      <section data-insp="decisions">
        <h5>5 · decisions <span class="dim">(this page · why each op)</span></h5>
        ${applied.map((e) => `<div class="op ok">✓ <code>${esc(opOf(e.detail))}</code><span class="why">${esc(whyFor(ctx.route, tryParse(opOf(e.detail))))}</span></div>`).join('')}
        ${rejected.map((e) => `<div class="op no">✗ <code>${esc(opOf(e.detail))}</code><span class="why">guard: ${esc(reasonOf(e.detail))} · intent: ${esc(whyFor(ctx.route, tryParse(opOf(e.detail))))}</span></div>`).join('')}
        ${applied.length + rejected.length === 0 ? '<div class="dim">no mutations on this page yet</div>' : ''}
      </section>

      <section data-insp="audit">
        <h5>6 · audit trail</h5>
        ${ctx.auditLog.slice(-8).map((e) => `<div class="log ${e.kind}">[${e.kind}] ${esc(e.detail)}</div>`).join('') || '<div class="dim">no events yet — opt in, browse, navigate</div>'}
      </section>`
  }

  render()
  return render
}

function tryParse(s: string): Record<string, unknown> {
  try {
    return JSON.parse(s) as Record<string, unknown>
  } catch {
    return {}
  }
}
