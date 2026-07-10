import { test } from 'node:test'
import assert from 'node:assert/strict'
import { estimateObjectives, estimateObjectivesExplained, explainSiteTraits, derivePath, nextRoute, predictSku, themeFor, unmappedSearchTerms, DEMO_QUANTIZE } from '../demo/salesman.ts'
import type { Persona, Signals } from '../src/types.ts'

// Site-side salesman logic: deterministic objective estimation, path
// derivation and theme mapping. This is demo vocabulary, deliberately NOT in
// core — the engine stays generic, the site declares its own language.

const gamer: Persona = {
  tier: 'defined',
  intent: 'evaluate',
  traits: ['gamer', 'search-led', 'technical'],
  painPoints: [],
}

const nobody: Persona = { tier: 'generic', intent: 'browse', traits: [], painPoints: [] }

const sig = (over: Partial<Signals>): Signals => ({
  route: '/',
  referrer: '',
  device: 'desktop',
  language: 'en',
  scrollDepth: 0.5,
  dwellMs: 20_000,
  clicked: [],
  ignored: [],
  revisits: 0,
  ...over,
})

test('gamer persona ranks purchase_accessories on top with high probability', () => {
  const ranked = estimateObjectives(gamer)
  assert.ok(ranked.length >= 3, 'at least 3 objectives ranked')
  assert.equal(ranked[0]!.id, 'purchase_accessories')
  assert.ok(ranked[0]!.p >= 0.8, `top probability high, got ${ranked[0]!.p}`)
  for (let i = 1; i < ranked.length; i++) assert.ok(ranked[i - 1]!.p >= ranked[i]!.p, 'sorted descending')
  for (const o of ranked) assert.ok(o.p > 0 && o.p <= 1)
})

test('objective estimation is deterministic', () => {
  assert.deepEqual(estimateObjectives(gamer), estimateObjectives(gamer))
})

test('a persona with no evidence does not get pushed toward accessories', () => {
  assert.notEqual(estimateObjectives(nobody)[0]!.id, 'purchase_accessories')
})

test('derivePath: expected remaining sequence from the current route', () => {
  const ranked = estimateObjectives(gamer)
  assert.equal(nextRoute(ranked, '/products.html', gamer), '/accessories.html')
  assert.equal(nextRoute(ranked, '/accessories.html', gamer), '/product.html?sku=gear-controller')
  assert.equal(nextRoute(ranked, '/done.html', gamer), null, 'path ends at the goal page')
})

test('themeFor maps persona to a design-system theme tier', () => {
  assert.equal(themeFor(gamer), 'gamer')
  assert.equal(themeFor({ ...nobody, traits: ['reader'] }), 'tech-savvy')
  assert.equal(themeFor({ ...nobody, traits: ['technical'] }), 'tech-savvy')
  assert.equal(themeFor(nobody), 'default')
})

test('DEMO_QUANTIZE.traitsOf: gear clicks read as gamer, spec clicks as technical', () => {
  const traits = DEMO_QUANTIZE.traitsOf!([sig({ clicked: ['gear-headset', 'comparison'] })])
  assert.ok(traits.includes('gamer'))
  assert.ok(traits.includes('technical'))
  assert.deepEqual(DEMO_QUANTIZE.traitsOf!([sig({})]), [])
})

test('estimateObjectivesExplained: probability decomposes into labeled parts', () => {
  const ranked = estimateObjectivesExplained(gamer)
  const top = ranked[0]!
  assert.equal(top.id, 'purchase_accessories')
  const sum = top.parts.reduce((s, x) => s + x.points, 0)
  assert.equal(Math.min(95, Math.max(1, sum)) / 100, top.p, 'parts sum to the displayed probability')
  assert.ok(top.parts.some((x) => x.label.includes('gamer') && x.points === 60))
  assert.ok(top.parts.some((x) => /base/.test(x.label)))
})

test('estimateObjectives stays a thin wrapper over the explained version', () => {
  assert.deepEqual(
    estimateObjectives(gamer),
    estimateObjectivesExplained(gamer).map(({ id, p }) => ({ id, p })),
  )
})

