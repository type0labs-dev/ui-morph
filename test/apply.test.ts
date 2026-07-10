import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyOps } from '../src/apply.ts'

// applyOps against a ~30-line DOM stub covering exactly what the applier
// touches: attribute lookup, direct children, hidden. Real-browser behavior
// (styles, layout) is the e2e walkthrough's job.

interface StubEl {
  attrs: Record<string, string>
  hidden: boolean
  children: StubEl[]
  parentElement: StubEl | null
  getAttribute(n: string): string | null
  setAttribute(n: string, v: string): void
  hasAttribute(n: string): boolean
}

function el(attrs: Record<string, string>, children: StubEl[] = []): StubEl {
  const node: StubEl = {
    attrs,
    hidden: false,
    children,
    parentElement: null,
    getAttribute: (n) => node.attrs[n] ?? null,
    setAttribute: (n, v) => void (node.attrs[n] = v),
    hasAttribute: (n) => n in node.attrs,
  }
  children.forEach((c) => (c.parentElement = node))
  return node
}

function doc(...roots: StubEl[]): Document {
  const all = (nodes: StubEl[]): StubEl[] => nodes.flatMap((n) => [n, ...all(n.children)])
  return {
    querySelector(sel: string) {
      const id = /\[data-morph="(.+)"\]/.exec(sel)?.[1]
      return all(roots).find((e) => e.attrs['data-morph'] === id) ?? null
    },
  } as unknown as Document
}

globalThis.CSS ??= { escape: (s: string) => s } as typeof CSS

test('swap-variant toggles direct-child variants', () => {
  const visual = el({ 'data-morph-variant': 'visual' })
  const technical = el({ 'data-morph-variant': 'technical' })
  technical.hidden = true
  const hero = el({ 'data-morph': 'hero' }, [visual, technical])

  const applied = applyOps([{ op: 'swap-variant', target: 'hero', variant: 'technical' }], doc(hero))

  assert.equal(applied.length, 1)
  assert.equal(visual.hidden, true)
  assert.equal(technical.hidden, false)
})

test('swap-variant without child variants sets the active-variant attribute (token themes)', () => {
  // <body data-morph="theme"> whose children are components — one of them has
  // its OWN variants. Those must not be touched; body gets the attribute.
  const heroVisual = el({ 'data-morph-variant': 'visual' })
  const hero = el({ 'data-morph': 'hero' }, [heroVisual])
  const body = el({ 'data-morph': 'theme' }, [hero])

  const applied = applyOps([{ op: 'swap-variant', target: 'theme', variant: 'gamer' }], doc(body))

  assert.equal(applied.length, 1)
  assert.equal(body.attrs['data-morph-variant-active'], 'gamer')
  assert.equal(heroVisual.hidden, false, 'nested component variants untouched')
})

test('swap-variant with child variants but unknown name applies nothing', () => {
  const visual = el({ 'data-morph-variant': 'visual' })
  const hero = el({ 'data-morph': 'hero' }, [visual])

  const applied = applyOps([{ op: 'swap-variant', target: 'hero', variant: 'nope' }], doc(hero))

  assert.equal(applied.length, 0)
  assert.equal(visual.hidden, false)
})
