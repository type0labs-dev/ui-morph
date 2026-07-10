#!/usr/bin/env node
// Persona laboratory (C20b): drives N seed-deterministic sessions through the
// full NOVA funnel and writes one session-log JSON per session plus a
// summary.json — the dataset for studying what changes, when, and why.
//
//   npm run sim                 # 200 mock sessions, seed 42
//   npm run sim -- --n 50 --seed 7
//   npm run sim -- --live --n 12   # real model (needs OPENROUTER_API_KEY in .env)
//
// Requires the carbon demo on :5198 (starts one if missing).

import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

// ── args / env ───────────────────────────────────────────────────────────────
const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? dflt : process.argv[i + 1]
}
const LIVE = process.argv.includes('--live')
const N = Number(arg('n', LIVE ? 12 : 200))
const SEED = Number(arg('seed', 42))
const BASE = arg('base', 'http://localhost:5198')
const KEY = (() => {
  try {
    return fs.readFileSync('.env', 'utf8').match(/OPENROUTER_API_KEY=(.+)/)?.[1]?.trim()
  } catch {
    return undefined
  }
})()
if (LIVE && !KEY) {
  console.error('--live needs OPENROUTER_API_KEY in .env')
  process.exit(1)
}
const LLM_CFG = { endpoint: 'https://openrouter.ai/api/v1/chat/completions', model: 'deepseek/deepseek-chat', apiKey: KEY }

// ── deterministic PRNG ───────────────────────────────────────────────────────
function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length)]
const weighted = (rnd, pairs) => {
  const total = pairs.reduce((s, [, w]) => s + w, 0)
  let x = rnd() * total
  for (const [v, w] of pairs) {
    x -= w
    if (x <= 0) return v
  }
  return pairs[pairs.length - 1][0]
}

// ── archetype space ──────────────────────────────────────────────────────────
const TERMS = [
  'laptop fino branco',
  'notebook barato promoção',
  'thin white laptop gift',
  'cheap laptop deal',
  'laptop para faculdade',
  'best laptop 2026',
  'presente notebook fino',
  'gamer controller headset',
  'ultrabook slim',
  'notebook tela grande',
]
const CLICK_PROFILES = ['specs', 'gear', 'deals', 'none', 'mixed']
const DWELLS = { scanner: 1700, normal: 4200, reader: 52000 }
const DETAIL_BY_PROFILE = { specs: 'nova-15-pro', gear: 'gear-controller', deals: 'nova-15', none: 'nova-13-air', mixed: 'nova-15' }

function genSession(i) {
  const rnd = mulberry32(SEED * 1000 + i)
  return {
    i,
    entry: weighted(rnd, [['ad-term', 4], ['organic', 4], ['direct', 2]]),
    term: pick(rnd, TERMS),
    clicks: pick(rnd, CLICK_PROFILES),
    dwell: weighted(rnd, [['scanner', 3], ['normal', 5], ['reader', 2]]),
    funnel: weighted(rnd, [['browse', 3], ['cart-abandon', 2], ['checkout-abandon', 2], ['purchase', 3]]),
    provided: rnd() < 0.1,
    revisit: rnd() < 0.3,
  }
}

// ── page driving ─────────────────────────────────────────────────────────────
async function tick(page, dwellMs) {
  await page.waitForFunction(() => '__audit' in window)
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
  await page.clock.fastForward(1200)
  await page.clock.fastForward(Math.max(200, dwellMs - 1200))
  // live mode: the fake clock compresses wall time to ~0, but a real model
  // needs real seconds — and a real visitor spends them. Without this settle
  // every live compile dies in flight and the run measures nothing (observed:
  // 58/58 misses, 0 ops). Cap at 10s: slower calls are honestly lost.
  if (LIVE)
    await page
      .waitForFunction(() => (window.__coldpath ?? []).every((x) => x.returned !== undefined || x.error), undefined, {
        timeout: 10000,
        polling: 400,
      })
      .catch(() => {})
}
const navLink = (page, name) => page.getByRole('navigation').getByRole('link', { name, exact: true })