test('explainSiteTraits names the clicks behind each site trait', () => {
  const because = explainSiteTraits([sig({ clicked: ['gear-headset', 'comparison'] })])
  assert.ok(because.some((b) => b.includes('gamer') && b.includes('gear-headset')))
  assert.ok(because.some((b) => b.includes('technical') && b.includes('comparison')))
  assert.deepEqual(explainSiteTraits([sig({})]), [])
})

// ── act 2: Dona Marta — search terms, provided profile, gift objective ──

function storageShim(): Storage {
  const m = new Map<string, string>()
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, String(v)),
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(),
    key: (i: number) => [...m.keys()][i] ?? null,
    get length() {
      return m.size
    },
  } as Storage
}

const marta: Persona = {
  tier: 'narrow',
  intent: 'browse',
  traits: ['color-white', 'comfort', 'gift-buyer', 'thin-focus'],
  painPoints: [],
}

test('search terms become site traits, PT and EN', () => {
  globalThis.sessionStorage = storageShim()
  globalThis.localStorage = storageShim()
  sessionStorage.setItem('nova:search-terms', 'laptop fino branco')
  const traits = DEMO_QUANTIZE.traitsOf!([sig({})])
  assert.ok(traits.includes('thin-focus'))
  assert.ok(traits.includes('color-white'))
  sessionStorage.setItem('nova:search-terms', 'thin white laptop gift')
  const en = DEMO_QUANTIZE.traitsOf!([sig({})])
  assert.ok(en.includes('thin-focus') && en.includes('color-white') && en.includes('gift-buyer'))
})

test('PROVIDED profile becomes site traits, attributed to the adapter', () => {
  globalThis.sessionStorage = storageShim()
  globalThis.localStorage = storageShim()
  localStorage.setItem('nova:provided', JSON.stringify({ name: 'Marta', ageRange: '65+', prefs: ['large-text'], history: ['gifts'] }))
  const traits = DEMO_QUANTIZE.traitsOf!([sig({})])
  assert.ok(traits.includes('comfort'))
  assert.ok(traits.includes('gift-buyer'))
  const because = explainSiteTraits([sig({})])
  assert.ok(because.some((b) => b.includes('comfort') && b.includes('PROVIDED')))
})

test('explainSiteTraits names the search that fired the trait', () => {
  globalThis.sessionStorage = storageShim()
  globalThis.localStorage = storageShim()
  sessionStorage.setItem('nova:search-terms', 'laptop fino branco')
  const because = explainSiteTraits([sig({})])
  assert.ok(because.some((b) => b.includes('thin-focus') && b.includes('laptop fino branco')))
})

test('gift persona ranks buy_gift_laptop on top, decomposed', () => {
  const ranked = estimateObjectivesExplained(marta)
  assert.equal(ranked[0]!.id, 'buy_gift_laptop')
  assert.ok(ranked[0]!.p >= 0.75, `got ${ranked[0]!.p}`)
  assert.ok(ranked[0]!.parts.some((x) => x.label.includes('gift')))
})

test('gift path leads to the predicted detail page and on through the funnel', () => {
  const ranked = estimateObjectives(marta)
  assert.equal(nextRoute(ranked, '/products.html', marta), '/product.html?sku=nova-13-air')
  assert.deepEqual(derivePath(ranked, '/products.html', marta).slice(1), ['/cart.html', '/checkout.html', '/payment.html', '/done.html'])
})

test('themeFor: comfort below gamer, above tech-savvy', () => {
  assert.equal(themeFor(marta), 'comfort')
  assert.equal(themeFor({ ...marta, traits: [...marta.traits, 'gamer'] }), 'gamer')
  assert.equal(themeFor({ ...marta, traits: ['comfort', 'technical'] }), 'comfort')
})

// ── C18c: price vocabulary + unmapped terms visible ──

