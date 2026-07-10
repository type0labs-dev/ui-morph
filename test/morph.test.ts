import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { Morph } from '../src/index.ts'
import { chainKey } from '../src/cache.ts'
import { manifestHash } from '../src/schema.ts'
import { personaKey, type AuditEvent, type Chain, type ChainStore, type PageManifest } from '../src/types.ts'

// Morph orchestration tests run without a DOM: node's test runner + a minimal
// Storage shim. Anything needing a real page (collectors, appliers) is covered
// by the e2e walkthrough instead.

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

function memoryStore(): ChainStore & { chains: Map<string, Chain> } {
  const chains = new Map<string, Chain>()
  return {
    chains,
    async get(key) {
      return chains.get(key) ?? null
    },
    async put(key, chain) {
      chains.set(key, chain)
    },
  }
}

const manifestB: PageManifest = {
  route: '/accessories.html',
  entries: [
    { id: 'nav', role: 'site navigation', protected: true },
    { id: 'theme', role: 'page token theme', variants: ['default', 'tech-savvy', 'gamer'] },
    { id: 'gear-grid', role: 'accessory cards' },
  ],
}

beforeEach(() => {
  globalThis.localStorage = storageShim()
  globalThis.sessionStorage = storageShim()
})

test('precompile compiles and caches a chain for another route, guard included', async () => {
  const store = memoryStore()
  const audit: AuditEvent[] = []
  const morph = new Morph({
    intents: ['browse'],
    store,
    propose: async () => [
      { op: 'hide', target: 'nav' }, // guard bait — must be rejected
      { op: 'swap-variant', target: 'theme', variant: 'gamer' },
    ],
    onAudit: (e) => audit.push(e),
  })
  morph.setConsent(true)

  await morph.precompile(manifestB)

  const key = chainKey(personaKey(morph.persona()), manifestB.route, manifestHash(manifestB))
  const chain = store.chains.get(key)
  assert.ok(chain, 'chain cached under the other route key')
  assert.deepEqual(chain.ops, [{ op: 'swap-variant', target: 'theme', variant: 'gamer' }])
  assert.ok(
    audit.some((e) => e.kind === 'chain-compiled' && e.detail.includes('/accessories.html')),
    'audit names the pre-adapted route',
  )
  assert.ok(
    audit.some((e) => e.kind === 'op-rejected' && e.detail.includes('protected')),
    'guard bait rejected on the precompile path too',
  )
})

test('precompile is inert without consent', async () => {
  const store = memoryStore()
  let calls = 0
  const morph = new Morph({
    intents: ['browse'],
    store,
    propose: async () => (calls++, []),
  })
  await morph.precompile(manifestB)
  assert.equal(calls, 0)
  assert.equal(store.chains.size, 0)
})

test('precompile does not recompile an already-cached chain, and says so', async () => {
  const store = memoryStore()
  const audit: AuditEvent[] = []
  let calls = 0
  const morph = new Morph({
    intents: ['browse'],
    store,
    propose: async () => (calls++, [{ op: 'show', target: 'gear-grid' }]),
    onAudit: (e) => audit.push(e),
  })
  morph.setConsent(true)

  await morph.precompile(manifestB)
  await morph.precompile(manifestB)

  assert.equal(calls, 1, 'second precompile is a cache hit, zero proposals')
  assert.equal(store.chains.size, 1)
  assert.ok(
    audit.some((e) => e.kind === 'chain-hit' && e.detail.includes('/accessories.html')),
    'cache hit is observable in the audit trail',
  )
})

test('personaLive equals persona when no page is being observed', () => {
  sessionStorage.setItem(
    'ui-morph:signals',
    JSON.stringify([
      { route: '/', referrer: '', device: 'desktop', language: 'en', scrollDepth: 0.5, dwellMs: 20_000, clicked: [], ignored: [], revisits: 0 },
    ]),
  )
  const morph = new Morph({ intents: ['browse'] })
  morph.setConsent(true)
  assert.equal(personaKey(morph.personaLive()), personaKey(morph.persona()))
})

test('MorphConfig.quantize rules reach persona() and personaLive()', () => {
  sessionStorage.setItem(
    'ui-morph:signals',
    JSON.stringify([
      { route: '/', referrer: '', device: 'desktop', language: 'en', scrollDepth: 0.5, dwellMs: 20_000, clicked: ['gear-headset'], ignored: [], revisits: 0 },
    ]),
  )
  const morph = new Morph({
    intents: ['browse'],
    quantize: { traitsOf: (h) => (h.some((s) => s.clicked.includes('gear-headset')) ? ['gamer'] : []) },
  })
  morph.setConsent(true)
  assert.ok(morph.persona().traits.includes('gamer'))
  assert.ok(morph.personaLive().traits.includes('gamer'))
})