async function runSession(browser, spec) {
  const ctx = await browser.newContext()
  if (LIVE) await ctx.addInitScript((cfg) => localStorage.setItem('ui-morph:demo:llm', JSON.stringify(cfg)), LLM_CFG)
  const page = await ctx.newPage()
  page.setDefaultTimeout(20000)
  await page.clock.install()
  const dwell = DWELLS[spec.dwell]
  const t0 = Date.now()
  let crash = null

  try {
    // entry
    const landing =
      spec.entry === 'ad-term'
        ? `${BASE}/index.html?utm_term=${encodeURIComponent(spec.term)}`
        : `${BASE}/index.html`
    await page.goto(landing, spec.entry === 'direct' ? {} : { referer: 'https://google.com/' })
    await page.locator('#morph-consent .yes').click()
    if (spec.provided) await page.locator('#nova-signin button').click()
    if (spec.clicks === 'specs' || spec.clicks === 'mixed') await page.locator('[data-morph="specs-teaser"] h2').click()
    if (spec.clicks === 'deals') await page.locator('[data-morph="deals-strip"] h2').click()
    if (spec.dwell === 'reader') await page.mouse.wheel(0, 4000)
    await tick(page, dwell)

    // listing
    await navLink(page, 'Laptops').click()
    if (spec.clicks === 'gear' || spec.clicks === 'mixed') await page.locator('[data-morph="gear-teaser"] h2').click()
    if (spec.clicks === 'deals') await page.locator('[data-morph="deals-strip"] h2').click()
    await tick(page, dwell)
    if (spec.revisit) {
      await navLink(page, 'Home').click()
      await tick(page, dwell)
      await navLink(page, 'Laptops').click()
      await tick(page, dwell)
    }
    if (spec.funnel !== 'browse') {
      // detail → cart → steps, per target depth
      await page.goto(`${BASE}/product.html?sku=${DETAIL_BY_PROFILE[spec.clicks]}`)
      await tick(page, dwell)
      await page.locator('[data-morph="cta-buy"]').click() // add to cart → /cart.html
      await tick(page, dwell)
      if (spec.funnel !== 'cart-abandon') {
        await page.locator('[data-morph="cta-checkout"]').click()
        await tick(page, dwell)
        if (spec.funnel !== 'checkout-abandon') {
          await page.locator('[data-morph="cta-continue"]').click()
          await tick(page, dwell)
          await page.locator('[data-morph="cta-pay"]').click()
          await page.waitForFunction(() => '__audit' in window)
          await tick(page, dwell)
        }
      }
    }
  } catch (e) {
    crash = String(e).slice(0, 300)
  }

  let log = { id: `crash-${spec.i}`, events: [] }
  try {
    log = await page.evaluate(() => window.__sessionLog())
  } catch {
    /* page dead */
  }
  await ctx.close()
  return { spec, wallMs: Date.now() - t0, crash, log }
}

// ── aggregation ──────────────────────────────────────────────────────────────
function summarize(results) {
  const outcomes = {}
  const lookups = { exact: 0, similar: 0, miss: 0 }
  const opsByRoute = {}
  const unmapped = new Set()
  const latencies = []
  let opsTotal = 0
  let crashes = 0

  for (const r of results) {
    if (r.crash) crashes++
    const kinds = new Set(r.log.events.map((e) => e.kind))
    const outcome = kinds.has('purchase')
      ? 'purchase'
      : r.log.events.some((e) => e.kind === 'checkout_step' && e.data.step !== 'cart')
        ? 'checkout-abandon'
        : kinds.has('add_to_cart')
          ? 'cart-abandon'
          : 'browse'
    outcomes[outcome] = (outcomes[outcome] ?? 0) + 1
    for (const e of r.log.events) {
      if (e.kind === 'page-enter') {
        const l = String(e.data.lookup)
        lookups[l.startsWith('similar') ? 'similar' : l === 'exact' ? 'exact' : 'miss']++
      }
      if (e.kind === 'audit:op-applied') {
        opsTotal++
        const route = e.route.split('?')[0]
        opsByRoute[route] = (opsByRoute[route] ?? 0) + 1
      }
      if (e.kind === 'exchange' && typeof e.data.ms === 'number') latencies.push(e.data.ms)
    }
    // unmapped terms: recompute from the term (same rules as the site)
    const RULES = [/fino|slim|thin/i, /branco|white/i, /presente|gift/i, /barato|cheap|budget|promo|deal|desconto|oferta/i]
    for (const tok of (r.spec.entry === 'ad-term' ? r.spec.term : '').toLowerCase().split(/\s+/).filter(Boolean))
      if (!RULES.some((re) => re.test(tok))) unmapped.add(tok)
  }

  latencies.sort((a, b) => a - b)
  const pct = (p) => latencies[Math.floor((latencies.length - 1) * p)] ?? null
  return {
    sessions: results.length,
    crashes,
    outcomes,
    lookups,
    opsTotal,
    opsByRoute,
    unmappedTerms: [...unmapped].sort(),
    exchangeLatencyMs: latencies.length ? { p50: pct(0.5), p90: pct(0.9), max: latencies[latencies.length - 1] } : null,
  }
}

// ── main ─────────────────────────────────────────────────────────────────────
const up = await fetch(`${BASE}/index.html`).then((r) => r.ok).catch(() => false)
let server = null
if (!up) {
  console.log('starting demo server…')
  server = spawn('npm', ['run', 'demo:carbon', '--', '--port', '5198', '--strictPort'], { stdio: 'ignore' })
  await new Promise((r) => setTimeout(r, 4000))
}

const runId = `run-${LIVE ? 'live' : 'mock'}-seed${SEED}-n${N}`
const outDir = path.join('sim-results', runId)
fs.mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch()
const specs = Array.from({ length: N }, (_, i) => genSession(i))
const results = []
const POOL = LIVE ? 1 : 6
let next = 0
async function worker() {
  while (next < specs.length) {
    const spec = specs[next++]
    const r = await runSession(browser, spec)
    results.push(r)
    fs.writeFileSync(path.join(outDir, `session-${String(spec.i).padStart(3, '0')}.json`), JSON.stringify(r, null, 1))
    if (results.length % 20 === 0 || LIVE) console.log(`${results.length}/${N} done`)
  }
}
await Promise.all(Array.from({ length: POOL }, worker))
await browser.close()
if (server) server.kill()

const summary = summarize(results)
fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 1))
console.log(`\n${outDir}/summary.json:`)
console.log(JSON.stringify(summary, null, 1))