test('price search terms become price-aware, PT and EN', () => {
  globalThis.sessionStorage = storageShim()
  globalThis.localStorage = storageShim()
  sessionStorage.setItem('nova:search-terms', 'notebook barato promoção')
  assert.ok(DEMO_QUANTIZE.traitsOf!([sig({})]).includes('price-aware'))
  assert.ok(explainSiteTraits([sig({})]).some((b) => b.includes('price-aware') && b.includes('barato')))
  sessionStorage.setItem('nova:search-terms', 'cheap laptop deal')
  assert.ok(DEMO_QUANTIZE.traitsOf!([sig({})]).includes('price-aware'))
})

test('deal hunter: hunt_deals tops the ranking and paths to the catalog', () => {
  const hunter: Persona = { tier: 'narrow', intent: 'browse', traits: ['price-aware', 'search-led'], painPoints: [] }
  const ranked = estimateObjectivesExplained(hunter)
  assert.equal(ranked[0]!.id, 'hunt_deals')
  assert.ok(ranked[0]!.parts.some((x) => x.label.includes('price')))
  assert.equal(nextRoute(estimateObjectives(hunter), '/index.html'), '/products.html')
})

test('unmappedSearchTerms names the tokens no rule consumed', () => {
  globalThis.sessionStorage = storageShim()
  globalThis.localStorage = storageShim()
  sessionStorage.setItem('nova:search-terms', 'notebook barato promoção')
  assert.deepEqual(unmappedSearchTerms(), ['notebook'])
  sessionStorage.setItem('nova:search-terms', 'laptop fino branco')
  assert.deepEqual(unmappedSearchTerms(), ['laptop'])
  sessionStorage.setItem('nova:search-terms', '')
  assert.deepEqual(unmappedSearchTerms(), [])
})

// ── C19c: funnel vocabulary — cart-holder, complete_purchase, predictSku ──

test('a non-empty cart becomes the cart-holder trait, explained', () => {
  globalThis.sessionStorage = storageShim()
  globalThis.localStorage = storageShim()
  localStorage.setItem('nova:cart', JSON.stringify({ 'gear-hub': 1, 'nova-15': 1 }))
  assert.ok(DEMO_QUANTIZE.traitsOf!([sig({})]).includes('cart-holder'))
  assert.ok(explainSiteTraits([sig({})]).some((b) => b.includes('cart-holder') && b.includes('2')))
})

test('cart-holder: complete_purchase tops and the path runs the funnel', () => {
  const holder: Persona = { tier: 'narrow', intent: 'browse', traits: ['cart-holder'], painPoints: [] }
  const ranked = estimateObjectives(holder)
  assert.equal(ranked[0]!.id, 'complete_purchase')
  // even for the strongest browsing persona, a full cart makes finishing the job the top objective
  const giftWithCart: Persona = { ...marta, traits: [...marta.traits, 'cart-holder'] }
  assert.equal(estimateObjectives(giftWithCart)[0]!.id, 'complete_purchase')
  assert.deepEqual(derivePath(ranked, '/cart.html', holder), ['/checkout.html', '/payment.html', '/done.html'])
})

test('predictSku follows persona affinity, deterministically', () => {
  assert.equal(predictSku(marta), 'nova-13-air')
  assert.equal(predictSku({ ...marta, traits: ['gamer'] }), 'gear-controller')
  assert.equal(predictSku({ ...marta, traits: ['technical'] }), 'nova-15-pro')
  assert.equal(predictSku({ ...marta, traits: ['price-aware'] }), 'nova-15')
  assert.equal(predictSku({ ...marta, traits: [] }), 'nova-15')
})

test('parameterized paths: the detail step carries the predicted sku and matches by pathname', () => {
  const g: Persona = { tier: 'defined', intent: 'evaluate', traits: ['gamer', 'technical'], painPoints: [] }
  const ranked = estimateObjectives(g) // top: purchase_accessories
  const fromAccessories = derivePath(ranked, '/accessories.html', g)
  assert.equal(fromAccessories[0], '/product.html?sku=gear-controller')
  assert.equal(fromAccessories[1], '/cart.html')
  const fromDetail = derivePath(ranked, '/product.html?sku=gear-controller', g)
  assert.deepEqual(fromDetail.slice(0, 2), ['/cart.html', '/checkout.html'])
})
