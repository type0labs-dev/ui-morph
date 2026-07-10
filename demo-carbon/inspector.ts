import { quantizeExplained, type AuditEvent, type Morph } from '../src/index.ts'
import { DEMO_QUANTIZE, derivePath, estimateObjectivesExplained, explainSiteTraits, themeFor } from '../demo/salesman.ts'
import { whyFor } from './propose.ts'

// The inspector: the salesman's reasoning, narrated live. Everything shown is
// demo-side data (raw consented signals, deterministic rule traces, mock
// whys) plus the audit trail — the model itself still sees only persona +
// manifest, and nothing here feeds back into it.

interface InspectorCtx {
  morph: Morph
  route: string
  auditLog: AuditEvent[]
  coldPath: string
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

export function mountInspector(ctx: InspectorCtx): () => void {
  const el = document.createElement('aside')
  el.id = 'morph-inspector'
  document.body.appendChild(el)

  let collapsed = false
  const changedAt = new Map<string, number>() // persona field → last change time
  const prev = new Map<string, string>()

  const flash = (field: string, value: string): string => {
    if (prev.get(field) !== value) {
      if (prev.has(field)) changedAt.set(field, Date.now())
      prev.set(field, value)
    }
    return Date.now() - (changedAt.get(field) ?? 0) < 1600 ? ' changed' : ''
  }

  function render() {
    if (collapsed) {
      el.className = 'collapsed'
      el.innerHTML = `<button class="toggle" title="expand">◀</button><span class="rail">UI-MORPH · INSPECTOR</span>`
      el.querySelector('.toggle')!.addEventListener('click', () => {
        collapsed = false
        document.documentElement.style.setProperty('--inspector-width', '400px')
        render()
      })
      return
    }
    el.className = ''

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
    const open = new Set([...el.querySelectorAll('details[open]')].map((d) => d.getAttribute('data-key')))

    el.innerHTML = `
      <header><h4>UI-MORPH · INSPECTOR</h4><button class="toggle" title="collapse">▶</button></header>

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

      <section data-insp="decisions">
        <h5>5 · decisions <span class="dim">(this page · why each op)</span></h5>
        ${applied.map((e) => `<div class="op ok">✓ <code>${esc(opOf(e.detail))}</code><span class="why">${esc(whyFor(ctx.route, JSON.parse(opOf(e.detail))))}</span></div>`).join('')}
        ${rejected.map((e) => `<div class="op no">✗ <code>${esc(opOf(e.detail))}</code><span class="why">guard: ${esc(reasonOf(e.detail))} · intent: ${esc(whyFor(ctx.route, tryParse(opOf(e.detail))))}</span></div>`).join('')}
        ${applied.length + rejected.length === 0 ? '<div class="dim">no mutations on this page yet</div>' : ''}
      </section>

      <section data-insp="audit">
        <h5>6 · audit trail</h5>
        ${ctx.auditLog.slice(-8).map((e) => `<div class="log ${e.kind}">[${e.kind}] ${esc(e.detail)}</div>`).join('') || '<div class="dim">no events yet — opt in, browse, navigate</div>'}
      </section>`

    el.querySelector('.toggle')!.addEventListener('click', () => {
      collapsed = true
      document.documentElement.style.setProperty('--inspector-width', '36px')
      render()
    })
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
