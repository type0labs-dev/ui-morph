import { test } from 'node:test'
import assert from 'node:assert/strict'
import { personaSimilarity } from '../src/similarity.ts'

// Deterministic persona-key similarity — calibrated against the real
// treadmill sessions from the 2026-07-10 live simulation. The early-session
// persona only GROWS (more pages → more traits/pain), so containment must
// score high while conflicting evidence scores low.

test('identical keys are 1', () => {
  assert.equal(personaSimilarity('defined|compare|scanner|ignored-cta', 'defined|compare|scanner|ignored-cta'), 1)
})

test('treadmill session E: grown persona still matches its younger self', () => {
  // compiled for the young persona, revisited by the grown one
  const young = 'narrow|browse|search-led+technical|-'
  const grown = 'defined|evaluate|scanner+search-led+technical|ignored-cta'
  assert.ok(personaSimilarity(young, grown) >= 0.7, `got ${personaSimilarity(young, grown)}`)
})

test('treadmill session B: pain accumulation alone barely moves the score', () => {
  const a = 'defined|compare|scanner|search-loop'
  const b = 'defined|compare|scanner|ignored-cta+search-loop'
  assert.ok(personaSimilarity(a, b) >= 0.9, `got ${personaSimilarity(a, b)}`)
})

test('conflicting personas do not cross-match (gamer vs gift buyer)', () => {
  const gamer = 'defined|browse|gamer+search-led+technical|-'
  const marta = 'defined|browse|color-white+comfort+gift-buyer+thin-focus|-'
  assert.ok(personaSimilarity(gamer, marta) < 0.5, `got ${personaSimilarity(gamer, marta)}`)
})

test('symmetric and bounded', () => {
  const a = 'generic|browse|-|-'
  const b = 'defined|compare|reader|search-loop'
  assert.equal(personaSimilarity(a, b), personaSimilarity(b, a))
  const s = personaSimilarity(a, b)
  assert.ok(s >= 0 && s <= 1)
})

test('empty-evidence personas of the same shape are identical', () => {
  assert.equal(personaSimilarity('generic|browse|-|-', 'generic|browse|-|-'), 1)
})
